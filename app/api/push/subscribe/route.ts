import { NextRequest, NextResponse } from "next/server";
import { requireAuth, AuthError } from "@/lib/auth-server";
import { savePushSubscription, isPushConfigured, StoredPushSubscription } from "@/lib/push";
import { isTrustedOrigin } from "@/lib/security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Registers the signed-in account's browser for audit-complete Web Push
 * notifications. Notifications are required (enabled during onboarding,
 * re-synced on every sign-in by components/PushGate.tsx), so this is
 * account-level and idempotent — not a per-audit opt-in.
 */
export async function POST(req: NextRequest) {
  if (!isTrustedOrigin(req)) {
    return NextResponse.json({ error: "Cross-site request rejected." }, { status: 403 });
  }

  if (!isPushConfigured()) {
    return NextResponse.json(
      { error: "Push notifications aren't configured on this server yet.", code: "PUSH_NOT_CONFIGURED" },
      { status: 503 }
    );
  }

  let identity;
  try {
    identity = await requireAuth(req);
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.status });
    }
    return NextResponse.json({ error: "Authentication failed." }, { status: 401 });
  }

  let body: { subscription?: StoredPushSubscription };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const subscription = body.subscription;
  if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
    return NextResponse.json({ error: "Missing subscription." }, { status: 400 });
  }
  if (typeof subscription.endpoint !== "string" || !/^https:\/\//.test(subscription.endpoint) || subscription.endpoint.length > 2048) {
    return NextResponse.json({ error: "Invalid subscription endpoint." }, { status: 400 });
  }

  await savePushSubscription(identity.uid, subscription);
  return NextResponse.json({ ok: true });
}
