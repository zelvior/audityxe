import { adminDb } from "../firebase/admin";
import { Transaction } from "firebase-admin/firestore";
import { hmac } from "./core";

/** Firestore access for the abuse engine. Collections (all server-only —
 * firestore.rules denies every client access):
 *   abuse_devices / abuse_ips / abuse_fp / abuse_uid   the device graph
 *   abuse_bans        manual + automatic bans (device | ip | uid | fp)
 *   abuse_strikes     rolling strike points that drive auto-bans
 *   abuse_events      audit trail of everything the engine decided
 *   abuse_rl          fixed-window rate-limit counters
 *   abuse_trial       device-bound / IP-bound daily free-trial counters
 * Short-lived docs carry `expireAt` — add a Firestore TTL policy on that
 * field, or let /api/cron/abuse-cleanup prune them. */

export type BanKind = "uid" | "device" | "ip" | "fp";
export const iso = (d = new Date()) => d.toISOString();
const day = () => new Date().toISOString().slice(0, 10);
const hoursAgo = (h: number) => Date.now() - h * 3600_000;

export interface DeviceDoc {
  firstSeen: string;
  lastSeen: string;
  fpHash: string | null;
  parts: Record<string, string>;
  uids: Record<string, string>;
  ipHashes: Record<string, string>;
  countries: Record<string, string>;
  bannedUids: Record<string, string>;
  adminSeen: boolean;
  resets: number;
  flags: string[];
  botSignals: string[];
  hits: number;
  lastRiskLevel: string;
  ua: string;
  tz: string;
}
export interface IpDoc {
  maskedIp: string;
  firstSeen: string;
  lastSeen: string;
  uids: Record<string, string>;
  deviceIds: Record<string, string>;
  adminSeen: boolean;
  country: string | null;
  hits: number;
}
export interface FpDoc {
  firstSeen: string;
  lastSeen: string;
  deviceIds: Record<string, string>;
}
export interface UidDoc {
  firstSeen: string;
  lastSeen: string;
  deviceIds: Record<string, string>;
  ipHashes: Record<string, string>;
  lastCountry: string | null;
  lastCountryAt: string | null;
}
export interface BanDoc {
  kind: BanKind;
  key: string;
  reason: string;
  until: string | null; // null = permanent (admin-only)
  auto: boolean;
  source: string;
  offense: number;
  createdAt: string;
}

export const col = {
  devices: () => adminDb().collection("abuse_devices"),
  ips: () => adminDb().collection("abuse_ips"),
  fps: () => adminDb().collection("abuse_fp"),
  uids: () => adminDb().collection("abuse_uid"),
  bans: () => adminDb().collection("abuse_bans"),
  strikes: () => adminDb().collection("abuse_strikes"),
  events: () => adminDb().collection("abuse_events"),
  rl: () => adminDb().collection("abuse_rl"),
  trial: () => adminDb().collection("abuse_trial"),
};

export function capMap(map: Record<string, string>, max: number): Record<string, string> {
  const entries = Object.entries(map);
  if (entries.length <= max) return map;
  return Object.fromEntries(entries.sort((a, b) => b[1].localeCompare(a[1])).slice(0, max));
}

export function recentCount(map: Record<string, string> | undefined, hours: number): number {
  if (!map) return 0;
  const cutoff = hoursAgo(hours);
  let n = 0;
  for (const v of Object.values(map)) if (Date.parse(v) >= cutoff) n++;
  return n;
}

// ---- device graph ---------------------------------------------------------

export interface GraphUpsert {
  deviceId: string;
  fpHash: string | null;
  parts: Record<string, string>;
  uid: string | null;
  ipHash: string;
  ipMasked: string;
  country: string | null;
  adminSeen: boolean;
  ua: string;
  tz: string;
  flags: string[];
  botSignals: string[];
  isReset: boolean;
}

export interface GraphState {
  device: DeviceDoc;
  ip: IpDoc;
  fp: FpDoc | null;
  uidDoc: UidDoc | null;
  newDevice: boolean;
  newLink: boolean;
  previousCountry: { cc: string; at: string } | null;
}

export async function upsertGraph(u: GraphUpsert): Promise<GraphState> {
  const db = adminDb();
  const now = iso();
  const dRef = col.devices().doc(u.deviceId);
  const iRef = col.ips().doc(u.ipHash);
  const fRef = u.fpHash ? col.fps().doc(u.fpHash) : null;
  const uRef = u.uid ? col.uids().doc(u.uid) : null;

  return db.runTransaction(async (tx: Transaction) => {
    const [dSnap, iSnap, fSnap, uSnap] = await Promise.all([
      tx.get(dRef),
      tx.get(iRef),
      fRef ? tx.get(fRef) : Promise.resolve(null),
      uRef ? tx.get(uRef) : Promise.resolve(null),
    ]);

    const d0 = dSnap.data() as DeviceDoc | undefined;
    const i0 = iSnap.data() as IpDoc | undefined;
    const f0 = fSnap?.data() as FpDoc | undefined;
    const u0 = uSnap?.data() as UidDoc | undefined;

    const newDevice = !d0;
    const newLink =
      newDevice || (!!u.uid && !d0?.uids?.[u.uid]) || !d0?.ipHashes?.[u.ipHash] || (!!u.uid && !i0?.uids?.[u.uid]);

    const device: DeviceDoc = {
      firstSeen: d0?.firstSeen || now,
      lastSeen: now,
      fpHash: u.fpHash || d0?.fpHash || null,
      parts: Object.keys(u.parts).length ? u.parts : d0?.parts || {},
      uids: capMap({ ...(d0?.uids || {}), ...(u.uid ? { [u.uid]: now } : {}) }, 60),
      ipHashes: capMap({ ...(d0?.ipHashes || {}), [u.ipHash]: now }, 60),
      countries: { ...(d0?.countries || {}), ...(u.country ? { [u.country]: now } : {}) },
      bannedUids: d0?.bannedUids || {},
      adminSeen: !!d0?.adminSeen || u.adminSeen,
      resets: (d0?.resets || 0) + (u.isReset ? 1 : 0),
      flags: Array.from(new Set(u.flags)).slice(-20), // current state from the latest registration, not cumulative
      botSignals: Array.from(new Set([...u.botSignals])).slice(0, 20),
      hits: (d0?.hits || 0) + 1,
      lastRiskLevel: d0?.lastRiskLevel || "low",
      ua: u.ua.slice(0, 200),
      tz: u.tz.slice(0, 64),
    };
    const ip: IpDoc = {
      maskedIp: u.ipMasked,
      firstSeen: i0?.firstSeen || now,
      lastSeen: now,
      uids: capMap({ ...(i0?.uids || {}), ...(u.uid ? { [u.uid]: now } : {}) }, 80),
      deviceIds: capMap({ ...(i0?.deviceIds || {}), [u.deviceId]: now }, 80),
      adminSeen: !!i0?.adminSeen || u.adminSeen,
      country: u.country || i0?.country || null,
      hits: (i0?.hits || 0) + 1,
    };
    const fp: FpDoc | null = u.fpHash
      ? {
          firstSeen: f0?.firstSeen || now,
          lastSeen: now,
          deviceIds: capMap({ ...(f0?.deviceIds || {}), [u.deviceId]: now }, 60),
        }
      : null;

    let previousCountry: GraphState["previousCountry"] = null;
    let uidDoc: UidDoc | null = null;
    if (u.uid) {
      if (u0?.lastCountry && u0.lastCountryAt) previousCountry = { cc: u0.lastCountry, at: u0.lastCountryAt };
      uidDoc = {
        firstSeen: u0?.firstSeen || now,
        lastSeen: now,
        deviceIds: capMap({ ...(u0?.deviceIds || {}), [u.deviceId]: now }, 40),
        ipHashes: capMap({ ...(u0?.ipHashes || {}), [u.ipHash]: now }, 40),
        lastCountry: u.country || u0?.lastCountry || null,
        lastCountryAt: u.country ? now : u0?.lastCountryAt || null,
      };
    }

    tx.set(dRef, device);
    tx.set(iRef, ip);
    if (fRef && fp) tx.set(fRef, fp);
    if (uRef && uidDoc) tx.set(uRef, uidDoc);

    return { device, ip, fp, uidDoc, newDevice, newLink, previousCountry };
  });
}

export async function readGraphDocs(deviceId: string | null, ipHash: string, uid: string | null) {
  const db = adminDb();
  const refs = [
    deviceId ? col.devices().doc(deviceId) : null,
    col.ips().doc(ipHash),
    uid ? col.uids().doc(uid) : null,
  ].filter((r): r is FirebaseFirestore.DocumentReference => !!r);
  const snaps = await db.getAll(...refs);
  let i = 0;
  const device = deviceId ? (snaps[i++].data() as DeviceDoc | undefined) : undefined;
  const ip = snaps[i++].data() as IpDoc | undefined;
  const uidDoc = uid ? (snaps[i++].data() as UidDoc | undefined) : undefined;
  return { device, ip, uidDoc };
}

export async function setDeviceRiskLevel(deviceId: string, level: string): Promise<void> {
  await col.devices().doc(deviceId).set({ lastRiskLevel: level }, { merge: true }).catch(() => {});
}

/** When an account is banned/suspended (by an admin OR the auto-ban
 * system), stamp every device it has used so later accounts appearing on
 * those devices can be recognized as ban evasion. Best-effort. */
export async function noteUidModerated(uid: string): Promise<void> {
  try {
    const snap = await col.uids().doc(uid).get();
    const ids = Object.keys((snap.data() as UidDoc | undefined)?.deviceIds || {});
    const now = iso();
    await Promise.all(
      ids.map((id) => col.devices().doc(id).set({ bannedUids: { [uid]: now } }, { merge: true }).catch(() => {}))
    );
  } catch {
    /* best effort */
  }
}

// ---- bans -----------------------------------------------------------------

const banId = (kind: BanKind, key: string) => `${kind}_${key}`;
const banActive = (b: BanDoc | undefined): b is BanDoc => !!b && (b.until === null || Date.parse(b.until) > Date.now());

export async function getActiveBans(keys: { kind: BanKind; key: string | null | undefined }[]): Promise<BanDoc[]> {
  const refs = keys.filter((k) => !!k.key).map((k) => col.bans().doc(banId(k.kind, k.key as string)));
  if (!refs.length) return [];
  const snaps = await adminDb().getAll(...refs);
  return snaps.map((s) => s.data() as BanDoc | undefined).filter(banActive);
}

export async function putBan(b: {
  kind: BanKind;
  key: string;
  reason: string;
  hours: number | null;
  auto: boolean;
  source: string;
  offense?: number;
}): Promise<BanDoc> {
  const doc: BanDoc = {
    kind: b.kind,
    key: b.key,
    reason: b.reason.replace(/[\x00-\x1F\x7F]/g, "").slice(0, 300),
    until: b.hours === null ? null : iso(new Date(Date.now() + b.hours * 3600_000)),
    auto: b.auto,
    source: b.source,
    offense: b.offense || 1,
    createdAt: iso(),
  };
  await col.bans().doc(banId(b.kind, b.key)).set({ ...doc, expireAt: b.hours === null ? null : new Date(Date.parse(doc.until as string) + 7 * 86400_000) });
  return doc;
}

export async function removeBan(kind: BanKind, key: string): Promise<void> {
  await col.bans().doc(banId(kind, key)).delete();
}

export async function listBans(limit = 200): Promise<BanDoc[]> {
  const snap = await col.bans().orderBy("createdAt", "desc").limit(limit).get();
  return snap.docs.map((d) => d.data() as BanDoc).filter(banActive);
}

// ---- strikes (drive auto-bans) ----------------------------------------------

export interface StrikeDoc {
  points: number;
  windowStart: string;
  offenses: number;
  lastAt: string;
}
const STRIKE_WINDOW_H = 24;

export async function addStrike(kind: BanKind, key: string, points: number): Promise<StrikeDoc> {
  const ref = col.strikes().doc(banId(kind, key));
  return adminDb().runTransaction(async (tx: Transaction) => {
    const snap = await tx.get(ref);
    const cur = snap.data() as StrikeDoc | undefined;
    const fresh = !cur || Date.parse(cur.windowStart) < hoursAgo(STRIKE_WINDOW_H);
    const next: StrikeDoc = {
      points: (fresh ? 0 : cur!.points) + points,
      windowStart: fresh ? iso() : cur!.windowStart,
      offenses: cur?.offenses || 0,
      lastAt: iso(),
    };
    tx.set(ref, { ...next, expireAt: new Date(Date.now() + 90 * 86400_000) });
    return next;
  });
}

export async function recordOffense(kind: BanKind, key: string): Promise<number> {
  const ref = col.strikes().doc(banId(kind, key));
  return adminDb().runTransaction(async (tx: Transaction) => {
    const snap = await tx.get(ref);
    const cur = snap.data() as StrikeDoc | undefined;
    const offenses = (cur?.offenses || 0) + 1;
    tx.set(ref, { points: 0, windowStart: iso(), offenses, lastAt: iso(), expireAt: new Date(Date.now() + 90 * 86400_000) });
    return offenses;
  });
}

export async function clearStrikes(kind: BanKind, key: string): Promise<void> {
  await col.strikes().doc(banId(kind, key)).delete().catch(() => {});
}

export async function getStrike(kind: BanKind, key: string): Promise<StrikeDoc | null> {
  const s = await col.strikes().doc(banId(kind, key)).get();
  return (s.data() as StrikeDoc | undefined) || null;
}

// ---- events -----------------------------------------------------------------

export interface AbuseEvent {
  type: string;
  severity: "info" | "warn" | "high" | "critical";
  uid?: string | null;
  deviceId?: string | null;
  ipHash?: string | null;
  ipMasked?: string | null;
  score?: number | null;
  details?: string | null;
}

export async function logEvent(e: AbuseEvent): Promise<void> {
  try {
    await col.events().add({
      ...e,
      uid: e.uid || null,
      deviceId: e.deviceId || null,
      ipHash: e.ipHash || null,
      ipMasked: e.ipMasked || null,
      score: e.score ?? null,
      details: e.details ? e.details.replace(/[\x00-\x1F\x7F]/g, " ").slice(0, 400) : null,
      at: iso(),
      expireAt: new Date(Date.now() + 30 * 86400_000),
    });
  } catch {
    /* logging must never break a request */
  }
}

export async function listEvents(limit = 100): Promise<(AbuseEvent & { id: string; at: string })[]> {
  const snap = await col.events().orderBy("at", "desc").limit(Math.min(limit, 300)).get();
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as AbuseEvent & { at: string }) }));
}

// ---- rate limiting ------------------------------------------------------------

export interface RlResult {
  allowed: boolean;
  count: number;
  limit: number;
  retryAfterSec: number;
}

/** Fixed-window counter, atomic. `denials` (rejected attempts inside the
 * window) is returned via count > limit so callers can escalate repeated
 * hammering into strikes. */
export async function rlConsume(key: string, limit: number, windowSec: number): Promise<RlResult> {
  const now = Date.now();
  const bucket = Math.floor(now / (windowSec * 1000));
  const ref = col.rl().doc(`${hmac("rl", key)}_${bucket}`);
  const retryAfterSec = Math.max(1, Math.ceil(((bucket + 1) * windowSec * 1000 - now) / 1000));
  return adminDb().runTransaction(async (tx: Transaction) => {
    const snap = await tx.get(ref);
    const count = ((snap.data()?.count as number) || 0) + 1;
    tx.set(ref, { count, expireAt: new Date((bucket + 2) * windowSec * 1000) });
    return { allowed: count <= limit, count, limit, retryAfterSec };
  });
}

const mem = new Map<string, number[]>();
/** Per-instance burst guard — cheap flood protection that never touches
 * Firestore. Not authoritative (instances don't share it); the Firestore
 * counters are. */
export function memBurst(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const arr = (mem.get(key) || []).filter((t) => now - t < windowMs);
  arr.push(now);
  mem.set(key, arr);
  if (mem.size > 5000) for (const k of Array.from(mem.keys()).slice(0, 1000)) mem.delete(k);
  return arr.length <= limit;
}

// ---- device-bound trial quota ----------------------------------------------------

export interface TrialKeys {
  device?: string | null;
  combo?: string | null;
  ip?: string | null;
}
export interface TrialResult {
  allowed: boolean;
  deniedBy?: "device" | "combo" | "ip";
  consumed: { id: string }[];
}

/** One atomic transaction across every applicable bucket, so a free
 * "trial" can't be multiplied by creating accounts (device bucket), by
 * clearing storage (fingerprint+IP combo bucket) or by hopping devices
 * behind one connection (IP bucket, deliberately looser for shared NAT). */
export async function consumeTrial(keys: TrialKeys, limits: { device: number; combo: number; ip: number }): Promise<TrialResult> {
  const today = day();
  const buckets = [
    keys.device ? { name: "device" as const, id: `d_${keys.device}`, limit: limits.device } : null,
    keys.combo ? { name: "combo" as const, id: `c_${keys.combo}`, limit: limits.combo } : null,
    keys.ip ? { name: "ip" as const, id: `i_${keys.ip}`, limit: limits.ip } : null,
  ].filter((b): b is { name: "device" | "combo" | "ip"; id: string; limit: number } => !!b);
  if (!buckets.length) return { allowed: true, consumed: [] };

  return adminDb().runTransaction(async (tx: Transaction) => {
    const refs = buckets.map((b) => col.trial().doc(b.id));
    const snaps = await Promise.all(refs.map((r) => tx.get(r)));
    const used = snaps.map((s) => (s.data()?.date === day() ? ((s.data()?.count as number) || 0) : 0));
    for (let i = 0; i < buckets.length; i++) {
      if (used[i] >= buckets[i].limit) return { allowed: false, deniedBy: buckets[i].name, consumed: [] };
    }
    buckets.forEach((b, i) => tx.set(refs[i], { date: today, count: used[i] + 1, expireAt: new Date(Date.now() + 3 * 86400_000) }));
    return { allowed: true, consumed: buckets.map((b) => ({ id: b.id })) };
  });
}

export async function refundTrial(result: TrialResult): Promise<void> {
  if (!result.consumed.length) return;
  try {
    await adminDb().runTransaction(async (tx: Transaction) => {
      const refs = result.consumed.map((c) => col.trial().doc(c.id));
      const snaps = await Promise.all(refs.map((r) => tx.get(r)));
      snaps.forEach((s, i) => {
        const d = s.data();
        if (d?.date === day() && d.count > 0) tx.set(refs[i], { ...d, count: d.count - 1 });
      });
    });
  } catch {
    /* best effort */
  }
}

export async function pruneExpired(): Promise<number> {
  const db = adminDb();
  let total = 0;
  for (const name of ["abuse_rl", "abuse_events", "abuse_trial", "abuse_bans", "abuse_strikes"]) {
    for (let pass = 0; pass < 5; pass++) {
      const snap = await db.collection(name).where("expireAt", "<", new Date()).limit(400).get();
      if (snap.empty) break;
      const batch = db.batch();
      snap.docs.forEach((d) => batch.delete(d.ref));
      await batch.commit();
      total += snap.size;
    }
  }
  return total;
}
