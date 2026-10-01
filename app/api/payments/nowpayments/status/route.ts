import { NextRequest, NextResponse } from "next/server";
import { requireAuth, AuthError } from "@/lib/auth-server";
import { adminDb } from "@/lib/firebase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 15;

/**
 * Live status for the /payment/status thank-you page to poll.
 *
 * Deliberately does NOT call the NOWPayments API directly from here —
 * everything this needs is already recorded by the IPN webhook in
 * Firestore the moment a payment actually completes, so polling our
 * own database is faster, doesn't spend NOWPayments API quota on every
 * page refresh, and never risks leaking the API key to a code path
 * that doesn't strictly need it.
 *
 * order_id encodes the uid it belongs to (see lib/nowpayments.ts), so
 * this only ever returns a match for the SIGNED-IN caller's own
 * order — one account can't poll another's payment status.
 */
export async function GET(req: NextRequest) {
  try {
    const identity = await requireAuth(req);
    const orderId = req.nextUrl.searchParams.get("order_id");
    if (!orderId) return NextResponse.json({ error: "Missing order_id." }, { status: 400 });

    const [ownerUid, plan] = orderId.split(":");
    if (ownerUid !== identity.uid) {
      return NextResponse.json({ error: "This order doesn't belong to your account." }, { status: 403 });
    }

    const db = adminDb();
    const snap = await db.collection("crypto_payments").where("orderId", "==", orderId).limit(1).get();

    if (snap.empty) {
      // The IPN callback simply hasn't arrived yet — this is the normal
      // state for the first several seconds to minutes after checkout,
      // not an error.
      return NextResponse.json({ status: "pending", plan: plan || null });
    }

    const payment = snap.docs[0].data();
    return NextResponse.json({
      status: payment.credited ? "credited" : "pending",
      plan: payment.plan || plan || null,
      amountUsd: payment.amountUsd ?? null,
      creditedAt: payment.creditedAt ?? null,
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: "Sign in to check payment status." }, { status: 401 });
    }
    return NextResponse.json({ error: "Couldn't check payment status." }, { status: 502 });
  }
}
