import { NextRequest, NextResponse } from "next/server";
import { requireAuth, AuthError } from "@/lib/auth-server";
import { redeemDiscountCode } from "@/lib/discount-codes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const identity = await requireAuth(req);
    const body = await req.json().catch(() => ({}));
    const code = typeof body?.code === "string" ? body.code.slice(0, 64) : "";

    const result = await redeemDiscountCode(identity.uid, code);
    if (!result.ok) {
      return NextResponse.json({ error: result.error || "Invalid code." }, { status: 400 });
    }

    return NextResponse.json({ plan: result.plan, planExpiresAt: result.planExpiresAt });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.status });
    }
    const message = err instanceof Error ? err.message : "Failed to redeem code.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
