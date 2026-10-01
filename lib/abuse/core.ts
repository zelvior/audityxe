import { createHash, createHmac, timingSafeEqual } from "crypto";
import type { NextRequest } from "next/server";
import { isAdminEmail } from "../admin-email";

/**
 * Abuse-protection core: config, hashing, IP extraction, signed device
 * tokens. Everything stored about a device or IP is an HMAC — raw IPs and
 * raw fingerprint components never touch Firestore (only a masked IP for
 * the admin panel's display).
 *
 * ABUSE_MODE: "enforce" (default) | "monitor" (score + log, never block)
 *             | "off" (everything bypassed).
 */
export type AbuseMode = "enforce" | "monitor" | "off";

export function abuseMode(): AbuseMode {
  const m = (process.env.ABUSE_MODE || "enforce").toLowerCase();
  return m === "monitor" || m === "off" ? m : "enforce";
}

let warned = false;
function secret(): string {
  const s =
    process.env.ABUSE_HASH_SECRET ||
    process.env.BYOK_ENCRYPTION_KEY ||
    process.env.FIREBASE_PRIVATE_KEY ||
    "";
  if (!s) {
    if (!warned) {
      console.warn("[abuse] ABUSE_HASH_SECRET not set — using an insecure dev-only secret. Set it in production.");
      warned = true;
    }
    return "audityxe-dev-only-abuse-secret";
  }
  return s;
}

export function hmac(namespace: string, value: string): string {
  return createHmac("sha256", secret()).update(`${namespace}:${value}`).digest("hex").slice(0, 40);
}

export const hashIp = (ipKey: string) => hmac("ip", ipKey);
export const hashFp = (fp: string) => hmac("fp", fp);

/** Real client IP. Vercel's own headers first (they can't be spoofed by
 * the client — the platform overwrites them), then the generic proxy
 * chain's *first* hop. */
export function clientIp(req: NextRequest | Request): string {
  const h = req.headers;
  const raw =
    h.get("x-vercel-forwarded-for") ||
    h.get("cf-connecting-ip") ||
    h.get("x-real-ip") ||
    h.get("x-forwarded-for")?.split(",")[0] ||
    "";
  const ip = raw.trim().toLowerCase();
  return ip || "unknown";
}

/** Rate-limit subject for an IP: IPv4 as-is; IPv6 collapsed to its /64
 * (a single subscriber normally owns a whole /64, so per-address limits
 * would be trivially bypassed by rotating inside it). */
export function ipSubject(ip: string): string {
  if (!ip.includes(":")) return ip;
  if (ip.startsWith("::ffff:") && ip.includes(".")) return ip.slice(7); // IPv4-mapped
  const expanded = expandIpv6(ip);
  return expanded ? expanded.split(":").slice(0, 4).join(":") + "::/64" : ip;
}

function expandIpv6(ip: string): string | null {
  const clean = ip.split("%")[0];
  const halves = clean.split("::");
  if (halves.length > 2) return null;
  const head = halves[0] ? halves[0].split(":") : [];
  const tail = halves.length === 2 && halves[1] ? halves[1].split(":") : [];
  const missing = 8 - head.length - tail.length;
  if (halves.length === 1 ? head.length !== 8 : missing < 0) return null;
  const groups = [...head, ...Array(halves.length === 2 ? missing : 0).fill("0"), ...tail];
  if (groups.length !== 8 || groups.some((g) => !/^[0-9a-f]{1,4}$/.test(g))) return null;
  return groups.map((g) => g.padStart(4, "0")).join(":");
}

/** Display-only masked IP for the admin panel. */
export function maskIp(ip: string): string {
  if (ip === "unknown") return ip;
  if (ip.includes(":")) {
    const e = expandIpv6(ip);
    return e ? `${e.split(":").slice(0, 3).join(":")}:****` : "ipv6";
  }
  const p = ip.split(".");
  return p.length === 4 ? `${p[0]}.${p[1]}.${p[2]}.x` : ip;
}

export function requestCountry(req: NextRequest | Request): string | null {
  return req.headers.get("x-vercel-ip-country") || req.headers.get("cf-ipcountry") || null;
}

// ---- signed device token (HttpOnly cookie "ax_dtk") --------------------

export const DEVICE_COOKIE = "ax_dtk";
const TOKEN_MAX_AGE_SEC = 60 * 60 * 24 * 730; // 2 years

export function signDeviceToken(deviceId: string, issuedAt = Math.floor(Date.now() / 1000)): string {
  const body = `${deviceId}.${issuedAt}`;
  const sig = createHmac("sha256", secret()).update(`dtk:${body}`).digest("hex").slice(0, 32);
  return `${body}.${sig}`;
}

export function verifyDeviceToken(token: string | null | undefined): { deviceId: string; issuedAt: number } | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [deviceId, iat, sig] = parts;
  if (!isDeviceId(deviceId) || !/^\d{9,11}$/.test(iat)) return null;
  const expected = createHmac("sha256", secret()).update(`dtk:${deviceId}.${iat}`).digest("hex").slice(0, 32);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  const issuedAt = Number(iat);
  if (Date.now() / 1000 - issuedAt > TOKEN_MAX_AGE_SEC) return null;
  return { deviceId, issuedAt };
}

export function isDeviceId(v: unknown): v is string {
  return typeof v === "string" && /^[a-f0-9]{32}$/.test(v);
}

export function readDeviceCookie(req: NextRequest | Request): string | null {
  const cookie = req.headers.get("cookie") || "";
  const m = cookie.match(new RegExp(`(?:^|;\\s*)${DEVICE_COOKIE}=([^;]+)`));
  return m ? decodeURIComponent(m[1]) : null;
}

export function deviceCookieHeader(deviceId: string): string {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${DEVICE_COOKIE}=${encodeURIComponent(signDeviceToken(deviceId))}; Path=/; Max-Age=${TOKEN_MAX_AGE_SEC}; HttpOnly; SameSite=Lax${secure}`;
}

export function sha256(s: string): string {
  return createHash("sha256").update(s).digest("hex");
}

// ---- admin exemption ----------------------------------------------------

/** Admin accounts are exempt from every abuse control: no scoring, no
 * rate limits, no quotas, no strikes, no bans. Requires a *verified*
 * email on the ADMIN_EMAILS allowlist. */
export function isExemptIdentity(identity: { email: string | null; emailVerified?: boolean } | null | undefined): boolean {
  return !!identity && identity.emailVerified !== false && isAdminEmail(identity.email);
}
