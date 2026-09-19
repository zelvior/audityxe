import { NextRequest, NextResponse } from "next/server";
import { requireAuth, AuthError } from "@/lib/auth-server";
import { createInvoice, nowPaymentsConfigError, PAID_PLANS } from "@/lib/nowpayments";
import { SITE_URL } from "@/lib/seo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const configError = nowPaymentsConfigError();
    if (configError) {
      return NextResponse.json({ error: configError }, { status: 503 });
    }

    const identity = await requireAuth(req);
    const body = await req.json().catch(() => ({}));
    const plan: unknown = body?.plan;

    // Only ever price from the server-side table — never trust a price
    // or duration sent by the client.
    if (plan !== "standard" && plan !== "pro") {
      return NextResponse.json({ error: "Unknown plan." }, { status: 400 });
    }

    const invoice = await createInvoice({ plan, uid: identity.uid, siteUrl: SITE_URL });
    return NextResponse.json({ invoiceUrl: invoice.invoiceUrl, amountUsd: PAID_PLANS[plan].usd });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: "Sign in to upgrade." }, { status: 401 });
    }

    // createInvoice's own errors (see describeNowPaymentsError in
    // lib/nowpayments.ts) are deliberately detailed — dashboard-setting
    // names, which of three causes applies — because that detail is
    // exactly what whoever configured this deployment needs to fix a
    // misconfigured NOWPayments account. That's operator information,
    // not something a paying customer should see on a checkout button:
    // it exposes internal dashboard structure to any visitor and reads
    // as a confusing wall of setup instructions to someone just trying
    // to pay. So it's logged here, in full, for whoever has server log
    // access — and the customer gets a short, generic, still-actionable
    // message pointing at the fallback payment path that already exists
    // on this page (the manual "pay another way" email flow).
    const detail = err instanceof Error ? err.message : String(err);
    console.error("[nowpayments/create] invoice creation failed:", detail);

    return NextResponse.json(
      { error: "Crypto checkout is temporarily unavailable. Please try again shortly, or use the email payment option below." },
      { status: 502 }
    );
  }
}
