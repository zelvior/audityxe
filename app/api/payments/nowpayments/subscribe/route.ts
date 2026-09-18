import { NextRequest, NextResponse } from "next/server";
import { requireAuth, AuthError } from "@/lib/auth-server";
import {
  areSubscriptionsConfigured,
  createEmailSubscription,
  subscriptionPlanId,
} from "@/lib/nowpayments";
import { adminDb } from "@/lib/firebase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * Starts a recurring crypto subscription for the signed-in account.
 *
 * NOWPayments drives renewals by email: it sends a payment link now, and
 * another a day before each period ends. Every resulting payment fires
 * the same IPN webhook we already handle, and that handler is idempotent
 * and stacks paid time — so renewals credit correctly with no extra
 * bookkeeping here.
 */
export async function POST(req: NextRequest) {
  try {
    if (!areSubscriptionsConfigured()) {
      return NextResponse.json(
        { error: "Recurring crypto subscriptions aren't configured on this deployment." },
        { status: 503 }
      );
    }
    if (!process.env.NOWPAYMENTS_IPN_SECRET) {
      // Same reasoning as one-off checkout: without IPN verification the
      // webhook fails closed, so every renewal would be paid but never
      // credited. Refuse rather than take recurring money we can't honour.
      return NextResponse.json(
        { error: "Subscriptions are misconfigured (missing IPN secret) and have been disabled." },
        { status: 503 }
      );
    }

    const identity = await requireAuth(req);
    const body = await req.json().catch(() => ({}));
    const plan: unknown = body?.plan;

    if (plan !== "standard" && plan !== "pro") {
      return NextResponse.json({ error: "Unknown plan." }, { status: 400 });
    }
    if (!subscriptionPlanId(plan)) {
      return NextResponse.json(
        { error: `No subscription plan is set up for ${plan} yet.` },
        { status: 503 }
      );
    }
    if (!identity.email) {
      return NextResponse.json(
        { error: "Your account has no email address, which subscriptions require." },
        { status: 400 }
      );
    }

    const sub = await createEmailSubscription({ plan, email: identity.email });

    // NOWPayments' recurring-payment IPN callbacks are not guaranteed to
    // carry an order_id in the "uid:plan:timestamp" shape one-off
    // invoices use (subscriptions are billed automatically by NOWPayments
    // itself, not created fresh by this app each time) — so the IPN
    // handler cannot always recover which account to credit from
    // order_id alone for a renewal. Recording this mapping up front means
    // the webhook can fall back to looking up the subscription id instead,
    // rather than silently failing to credit real, paid renewals.
    if (sub.subscriptionId) {
      await adminDb()
        .collection("subscription_owners")
        .doc(sub.subscriptionId)
        .set({ uid: identity.uid, plan, email: identity.email, createdAt: new Date().toISOString() });
    }

    return NextResponse.json({
      ok: true,
      subscriptionId: sub.subscriptionId,
      message: `Check ${identity.email} — we've sent your first payment link. You'll get a new one before each renewal.`,
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: "Sign in to subscribe." }, { status: 401 });
    }
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Couldn't start the subscription." },
      { status: 502 }
    );
  }
}
