import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { verifyIpnSignature, isPaidStatus, parseOrderId, PAID_PLANS } from "@/lib/nowpayments";
import { FAILURE_STATUSES, creditPayment, recordNonCredited } from "@/lib/payments";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * NOWPayments IPN (instant payment notification) webhook.
 *
 * Two things matter here above all else:
 *  1. The signature is verified against the RAW request body. Re-
 *     serializing a parsed object first can reorder or reformat keys
 *     and silently break verification, so the raw text is read once and
 *     parsed only after it's been proven authentic.
 *  2. Crediting is idempotent. NOWPayments can and does retry the same
 *     notification, and a payment moves through several statuses before
 *     settling — so the payment id is recorded and re-processing the
 *     same one is a no-op rather than stacking extra paid days.
 */
export async function POST(req: NextRequest) {
  const raw = await req.text();
  const signature = req.headers.get("x-nowpayments-sig");

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Malformed payload." }, { status: 400 });
  }

  if (!verifyIpnSignature(payload, signature)) {
    // Deliberately terse: never tell an unauthenticated caller whether
    // the secret is missing, the signature was malformed, or it simply
    // didn't match.
    return NextResponse.json({ error: "Invalid signature." }, { status: 401 });
  }

  const status = String(payload.payment_status ?? "");
  const tracked = FAILURE_STATUSES.has(status);
  // Acknowledge non-terminal statuses (waiting/confirming/sending) with
  // a 200 so NOWPayments stops retrying them — they're informational,
  // not something to act on. Failed/expired/partial/refunded ones are
  // recorded (never credited) so an admin can see and act on them.
  if (!isPaidStatus(status) && !tracked) return NextResponse.json({ ok: true, ignored: status });

  const db = adminDb();

  // One-off invoices always carry our own "uid:plan:timestamp" order_id
  // (see createInvoice), which parses directly. Subscription-driven
  // renewals are billed automatically by NOWPayments itself rather than
  // created fresh by this app each time, and are not guaranteed to carry
  // that same order_id shape — so when direct parsing fails, fall back to
  // the subscription_id (recorded against the account at subscribe time
  // in the subscribe route) before giving up. Without this fallback, a
  // real, successfully paid subscription renewal would be silently
  // rejected as an "unrecognized order" and never credited.
  let order = parseOrderId(payload.order_id);
  let subscriptionId: string | null = null;
  if (!order) {
    subscriptionId =
      (typeof payload.subscription_id === "string" && payload.subscription_id) ||
      (typeof payload.parent_payment_id === "string" && payload.parent_payment_id) ||
      null;
    if (subscriptionId) {
      const ownerSnap = await db.collection("subscription_owners").doc(subscriptionId).get();
      const owner = ownerSnap.data();
      if (owner?.uid && (owner.plan === "standard" || owner.plan === "pro")) {
        order = { uid: owner.uid, plan: owner.plan };
      }
    }
  }
  if (!order) {
    // A failure we can't attribute to an account is just acknowledged; an
    // unattributable PAID notification stays an error so it's retried/noticed.
    return tracked ? NextResponse.json({ ok: true, ignored: status }) : NextResponse.json({ error: "Unrecognized order." }, { status: 400 });
  }

  const paymentId = String(payload.payment_id ?? payload.invoice_id ?? "");
  if (!paymentId) return NextResponse.json({ error: "Missing payment id." }, { status: 400 });

  const grant = PAID_PLANS[order.plan];
  const invoiced = Number(payload.price_amount);
  const amountUsd = Number.isFinite(invoiced) && invoiced > 0 ? invoiced : grant.usd;
  const base = { paymentId, plan: order.plan, status, amountUsd, orderId: String(payload.order_id ?? ""), subscriptionId };

  try {
    if (!isPaidStatus(status)) {
      await recordNonCredited(db, { ...base, uid: order.uid });
      return NextResponse.json({ ok: true, recorded: status });
    }
    // Idempotent: creditPayment is a no-op if this payment id was already credited.
    await creditPayment(db, { ...base, uid: order.uid, plan: order.plan, days: grant.days });
    return NextResponse.json({ ok: true });
  } catch {
    // Return 500 so NOWPayments retries — a transient Firestore failure
    // must not silently swallow a real payment.
    return NextResponse.json({ error: "Could not record payment." }, { status: 500 });
  }
}
