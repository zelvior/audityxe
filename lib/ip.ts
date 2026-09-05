import { NextRequest } from "next/server";
import { createHash } from "crypto";

/**
 * Best-effort real client IP behind a reverse proxy (Vercel, Cloudflare,
 * or a custom nginx front door). x-forwarded-for can contain a chain
 * (client, proxy1, proxy2...) — the first entry is the original client
 * as seen by the outermost proxy. Different platforms surface this
 * under different header names, so every common one is checked before
 * falling back to NextRequest's own `.ip` (set on Vercel's runtime) and
 * finally an "unknown" bucket.
 */
export function getClientIp(req: NextRequest): string {
  const headerChain = [
    "x-vercel-forwarded-for",
    "cf-connecting-ip",
    "true-client-ip",
    "x-forwarded-for",
    "x-real-ip",
  ];
  for (const name of headerChain) {
    const value = req.headers.get(name);
    if (value) {
      const first = value.split(",")[0]?.trim();
      if (first) return first;
    }
  }
  // NextRequest.ip is populated by Vercel's edge/node runtime even when
  // no forwarding header is present (e.g. requests hitting the app
  // directly rather than through an intermediate proxy).
  const runtimeIp = (req as unknown as { ip?: string }).ip;
  if (runtimeIp) return runtimeIp;

  // Genuinely no proxy header and no runtime IP at all — extremely rare
  // outside local dev, but bucketing every such visitor under one literal
  // "unknown" key would let one visitor's daily quota silently exhaust
  // free audits for every other unidentifiable visitor too. Mix in a
  // coarse per-client fingerprint instead so they land in different
  // (still anonymous, still unauthenticated) buckets.
  const ua = req.headers.get("user-agent") || "";
  const lang = req.headers.get("accept-language") || "";
  return `unknown:${createHash("sha256").update(`${ua}:${lang}`).digest("hex").slice(0, 16)}`;
}

/**
 * We never store a raw IP in Firestore for the anonymous quota — only a
 * salted hash, so the stored document can't be reversed to identify a
 * visitor, while still being stable enough to enforce a daily cap.
 */
export function hashIp(ip: string): string {
  const salt = process.env.IP_HASH_SALT || "audityxe-anon-quota";
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex");
}
