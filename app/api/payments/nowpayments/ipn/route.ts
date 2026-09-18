import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { verifyIpnSignature, isPaidStatus, parseOrderId, PAID_PLANS } from "@/lib/nowpayments";

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
  // Acknowledge non-terminal statuses (waiting/confirming/sending) with
  // a 200 so NOWPayments stops retrying them — they're informational,
  // not something to act on.
  if (!isPaidStatus(status)) return NextResponse.json({ ok: true, ignored: status });

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
  if (!order) return NextResponse.json({ error: "Unrecognized order." }, { status: 400 });

  const paymentId = String(payload.payment_id ?? payload.invoice_id ?? "");
  if (!paymentId) return NextResponse.json({ error: "Missing payment id." }, { status: 400 });

  const paymentRef = db.collection("crypto_payments").doc(paymentId);
  const userRef = db.collection("users").doc(order.uid);
  const grant = PAID_PLANS[order.plan];

  try {
    await db.runTransaction(async (tx) => {
      const existing = await tx.get(paymentRef);
      if (existing.exists && existing.data()?.credited) return; // already handled

      const userSnap = await tx.get(userRef);
      const currentExpiry = userSnap.data()?.planExpiresAt;
      const now = new Date();
      // Stack onto remaining time rather than overwriting it, so paying
      // again before expiry extends access instead of throwing away
      // days the person already paid for.
      const base = currentExpiry && new Date(currentExpiry) > now ? new Date(currentExpiry) : now;
      const newExpiry = new Date(base.getTime() + grant.days * 24 * 60 * 60 * 1000);

      tx.set(userRef, { plan: order.plan, planExpiresAt: newExpiry.toISOString() }, { merge: true });
      tx.set(paymentRef, {
        credited: true,
        uid: order.uid,
        plan: order.plan,
        status,
        amountUsd: grant.usd,
        orderId: String(payload.order_id ?? ""),
        subscriptionId,
        creditedAt: now.toISOString(),
      });
    });
    return NextResponse.json({ ok: true });
  } catch {
    // Return 500 so NOWPayments retries — a transient Firestore failure
    // must not silently swallow a real payment.
    return NextResponse.json({ error: "Could not record payment." }, { status: 500 });
  }
}
