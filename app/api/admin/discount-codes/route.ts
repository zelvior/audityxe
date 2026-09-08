import { NextRequest, NextResponse } from "next/server";
import { requireAuth, AuthError } from "@/lib/auth-server";
import { requireAdmin } from "@/lib/admin";
import { createDiscountCode, listDiscountCodes } from "@/lib/discount-codes";
import { logAdminAction } from "@/lib/admin-log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const identity = await requireAuth(req, { requireEmailVerified: true });
    await requireAdmin(identity, req);
    const codes = await listDiscountCodes();
    return NextResponse.json({ codes });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.status });
    }
    const message = err instanceof Error ? err.message : "Failed to list codes.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const identity = await requireAuth(req, { requireEmailVerified: true });
    await requireAdmin(identity, req);
    const body = await req.json().catch(() => ({}));

    const doc = await createDiscountCode({
      code: typeof body?.code === "string" && body.code.trim() ? body.code : undefined,
      type: body?.type === "percent_off" ? "percent_off" : "plan_grant",
      plan: body?.plan,
      durationDays: body?.durationDays != null ? Number(body.durationDays) : undefined,
      percentOff: body?.percentOff != null ? Number(body.percentOff) : undefined,
      maxRedemptions: Number(body?.maxRedemptions),
      expiresAt: body?.expiresAt || null,
      perUserOnce: body?.perUserOnce !== false,
      note: typeof body?.note === "string" ? body.note : null,
    });

    const summary =
      doc.type === "percent_off" ? `${doc.percentOff}% off ${doc.plan} · max ${doc.maxRedemptions}` : `${doc.plan} · ${doc.durationDays}d · max ${doc.maxRedemptions}`;
    await logAdminAction(identity.email || "unknown", "create_discount_code", doc.code, summary);

    return NextResponse.json({ code: doc });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.status });
    }
    const message = err instanceof Error ? err.message : "Failed to create code.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
