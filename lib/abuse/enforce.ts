import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "../firebase/admin";
import { looksLikeBot } from "../security";
import { isAdminEmail } from "../admin-email";
import { PLANS } from "../plans";
import {
  abuseMode,
  clientIp,
  deviceCookieHeader,
  hashFp,
  hashIp,
  ipSubject,
  isDeviceId,
  isExemptIdentity,
  maskIp,
  readDeviceCookie,
  requestCountry,
  verifyDeviceToken,
} from "./core";
import {
  BanDoc,
  BanKind,
  DeviceDoc,
  TrialResult,
  addStrike,
  col,
  consumeTrial,
  getActiveBans,
  getStrike,
  logEvent,
  memBurst,
  noteUidModerated,
  putBan,
  readGraphDocs,
  recentCount,
  recordOffense,
  refundTrial,
  rlConsume,
  setDeviceRiskLevel,
  upsertGraph,
} from "./store";
import { RiskInput, RiskResult, computeRisk, limitMultiplier } from "./risk";

export type AbuseRoute = "audit" | "bulk" | "redeem" | "payment" | "register";

interface Identity {
  uid: string;
  email: string | null;
  emailVerified?: boolean;
}

// [limit, windowSec] pairs per route and subject
const LIMITS: Record<AbuseRoute, { ip: [number, number][]; device: [number, number][]; uid: [number, number][] }> = {
  audit: { ip: [[30, 60], [250, 3600]], device: [[8, 60], [80, 3600]], uid: [[8, 60]] },
  bulk: { ip: [[8, 60]], device: [[4, 60]], uid: [[3, 60]] },
  redeem: { ip: [[12, 3600]], device: [[10, 3600]], uid: [[10, 3600]] },
  payment: { ip: [[30, 3600]], device: [[15, 3600]], uid: [[12, 3600]] },
  register: { ip: [[90, 3600]], device: [[60, 3600]], uid: [[60, 3600]] },
};

const BAN_POINTS = 12; // strike points inside 24h that trigger an auto-ban
const BAN_HOURS = [1, 24, 24 * 7, 24 * 30]; // escalation per repeat offense

export interface AbuseDecision {
  allowed: boolean;
  status?: number;
  code?: string;
  message?: string;
  retryAfterSec?: number;
  risk?: RiskResult;
  deviceId: string | null;
  ipHash: string;
  exempt: boolean;
}

export function denyResponse(d: AbuseDecision): NextResponse {
  const res = NextResponse.json({ error: d.message || "Request blocked.", code: d.code }, { status: d.status || 403 });
  if (d.retryAfterSec) res.headers.set("Retry-After", String(d.retryAfterSec));
  return res;
}

function banMessage(b: BanDoc): string {
  const until = b.until ? ` until ${new Date(b.until).toUTCString()}` : "";
  return `Access from this ${b.kind === "uid" ? "account" : b.kind === "ip" ? "network" : "device"} is temporarily restricted${until} due to suspected abuse. If you think this is a mistake, contact support.`;
}

function sameLang(a: string, b: string): boolean {
  const pa = a.split(",")[0]?.trim().toLowerCase().split("-")[0];
  const pb = b.split(",")[0]?.trim().toLowerCase().split("-")[0];
  return !pa || !pb || pa === pb;
}

// ---- strikes -> automatic ban / unban -------------------------------------------

/** Adds strike points to every identifier involved; when any crosses the
 * threshold, escalates to an automatic *temporary* ban. Auto-bans always
 * expire on their own (that is the auto-unban) — permanent bans are
 * admin-only. Admin identities and any device/IP an admin has used are
 * never auto-banned. */
export async function strike(
  s: { uid?: string | null; deviceId?: string | null; ipHash?: string | null; ipMasked?: string | null; exempt?: boolean },
  points: number,
  type: string,
  detail?: string
): Promise<void> {
  if (s.exempt || abuseMode() === "off") return;
  try {
    const targets: { kind: BanKind; key: string }[] = [];
    if (s.uid) targets.push({ kind: "uid", key: s.uid });
    if (s.deviceId) targets.push({ kind: "device", key: s.deviceId });
    if (s.ipHash) targets.push({ kind: "ip", key: s.ipHash });

    let tripped = false;
    for (const t of targets) {
      const weight = t.kind === "ip" ? Math.max(1, Math.round(points / 2)) : points;
      const doc = await addStrike(t.kind, t.key, weight);
      if (doc.points >= BAN_POINTS && t.kind !== "ip") tripped = true;
      if (doc.points >= BAN_POINTS * 2 && t.kind === "ip") tripped = true;
    }
    await logEvent({ type, severity: points >= 4 ? "high" : "warn", uid: s.uid, deviceId: s.deviceId, ipHash: s.ipHash, ipMasked: s.ipMasked, details: detail });
    if (tripped && abuseMode() === "enforce") await autoBan(s, `Automatic: ${type}${detail ? ` (${detail})` : ""}`);
  } catch (err) {
    console.error("[abuse] strike failed:", err);
  }
}

async function uidIsAdmin(uid: string): Promise<boolean> {
  try {
    const u = await adminAuth().getUser(uid);
    return isAdminEmail(u.email) && u.emailVerified;
  } catch {
    return false;
  }
}

async function autoBan(
  s: { uid?: string | null; deviceId?: string | null; ipHash?: string | null },
  reason: string
): Promise<void> {
  const primary: { kind: BanKind; key: string } | null = s.uid
    ? { kind: "uid", key: s.uid }
    : s.deviceId
    ? { kind: "device", key: s.deviceId }
    : s.ipHash
    ? { kind: "ip", key: s.ipHash }
    : null;
  if (!primary) return;

  const offense = await recordOffense(primary.kind, primary.key);
  const hours = BAN_HOURS[Math.min(offense, BAN_HOURS.length) - 1];

  const { device, ip } = await readGraphDocs(s.deviceId || null, s.ipHash || "none", null).catch(() => ({ device: undefined, ip: undefined }));

  // The admin safety net: never ban an identifier an admin has used.
  if (s.deviceId && !device?.adminSeen) {
    await putBan({ kind: "device", key: s.deviceId, reason, hours, auto: true, source: "auto-defense", offense });
  }
  const ipUids = ip ? Object.keys(ip.uids || {}).length : 0;
  if (s.ipHash && ip && !ip.adminSeen && ipUids <= 2) {
    await putBan({ kind: "ip", key: s.ipHash, reason, hours, auto: true, source: "auto-defense", offense });
  }
  if (device?.fpHash && !device.adminSeen) {
    await putBan({ kind: "fp", key: device.fpHash, reason, hours, auto: true, source: "auto-defense", offense });
  }

  // Suspend the account and any account farmed on the same device
  // (read-time-expiring suspension: lifts itself, no cron needed).
  const uids = new Set<string>();
  if (s.uid) uids.add(s.uid);
  if (device && Object.keys(device.uids || {}).length <= 8) Object.keys(device.uids || {}).forEach((u) => uids.add(u));
  const { suspendUser } = await import("../user-moderation");
  const until = new Date(Date.now() + hours * 3600_000).toISOString();
  for (const uid of Array.from(uids)) {
    if (await uidIsAdmin(uid)) continue;
    const exists = (await adminDb().collection("users").doc(uid).get()).exists;
    if (!exists) continue; // never-verified account — nothing to suspend
    await suspendUser(uid, until, reason, "auto-defense").catch(() => {});
    await putBan({ kind: "uid", key: uid, reason, hours, auto: true, source: "auto-defense", offense });
  }
  await logEvent({
    type: "auto_ban",
    severity: "critical",
    uid: s.uid,
    deviceId: s.deviceId,
    ipHash: s.ipHash,
    details: `${reason} — offense #${offense}, ${hours}h`,
  });
}

// ---- main gate ----------------------------------------------------------------------

export interface GateOptions {
  route: AbuseRoute;
  identity: Identity | null;
  viaApiKey?: boolean;
}

function buildRiskInput(args: {
  req: NextRequest;
  device?: DeviceDoc;
  deviceId: string | null;
  ipUids24h: number;
  uidDevices24h: number;
  uidAgeMinutes: number | null;
  strikePoints: number;
  idConflict: boolean;
  uid: string | null;
}): RiskInput {
  const { req, device } = args;
  return {
    clientBot: device?.botSignals || [],
    serverBotUa: looksLikeBot(req),
    missingAcceptLanguage: !req.headers.get("accept-language"),
    uaMismatch: !!device?.flags?.includes("ua_mismatch"),
    langMismatch: !!device?.flags?.includes("lang_mismatch"),
    noDevice: !args.deviceId,
    idConflict: args.idConflict,
    deviceResets: device?.resets || 0,
    fpMultiDevice24h: device?.flags?.includes("fp_multi_device") ? 3 : 0,
    deviceUids: Object.keys(device?.uids || {}).length,
    deviceUids24h: recentCount(device?.uids, 24),
    ipUids24h: args.ipUids24h,
    uidDevices24h: args.uidDevices24h,
    uidAgeMinutes: args.uidAgeMinutes,
    countryHop: !!device?.flags?.includes("country_hop"),
    linkedBannedUids: Object.entries(device?.bannedUids || {}).filter(
      ([u, at]) => u !== args.uid && Date.parse(at) > Date.now() - 30 * 86400_000
    ).length,
    recentStrikePoints: args.strikePoints,
  };
}

/** The gate every expensive/abusable endpoint calls before doing work.
 * Fails OPEN on internal errors (a Firestore hiccup must never lock out
 * real users) and bypasses everything for admin accounts. */
export async function enforceAbuseControls(req: NextRequest, opts: GateOptions): Promise<AbuseDecision> {
  const ip = clientIp(req);
  const ipSub = ipSubject(ip);
  const ipHash = hashIp(ipSub);
  const base: AbuseDecision = { allowed: true, deviceId: null, ipHash, exempt: false };

  if (abuseMode() === "off") return base;
  if (isExemptIdentity(opts.identity)) return { ...base, exempt: true };

  try {
    const cookieToken = verifyDeviceToken(readDeviceCookie(req));
    const deviceId = cookieToken?.deviceId || null;
    const headerId = req.headers.get("x-device-id");
    const idConflict = !!(deviceId && isDeviceId(headerId) && headerId !== deviceId);
    const uid = opts.identity?.uid || null;
    const monitor = abuseMode() === "monitor";
    const deny = (d: Omit<AbuseDecision, "allowed" | "deviceId" | "ipHash" | "exempt">): AbuseDecision =>
      monitor ? { ...base, deviceId } : { ...base, deviceId, allowed: false, ...d };

    // 1. per-instance flood guard — no Firestore cost
    if (!memBurst(`ip:${ipHash}:${opts.route}`, 40, 10_000)) {
      return deny({ status: 429, code: "RATE_LIMITED", message: "Too many requests. Slow down and try again shortly.", retryAfterSec: 10 });
    }

    // 2. bans + graph docs
    const { device, ip: ipDoc, uidDoc } = await readGraphDocs(deviceId, ipHash, uid);
    const bans = await getActiveBans([
      { kind: "uid", key: uid },
      { kind: "device", key: deviceId },
      { kind: "ip", key: ipHash },
      { kind: "fp", key: device?.fpHash },
    ]);
    // admin-seen identifiers are never enforced against
    const effective = bans.filter((b) => !(b.kind === "device" && device?.adminSeen) && !(b.kind === "ip" && ipDoc?.adminSeen));
    if (effective.length) {
      await logEvent({ type: "blocked_banned", severity: "warn", uid, deviceId, ipHash, ipMasked: maskIp(ip), details: effective.map((b) => `${b.kind}:${b.source}`).join(",") });
      // ban evasion: an account that is NOT itself banned, using a banned device/ip/fp
      if (uid && !effective.some((b) => b.kind === "uid")) {
        await strike({ uid, deviceId, ipHash, ipMasked: maskIp(ip) }, 12, "ban_evasion", effective.map((b) => b.kind).join("+"));
      }
      return deny({ status: 403, code: "ABUSE_BANNED", message: banMessage(effective[0]) });
    }

    // 3. risk
    const strikeDoc = uid ? await getStrike("uid", uid) : deviceId ? await getStrike("device", deviceId) : null;
    const risk = computeRisk(
      buildRiskInput({
        req,
        device,
        deviceId,
        ipUids24h: recentCount(ipDoc?.uids, 24),
        uidDevices24h: recentCount(uidDoc?.deviceIds, 24),
        uidAgeMinutes: uidDoc ? (Date.now() - Date.parse(uidDoc.firstSeen)) / 60000 : null,
        strikePoints: strikeDoc && Date.parse(strikeDoc.windowStart) > Date.now() - 86400_000 ? strikeDoc.points : 0,
        idConflict,
        uid,
      })
    );
    const mult = limitMultiplier(risk.level);
    const meta = { risk, deviceId, ipHash, exempt: false };

    if (risk.level === "critical") {
      await strike({ uid, deviceId, ipHash, ipMasked: maskIp(ip) }, 4, "risk_critical", risk.reasons.map((r) => r.code).join(","));
      if (monitor) return { ...base, ...meta, allowed: true };
      return { allowed: false, status: 403, code: "ABUSE_BLOCKED", message: "This request was blocked by Audityxe's abuse protection. If you're a real user, contact support.", ...meta };
    }

    // 4. rate limits (risk-scaled)
    const cfg = LIMITS[opts.route];
    const checks: { key: string; limit: number; win: number }[] = [];
    for (const [l, w] of cfg.ip) checks.push({ key: `${opts.route}:ip:${ipHash}:${w}`, limit: Math.max(1, Math.floor(l * mult)), win: w });
    if (deviceId) for (const [l, w] of cfg.device) checks.push({ key: `${opts.route}:dev:${deviceId}:${w}`, limit: Math.max(1, Math.floor(l * mult)), win: w });
    if (uid) for (const [l, w] of cfg.uid) checks.push({ key: `${opts.route}:uid:${uid}:${w}`, limit: Math.max(1, Math.floor(l * mult)), win: w });

    const results = await Promise.all(checks.map((c) => rlConsume(c.key, c.limit, c.win)));
    const hit = results.find((r) => !r.allowed);
    if (hit) {
      strike({ uid, deviceId, ipHash, ipMasked: maskIp(ip) }, 1, "rate_limited", `${opts.route} ${hit.count}/${hit.limit}`).catch(() => {});
      if (!monitor) {
        return { allowed: false, status: 429, code: "RATE_LIMITED", message: `You're going too fast. Try again in ${hit.retryAfterSec}s.`, retryAfterSec: hit.retryAfterSec, ...meta };
      }
    }

    if (risk.level !== "low" && device && device.lastRiskLevel !== risk.level) {
      setDeviceRiskLevel(deviceId as string, risk.level).catch(() => {});
      logEvent({ type: "risk_" + risk.level, severity: risk.level === "high" ? "high" : "warn", uid, deviceId, ipHash, ipMasked: maskIp(ip), score: risk.score, details: risk.reasons.map((r) => `${r.code}+${r.points}`).join(" ") }).catch(() => {});
    }
    return { ...base, ...meta };
  } catch (err) {
    console.error("[abuse] gate failed open:", err);
    return base;
  }
}

// ---- device-bound trial ----------------------------------------------------------------

export interface TrialDecision {
  allowed: boolean;
  status?: number;
  code?: string;
  message?: string;
  result?: TrialResult;
}

/** Free-plan "trial" quota bound to the device, the fingerprint+IP combo
 * and (loosely) the IP — creating more accounts on the same device or
 * clearing storage does NOT multiply the free audits. Paid plans, admins
 * and API-key traffic (IP bucket only) are handled by the caller. */
export async function consumeDeviceTrial(req: NextRequest, gate: AbuseDecision, opts: { viaApiKey?: boolean }): Promise<TrialDecision> {
  if (abuseMode() !== "enforce" || gate.exempt) return { allowed: true };
  try {
    const free = PLANS.free.dailyAudits;
    let comboKey: string | null = null;
    if (gate.deviceId) {
      const snap = await col.devices().doc(gate.deviceId).get();
      const fp = (snap.data() as DeviceDoc | undefined)?.fpHash;
      if (fp) comboKey = hashFp(`${fp}|${gate.ipHash}`);
    }
    if (!opts.viaApiKey && !gate.deviceId) {
      return {
        allowed: false,
        status: 403,
        code: "DEVICE_REQUIRED",
        message: "We couldn't verify this browser. Make sure cookies/JavaScript aren't blocked for this site, reload the page, and try again.",
      };
    }
    const result = await consumeTrial(
      { device: opts.viaApiKey ? null : gate.deviceId, combo: opts.viaApiKey ? null : comboKey, ip: gate.ipHash },
      { device: free, combo: free, ip: free * 3 }
    );
    if (!result.allowed) {
      await logEvent({ type: "trial_limit", severity: "info", deviceId: gate.deviceId, ipHash: gate.ipHash, details: `denied by ${result.deniedBy}` });
      return {
        allowed: false,
        status: 429,
        code: "TRIAL_DEVICE_LIMIT",
        message: `This ${result.deniedBy === "ip" ? "network" : "device"} has already used its ${free} free audits today (free audits are shared across accounts). Upgrade for more, or come back after midnight UTC.`,
        result,
      };
    }
    return { allowed: true, result };
  } catch (err) {
    console.error("[abuse] trial check failed open:", err);
    return { allowed: true };
  }
}

export async function refundDeviceTrial(t: TrialDecision | null | undefined): Promise<void> {
  if (t?.result) await refundTrial(t.result);
}

/** Strike for a concrete bad action (e.g. probing internal addresses). */
export async function reportAbuse(req: NextRequest, identity: Identity | null, type: string, points: number, detail?: string): Promise<void> {
  if (abuseMode() === "off" || isExemptIdentity(identity)) return;
  const ip = clientIp(req);
  const deviceId = verifyDeviceToken(readDeviceCookie(req))?.deviceId || null;
  await strike({ uid: identity?.uid || null, deviceId, ipHash: hashIp(ipSubject(ip)), ipMasked: maskIp(ip) }, points, type, detail);
}

// ---- device registration (called by the browser collector) ------------------------------------

export interface RegisterPayload {
  clientId?: unknown;
  fpHash?: unknown;
  parts?: unknown;
  bot?: unknown;
  ua?: unknown;
  langs?: unknown;
  tz?: unknown;
  tampered?: unknown;
}

const HEX = /^[a-f0-9]{16,64}$/;

export interface RegisterResult {
  deviceId: string;
  setCookie: string;
  blocked: { message: string; until: string | null } | null;
  risk: RiskResult | null;
}

export async function registerDevice(req: NextRequest, identity: Identity | null, body: RegisterPayload): Promise<RegisterResult> {
  const ip = clientIp(req);
  const ipHash = hashIp(ipSubject(ip));
  const exempt = isExemptIdentity(identity);

  const parts: Record<string, string> = {};
  if (body.parts && typeof body.parts === "object") {
    for (const [k, v] of Object.entries(body.parts as Record<string, unknown>).slice(0, 12)) {
      if (/^[a-z]{2,12}$/.test(k) && typeof v === "string" && HEX.test(v)) parts[k] = v;
    }
  }
  const fpHash = typeof body.fpHash === "string" && HEX.test(body.fpHash) ? hashFp(body.fpHash) : null;
  const clientBot = Array.isArray(body.bot) ? (body.bot as unknown[]).filter((b): b is string => typeof b === "string" && /^[a-z_]{2,32}$/.test(b)).slice(0, 15) : [];
  if (body.tampered === true && !clientBot.includes("tampered_apis")) clientBot.push("tampered_apis");
  const declaredUa = typeof body.ua === "string" ? body.ua.slice(0, 300) : "";
  const declaredLangs = Array.isArray(body.langs) ? (body.langs as unknown[]).filter((l): l is string => typeof l === "string").slice(0, 5).join(",") : "";
  const tz = typeof body.tz === "string" ? body.tz.slice(0, 64) : "";
  const country = requestCountry(req);
  const serverUa = req.headers.get("user-agent") || "";

  // --- resolve the device id. Server-minted ids only; a client-supplied
  // id is honoured only if the signed cookie agrees OR the id exists and
  // its stored hardware/browser parts substantially match (so one person
  // can't adopt someone else's id by guessing/forging it).
  const cookieId = verifyDeviceToken(readDeviceCookie(req))?.deviceId || null;
  const clientId = isDeviceId(body.clientId) ? body.clientId : null;
  const flags: string[] = [];
  let deviceId: string | null = cookieId;
  let isReset = false;

  if (cookieId && clientId && cookieId !== clientId) flags.push("id_conflict");
  if (!deviceId && clientId) {
    const existing = (await col.devices().doc(clientId).get()).data() as DeviceDoc | undefined;
    if (existing) {
      const keys = Object.keys(parts);
      const matches = keys.filter((k) => existing.parts?.[k] === parts[k]).length;
      if (matches >= Math.min(4, Math.max(1, keys.length))) {
        deviceId = clientId;
        isReset = true; // cookie was gone but storage survived
      } else flags.push("forged_or_foreign_id");
    }
  }
  if (!deviceId) {
    const { randomBytes } = await import("crypto");
    deviceId = randomBytes(16).toString("hex");
    if (clientId) isReset = true; // had an id, it was rejected → treated as new
  }

  if (declaredUa && serverUa && declaredUa.slice(0, 120) !== serverUa.slice(0, 120)) flags.push("ua_mismatch");
  if (declaredLangs && !sameLang(declaredLangs, req.headers.get("accept-language") || "")) flags.push("lang_mismatch");

  // same fingerprint, many device ids in 24h → clearing storage to dodge limits
  if (fpHash) {
    const fpSnap = await col.fps().doc(fpHash).get();
    const others = Object.entries(((fpSnap.data() as { deviceIds?: Record<string, string> } | undefined)?.deviceIds) || {}).filter(
      ([id, at]) => id !== deviceId && Date.parse(at) > Date.now() - 86400_000
    );
    if (others.length >= 2) flags.push("fp_multi_device");
  }

  const state = await upsertGraph({
    deviceId,
    fpHash,
    parts,
    uid: identity?.uid || null,
    ipHash,
    ipMasked: maskIp(ip),
    country,
    adminSeen: exempt,
    ua: serverUa,
    tz,
    flags,
    botSignals: clientBot,
    isReset,
  });

  if (!exempt && state.previousCountry && country && state.previousCountry.cc !== country && Date.now() - Date.parse(state.previousCountry.at) < 3600_000) {
    flags.push("country_hop");
    await col.devices().doc(deviceId).set({ flags: Array.from(new Set([...state.device.flags, "country_hop"])).slice(-20) }, { merge: true });
    state.device.flags = Array.from(new Set([...state.device.flags, "country_hop"]));
  }

  const setCookie = deviceCookieHeader(deviceId);
  if (exempt || abuseMode() === "off") return { deviceId, setCookie, blocked: null, risk: null };

  // account farming signal on a freshly linked uid
  if (identity && state.newLink && Object.keys(state.device.uids).length >= 6) {
    await strike({ uid: identity.uid, deviceId, ipHash, ipMasked: maskIp(ip) }, 3, "multi_account_farm", `${Object.keys(state.device.uids).length} accounts on device`);
  }

  const bans = await getActiveBans([
    { kind: "uid", key: identity?.uid },
    { kind: "device", key: deviceId },
    { kind: "ip", key: ipHash },
    { kind: "fp", key: state.device.fpHash },
  ]);
  const effective = bans.filter((b) => !(b.kind === "device" && state.device.adminSeen) && !(b.kind === "ip" && state.ip.adminSeen));

  let blocked: RegisterResult["blocked"] = null;
  if (effective.length && abuseMode() === "enforce") {
    const b = effective[0];
    if (identity) {
      blocked = { message: banMessage(b), until: b.until };
      if (!effective.some((x) => x.kind === "uid")) {
        await strike({ uid: identity.uid, deviceId, ipHash, ipMasked: maskIp(ip) }, 12, "ban_evasion", effective.map((x) => x.kind).join("+"));
        await noteUidModerated(identity.uid);
      }
    }
  }

  const strikeDoc = identity ? await getStrike("uid", identity.uid) : null;
  const risk = computeRisk(
    buildRiskInput({
      req,
      device: state.device,
      deviceId,
      ipUids24h: recentCount(state.ip.uids, 24),
      uidDevices24h: recentCount(state.uidDoc?.deviceIds, 24),
      uidAgeMinutes: state.uidDoc ? (Date.now() - Date.parse(state.uidDoc.firstSeen)) / 60000 : null,
      strikePoints: strikeDoc && Date.parse(strikeDoc.windowStart) > Date.now() - 86400_000 ? strikeDoc.points : 0,
      idConflict: flags.includes("id_conflict"),
      uid: identity?.uid || null,
    })
  );
  if (risk.level !== "low" && state.device.lastRiskLevel !== risk.level) {
    await setDeviceRiskLevel(deviceId, risk.level);
    await logEvent({ type: "risk_" + risk.level, severity: risk.level === "medium" ? "warn" : "high", uid: identity?.uid, deviceId, ipHash, ipMasked: maskIp(ip), score: risk.score, details: risk.reasons.map((r) => `${r.code}+${r.points}`).join(" ") });
  }
  return { deviceId, setCookie, blocked, risk };
}
