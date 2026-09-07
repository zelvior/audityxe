import { NextRequest, NextResponse } from "next/server";
import { requireAuth, AuthError } from "@/lib/auth-server";
import { ensureUserDoc, getUsageSnapshot } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const identity = await requireAuth(req);
    await ensureUserDoc(identity);
    const usage = await getUsageSnapshot(identity.uid);
    return NextResponse.json(usage);
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.status });
    }
    const message = err instanceof Error ? err.message : "Failed to load account.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
