import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase/admin";
import { isTrustedOrigin } from "@/lib/security";
import { abuseMode, clientIp, hashIp, ipSubject } from "@/lib/abuse/core";
import { memBurst, rlConsume } from "@/lib/abuse/store";
import { registerDevice } from "@/lib/abuse/enforce";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY = 8 * 1024;

/**
 * Browser device registration. The client collector (lib/device-client.ts)
 * posts its fingerprint hashes + storage ids here; the server mints/
 * resolves the canonical device id, links device <-> IP <-> account in
 * the abuse graph, scores risk, and sets the signed HttpOnly device
 * cookie that every later request is checked against.
 *
 * Signed-in callers send their Firebase ID token so the account is linked
 * to the device; anonymous visitors still get a device id.
 */
export async function POST(req: NextRequest) {
  if (!isTrustedOrigin(req)) return NextResponse.json({ error: "Cross-site request rejected." }, { status: 403 });
  if (abuseMode() === "off") return NextResponse.json({ deviceId: null, disabled: true });
  if (Number(req.headers.get("content-length") || 0) > MAX_BODY) return NextResponse.json({ error: "Too large." }, { status: 413 });

  const ipHash = hashIp(ipSubject(clientIp(req)));
  if (!memBurst(`reg:${ipHash}`, 20, 60_000)) return NextResponse.json({ error: "Too many requests." }, { status: 429 });

  try {
    const rl = await rlConsume(`register:ip:${ipHash}`, 90, 3600);
    if (!rl.allowed) return NextResponse.json({ error: "Too many requests." }, { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } });
  } catch {
    /* fail open */
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  // Optional auth — a bad/expired token just means "anonymous", never a failure.
  let identity: { uid: string; email: string | null; emailVerified: boolean } | null = null;
  const header = req.headers.get("authorization");
  if (header?.startsWith("Bearer ")) {
    try {
      const d = await adminAuth().verifyIdToken(header.slice(7).trim());
      identity = { uid: d.uid, email: d.email || null, emailVerified: !!d.email_verified };
    } catch {
      identity = null;
    }
  }

  try {
    const r = await registerDevice(req, identity, body);
    const res = NextResponse.json({ deviceId: r.deviceId, blocked: r.blocked, risk: r.risk ? { level: r.risk.level } : null });
    res.headers.append("Set-Cookie", r.setCookie);
    res.headers.set("Cache-Control", "no-store");
    return res;
  } catch (err) {
    console.error("[abuse] register failed:", err);
    // Never break the site over a bookkeeping failure.
    return NextResponse.json({ deviceId: null, blocked: null, risk: null });
  }
}
