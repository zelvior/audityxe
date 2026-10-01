import { NextRequest, NextResponse } from "next/server";
import { requireAuth, AuthError } from "@/lib/auth-server";
import { requireAdmin } from "@/lib/admin";
import { createRedeemCodeBatch } from "@/lib/discount-codes";
import { logAdminAction } from "@/lib/admin-log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const identity = await requireAuth(req, { requireEmailVerified: true });
    await requireAdmin(identity, req);
    const body = await req.json().catch(() => ({}));

    const codes = await createRedeemCodeBatch(Number(body?.count), {
      plan: body?.plan,
      durationDays: Number(body?.durationDays),
      expiresAt: body?.expiresAt || null,
      note: typeof body?.note === "string" ? body.note : null,
    });

    await logAdminAction(
      identity.email || "unknown",
      "bulk_create_redeem_codes",
      null,
      `${codes.length}× ${body?.plan} · ${body?.durationDays}d`
    );

    return NextResponse.json({ codes });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.status });
    }
    const message = err instanceof Error ? err.message : "Failed to generate codes.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
