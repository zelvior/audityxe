import { NextRequest, NextResponse } from "next/server";
import { requireAuth, AuthError } from "@/lib/auth-server";
import { ensureUserDoc, getUsageSnapshot } from "@/lib/rate-limit";
import { isAdminIdentity } from "@/lib/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const identity = await requireAuth(req);
    await ensureUserDoc(identity);
    const usage = await getUsageSnapshot(identity.uid);
    // isAdminIdentity() only checks the ADMIN_EMAILS allowlist (no
    // password) — safe to expose as a plain boolean, purely so the
    // account page can decide whether to even show the Admin Dashboard
    // link. The actual admin gate (email allowlist + ADMIN_PASSWORD) is
    // still fully enforced server-side on every /api/admin/* route
    // regardless of what this returns — this boolean only controls
    // whether a non-admin sees the link at all, not whether they could
    // get past it.
    return NextResponse.json({ ...usage, isAdmin: isAdminIdentity(identity) });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.status });
    }
    const message = err instanceof Error ? err.message : "Failed to load account.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
