import { NextRequest } from "next/server";
import { createHash } from "crypto";

/**
 * Best-effort real client IP behind Vercel's proxy. x-forwarded-for can
 * contain a chain (client, proxy1, proxy2...) — the first entry is the
 * original client as seen by Vercel's edge.
 */
export function getClientIp(req: NextRequest): string {
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const first = forwardedFor.split(",")[0]?.trim();
    if (first) return first;
  }
  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  return "unknown";
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
