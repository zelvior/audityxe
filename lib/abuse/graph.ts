import { adminAuth, adminDb } from "../firebase/admin";
import { isAdminEmail } from "../admin-email";
import { hashIp, ipSubject, isDeviceId } from "./core";
import {
  BanDoc,
  BanKind,
  DeviceDoc,
  IpDoc,
  UidDoc,
  clearStrikes,
  col,
  getActiveBans,
  getStrike,
  listBans,
  logEvent,
  putBan,
  removeBan,
} from "./store";
import { computeRisk, RiskResult } from "./risk";

export interface GraphNode {
  id: string;
  type: "uid" | "device" | "ip" | "fp";
  label: string;
  sub?: string;
  seed?: boolean;
  banned?: boolean;
  admin?: boolean;
  risk?: string;
}
export interface GraphEdge {
  from: string;
  to: string;
}
export interface GraphResult {
  seed: { kind: "uid" | "device" | "ip"; key: string } | null;
  nodes: GraphNode[];
  edges: GraphEdge[];
  risk: RiskResult | null;
  strikePoints: number;
  bans: BanDoc[];
  truncated: boolean;
}

const MAX_NODES = 60;

async function resolveSeed(q: string): Promise<{ kind: "uid" | "device" | "ip"; key: string } | null> {
  const v = q.trim();
  if (!v) return null;
  if (v.includes("@")) {
    const u = await adminAuth().getUserByEmail(v).catch(() => null);
    return u ? { kind: "uid", key: u.uid } : null;
  }
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(v) || (v.includes(":") && /^[0-9a-f:.]+$/i.test(v))) {
    return { kind: "ip", key: hashIp(ipSubject(v.toLowerCase())) };
  }
  if (isDeviceId(v)) return { kind: "device", key: v };
  if (/^[a-f0-9]{40}$/.test(v)) return { kind: "ip", key: v };
  return { kind: "uid", key: v };
}

export async function buildGraph(query: string): Promise<GraphResult> {
  const seed = await resolveSeed(query);
  const empty: GraphResult = { seed, nodes: [], edges: [], risk: null, strikePoints: 0, bans: [], truncated: false };
  if (!seed) return empty;

  const nodes = new Map<string, GraphNode>();
  const edges: GraphEdge[] = [];
  const edgeSet = new Set<string>();
  let truncated = false;
  const addEdge = (a: string, b: string) => {
    const k = a < b ? `${a}|${b}` : `${b}|${a}`;
    if (!edgeSet.has(k)) {
      edgeSet.add(k);
      edges.push({ from: a, to: b });
    }
  };
  const add = (n: GraphNode): boolean => {
    if (nodes.has(n.id)) return true;
    if (nodes.size >= MAX_NODES) {
      truncated = true;
      return false;
    }
    nodes.set(n.id, n);
    return true;
  };

  const seedId = `${seed.kind}:${seed.key}`;
  add({ id: seedId, type: seed.kind, label: seed.key, seed: true });

  // BFS, 2 hops
  let frontier = [seedId];
  const expanded = new Set<string>();
  for (let depth = 0; depth < 2; depth++) {
    const next: string[] = [];
    for (const id of frontier) {
      if (expanded.has(id)) continue;
      expanded.add(id);
      const [type, key] = [id.slice(0, id.indexOf(":")), id.slice(id.indexOf(":") + 1)];
      let neighbours: { id: string; type: GraphNode["type"] }[] = [];
      if (type === "uid") {
        const d = (await col.uids().doc(key).get()).data() as UidDoc | undefined;
        neighbours = [
          ...Object.keys(d?.deviceIds || {}).map((k) => ({ id: `device:${k}`, type: "device" as const })),
          ...Object.keys(d?.ipHashes || {}).map((k) => ({ id: `ip:${k}`, type: "ip" as const })),
        ];
      } else if (type === "device") {
        const d = (await col.devices().doc(key).get()).data() as DeviceDoc | undefined;
        neighbours = [
          ...Object.keys(d?.uids || {}).map((k) => ({ id: `uid:${k}`, type: "uid" as const })),
          ...Object.keys(d?.ipHashes || {}).map((k) => ({ id: `ip:${k}`, type: "ip" as const })),
        ];
      } else if (type === "ip") {
        const d = (await col.ips().doc(key).get()).data() as IpDoc | undefined;
        neighbours = [
          ...Object.keys(d?.uids || {}).map((k) => ({ id: `uid:${k}`, type: "uid" as const })),
          ...Object.keys(d?.deviceIds || {}).map((k) => ({ id: `device:${k}`, type: "device" as const })),
        ];
      }
      for (const n of neighbours) {
        if (add({ id: n.id, type: n.type, label: n.id.slice(n.id.indexOf(":") + 1) })) {
          addEdge(id, n.id);
          next.push(n.id);
        }
      }
    }
    frontier = next;
  }

  // decorate
  const all = Array.from(nodes.values());
  const db = adminDb();
  await Promise.all(
    all.map(async (n) => {
      const key = n.id.slice(n.id.indexOf(":") + 1);
      if (n.type === "uid") {
        const [u, auth] = await Promise.all([db.collection("users").doc(key).get(), adminAuth().getUser(key).catch(() => null)]);
        n.label = auth?.email || key;
        n.sub = key;
        n.admin = isAdminEmail(auth?.email) && !!auth?.emailVerified;
        const st = u.data()?.moderation?.status;
        n.banned = st === "banned" || st === "suspended";
      } else if (n.type === "device") {
        const d = (await col.devices().doc(key).get()).data() as DeviceDoc | undefined;
        n.label = key.slice(0, 10) + "…";
        n.sub = d ? `${d.ua.slice(0, 60)} · ${Object.keys(d.uids).length} acct` : undefined;
        n.admin = !!d?.adminSeen;
        n.risk = d?.lastRiskLevel;
      } else if (n.type === "ip") {
        const d = (await col.ips().doc(key).get()).data() as IpDoc | undefined;
        n.label = d?.maskedIp || key.slice(0, 10) + "…";
        n.sub = d ? `${Object.keys(d.uids).length} acct · ${d.country || "?"}` : undefined;
        n.admin = !!d?.adminSeen;
      }
    })
  );
  const banList = await getActiveBans(all.filter((n) => n.type !== "fp").map((n) => ({ kind: n.type as BanKind, key: n.id.slice(n.id.indexOf(":") + 1) })));
  for (const b of banList) {
    const n = nodes.get(`${b.kind}:${b.key}`);
    if (n) n.banned = true;
  }

  const strike = await getStrike(seed.kind as BanKind, seed.key);
  const dev = seed.kind === "device" ? ((await col.devices().doc(seed.key).get()).data() as DeviceDoc | undefined) : undefined;
  const risk = dev
    ? computeRisk({
        clientBot: dev.botSignals,
        serverBotUa: false,
        missingAcceptLanguage: false,
        uaMismatch: dev.flags.includes("ua_mismatch"),
        langMismatch: dev.flags.includes("lang_mismatch"),
        noDevice: false,
        idConflict: dev.flags.includes("id_conflict"),
        deviceResets: dev.resets,
        fpMultiDevice24h: dev.flags.includes("fp_multi_device") ? 3 : 0,
        deviceUids: Object.keys(dev.uids).length,
        deviceUids24h: 0,
        ipUids24h: 0,
        uidDevices24h: 0,
        uidAgeMinutes: null,
        countryHop: dev.flags.includes("country_hop"),
        linkedBannedUids: Object.keys(dev.bannedUids).length,
        recentStrikePoints: strike?.points || 0,
      })
    : null;

  return { seed, nodes: Array.from(nodes.values()), edges, risk, strikePoints: strike?.points || 0, bans: banList, truncated };
}

// ---- admin operations ------------------------------------------------------------------

async function targetKey(kind: BanKind, target: string): Promise<string> {
  const t = target.trim();
  if (kind === "uid") {
    if (t.includes("@")) return (await adminAuth().getUserByEmail(t)).uid;
    return t;
  }
  if (kind === "ip") {
    if (/^[a-f0-9]{40}$/.test(t)) return t;
    return hashIp(ipSubject(t.toLowerCase()));
  }
  return t;
}

export async function adminBan(args: { kind: BanKind; target: string; hours: number | null; reason: string; by: string }): Promise<void> {
  const key = await targetKey(args.kind, args.target);
  if (!key) throw new Error("Missing target.");

  if (args.kind === "uid") {
    const u = await adminAuth().getUser(key);
    if (isAdminEmail(u.email)) throw new Error("Admin accounts can't be banned.");
    const { banUser, suspendUser } = await import("../user-moderation");
    if (args.hours === null) await banUser(key, args.reason, args.by);
    else await suspendUser(key, new Date(Date.now() + args.hours * 3600_000).toISOString(), args.reason, args.by);
  } else if (args.kind === "device") {
    const d = (await col.devices().doc(key).get()).data() as DeviceDoc | undefined;
    if (d?.adminSeen) throw new Error("An admin has used this device — it can't be banned.");
  } else if (args.kind === "ip") {
    const d = (await col.ips().doc(key).get()).data() as IpDoc | undefined;
    if (d?.adminSeen) throw new Error("An admin has used this network — it can't be banned.");
  }
  await putBan({ kind: args.kind, key, reason: args.reason || "Banned by admin", hours: args.hours, auto: false, source: args.by });
  await logEvent({ type: "admin_ban", severity: "info", uid: args.kind === "uid" ? key : null, deviceId: args.kind === "device" ? key : null, ipHash: args.kind === "ip" ? key : null, details: `${args.kind} by ${args.by}: ${args.reason}` });
}

export async function adminUnban(args: { kind: BanKind; target: string; by: string }): Promise<void> {
  const key = await targetKey(args.kind, args.target);
  await removeBan(args.kind, key);
  await clearStrikes(args.kind, key);
  if (args.kind === "uid") await unbanAllForUid(key, args.by);
  await logEvent({ type: "admin_unban", severity: "info", uid: args.kind === "uid" ? key : null, deviceId: args.kind === "device" ? key : null, ipHash: args.kind === "ip" ? key : null, details: `${args.kind} by ${args.by}` });
}

/** Full un-ban for an account: its moderation state, its ban/strike docs,
 * and any *automatic* device/IP/fingerprint bans created through it, so
 * a false positive is undone in one action instead of leaving the person
 * blocked by a leftover device ban. */
export async function unbanAllForUid(uid: string, by: string): Promise<void> {
  const [{ unbanUser }, uidDoc] = await Promise.all([import("../user-moderation"), col.uids().doc(uid).get()]);
  await unbanUser(uid, by).catch(() => {});
  await clearStrikes("uid", uid);
  await removeBan("uid", uid).catch(() => {});
  const d = uidDoc.data() as UidDoc | undefined;
  for (const id of Object.keys(d?.deviceIds || {})) {
    const bans = await getActiveBans([{ kind: "device", key: id }]);
    if (bans.some((b) => b.auto)) {
      await removeBan("device", id).catch(() => {});
      await clearStrikes("device", id);
      const dev = (await col.devices().doc(id).get()).data() as DeviceDoc | undefined;
      if (dev?.fpHash) await removeBan("fp", dev.fpHash).catch(() => {});
      await col.devices().doc(id).set({ bannedUids: {} }, { merge: true }).catch(() => {});
    }
  }
  for (const h of Object.keys(d?.ipHashes || {})) {
    const bans = await getActiveBans([{ kind: "ip", key: h }]);
    if (bans.some((b) => b.auto)) {
      await removeBan("ip", h).catch(() => {});
      await clearStrikes("ip", h);
    }
  }
}

export async function overview() {
  const [bans, eventsSnap] = await Promise.all([listBans(200), col.events().orderBy("at", "desc").limit(100).get()]);
  const events = eventsSnap.docs.map((d) => ({ id: d.id, ...(d.data() as { at: string; type: string; severity: string; uid?: string | null; deviceId?: string | null; ipMasked?: string | null; score?: number | null; details?: string | null }) }));
  const since = Date.now() - 86400_000;
  const recent = events.filter((e) => Date.parse(e.at) > since);
  const countType = (t: string) => recent.filter((e) => e.type === t).length;
  return {
    bans,
    events,
    stats24h: {
      events: recent.length,
      autoBans: countType("auto_ban"),
      blocked: countType("blocked_banned"),
      rateLimited: countType("rate_limited"),
      critical: recent.filter((e) => e.severity === "critical").length,
      trialDenied: countType("trial_limit"),
    },
  };
}
