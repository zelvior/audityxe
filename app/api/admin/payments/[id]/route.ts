import { NextRequest, NextResponse } from "next/server";
import { adminGate, adminFail } from "@/lib/admin-api";
import { adminDb } from "@/lib/firebase/admin";
import { logAdminAction } from "@/lib/admin-log";
import { PERIOD_DAYS, creditPayment, refundPayment, revokeRefundedAccess, setPaymentNote, toPayment } from "@/lib/payments";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ACTIONS = ["refund", "revoke-access", "credit", "note"] as const;

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const identity = await adminGate(req);
    const id = decodeURIComponent(params.id || "").trim().slice(0, 200);
    if (!id) return NextResponse.json({ error: "Missing payment id." }, { status: 400 });
    const body = await req.json().catch(() => ({}));
    const action = ACTIONS.find((a) => a === body?.action);
    if (!action) return NextResponse.json({ error: "Invalid action." }, { status: 400 });
    const actor = identity.email || "admin";
    const db = adminDb();
    let detail: string | null = null;

    if (action === "refund") {
      const amount = body?.amountUsd === undefined || body.amountUsd === "" ? undefined : Number(body.amountUsd);
      const r = await refundPayment(db, { paymentId: id, amountUsd: amount, reason: typeof body?.reason === "string" ? body.reason : "", revokeAccess: body?.revokeAccess === true, actor });
      if (!r.ok) return NextResponse.json({ error: r.error }, { status: 400 });
      detail = `refund ${amount ?? "full"}${r.revoked ? ", access revoked" : ""}`;
    } else if (action === "revoke-access") {
      const r = await revokeRefundedAccess(db, id, actor);
      if (!r.ok) return NextResponse.json({ error: r.error }, { status: 400 });
      detail = r.revoked ? "access revoked" : "nothing to revoke";
    } else if (action === "credit") {
      // Manual credit for a payment that really succeeded but wasn't credited (missed/failed IPN).
      const snap = await db.collection("crypto_payments").doc(id).get();
      if (!snap.exists) return NextResponse.json({ error: "Payment not found." }, { status: 404 });
      const p = toPayment(id, snap.data() as Record<string, unknown>);
      if (!p.uid || (p.plan !== "standard" && p.plan !== "pro")) return NextResponse.json({ error: "This record has no account/plan to credit." }, { status: 400 });
      const r = await creditPayment(db, { paymentId: id, uid: p.uid, plan: p.plan, status: "finished", amountUsd: p.amountUsd, orderId: p.orderId, subscriptionId: p.subscriptionId, days: PERIOD_DAYS, manualBy: actor });
      if (r !== "credited") return NextResponse.json({ error: r === "already" ? "Already credited." : "This payment was refunded; it can't be credited." }, { status: 400 });
      detail = `manually credited ${p.plan} to ${p.uid}`;
    } else {
      const ok = await setPaymentNote(db, id, typeof body?.note === "string" ? body.note : null, typeof body?.dismissed === "boolean" ? body.dismissed : undefined);
      if (!ok) return NextResponse.json({ error: "Payment not found." }, { status: 404 });
      detail = body?.dismissed === true ? "dismissed" : "note";
    }
    await logAdminAction(actor, `payment_${action.replace(/-/g, "_")}`, id, detail);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return adminFail(err, "Payment action failed.", 400);
  }
}
