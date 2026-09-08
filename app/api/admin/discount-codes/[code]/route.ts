import { NextRequest, NextResponse } from "next/server";
import { requireAuth, AuthError } from "@/lib/auth-server";
import { requireAdmin } from "@/lib/admin";
import { setDiscountCodeActive, deleteDiscountCode } from "@/lib/discount-codes";
import { logAdminAction } from "@/lib/admin-log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, { params }: { params: { code: string } }) {
  try {
    const identity = await requireAuth(req, { requireEmailVerified: true });
    await requireAdmin(identity, req);
    const body = await req.json().catch(() => ({}));
    const active = body?.active !== false;
    await setDiscountCodeActive(params.code, active);
    await logAdminAction(identity.email || "unknown", active ? "enable_discount_code" : "disable_discount_code", params.code);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.status });
    }
    const message = err instanceof Error ? err.message : "Failed to update code.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { code: string } }) {
  try {
    const identity = await requireAuth(req, { requireEmailVerified: true });
    await requireAdmin(identity, req);
    await deleteDiscountCode(params.code);
    await logAdminAction(identity.email || "unknown", "delete_discount_code", params.code);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.status });
    }
    const message = err instanceof Error ? err.message : "Failed to delete code.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
