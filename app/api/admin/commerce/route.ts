import { NextRequest, NextResponse } from "next/server";
import { adminGate, adminFail } from "@/lib/admin-api";
import { adminDb } from "@/lib/firebase/admin";
import { logAdminAction } from "@/lib/admin-log";
import { getCommerce, saveCommerce } from "@/lib/payments";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await adminGate(req);
    return NextResponse.json({ commerce: await getCommerce(adminDb()) });
  } catch (err) {
    return adminFail(err, "Failed to load commission settings.");
  }
}

export async function PUT(req: NextRequest) {
  try {
    const identity = await adminGate(req);
    const body = await req.json().catch(() => ({}));
    const r = await saveCommerce(adminDb(), { commissionPercent: body?.commissionPercent, flatFeeUsd: body?.flatFeeUsd, label: body?.label }, identity.email || "admin");
    if (!r.ok) return NextResponse.json({ error: r.error }, { status: 400 });
    await logAdminAction(identity.email || "admin", "commission_update", null, `${r.value.commissionPercent}% + $${r.value.flatFeeUsd}`);
    return NextResponse.json({ ok: true, commerce: r.value });
  } catch (err) {
    return adminFail(err, "Failed to save commission settings.");
  }
}
