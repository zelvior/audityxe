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
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Couldn't start checkout." },
      { status: 502 }
    );
  }
}
