import crypto from "crypto";
import { PlanId } from "./plans";

const API_BASE = "https://api.nowpayments.io/v1";

export function isNowPaymentsConfigured(): boolean {
  return !!process.env.NOWPAYMENTS_API_KEY;
}

/**
 * Whether the integration is safe to actually take money with.
 *
 * Having an API key but no IPN secret is the single most dangerous
 * half-configured state possible here: invoices would be created and
 * customers would genuinely pay, but the webhook fails closed on every
 * callback (by design — an unverified webhook would let anyone grant
 * themselves a paid plan), so nobody would ever be credited. Better to
 * refuse to start checkout at all than to accept money we structurally
 * cannot honour.
 */
export function nowPaymentsConfigError(): string | null {
  if (!process.env.NOWPAYMENTS_API_KEY) {
    return "Crypto checkout isn't configured on this deployment yet.";
  }
  if (!process.env.NOWPAYMENTS_IPN_SECRET) {
    return "Crypto checkout is misconfigured (missing IPN secret) and has been disabled to avoid taking payments that couldn't be credited. Please use another payment method or contact support.";
  }
  return null;
}

/** Plans that can actually be purchased, with their USD price and how
 * many days of access a single payment grants. Kept server-side so a
 * tampered client can't ask for a cheaper price than the plan costs. */
export const PAID_PLANS: Record<Exclude<PlanId, "free">, { usd: number; days: number; label: string }> = {
  standard: { usd: 9, days: 30, label: "Audityxe Standard — 30 days" },
  pro: { usd: 29, days: 30, label: "Audityxe Pro — 30 days" },
};

export interface CreatedInvoice {
  invoiceUrl: string;
  invoiceId: string;
}

/**
 * Creates a NOWPayments hosted invoice and returns the URL to send the
 * customer to. We deliberately use the hosted-invoice flow rather than
 * building a direct-payment UI: NOWPayments hosts the currency picker,
 * address display, QR code, and the "waiting for confirmations" states,
 * none of which we'd gain anything from reimplementing, and it keeps
 * every wallet address off our own surface.
 */
export async function createInvoice(params: {
  plan: Exclude<PlanId, "free">;
  uid: string;
  siteUrl: string;
}): Promise<CreatedInvoice> {
  const apiKey = process.env.NOWPAYMENTS_API_KEY;
  if (!apiKey) throw new Error("NOWPAYMENTS_API_KEY is not configured.");

  const plan = PAID_PLANS[params.plan];

  // order_id carries the uid + plan so the IPN callback can credit the
  // right account without us keeping a separate pending-orders table.
  // It's echoed back verbatim by NOWPayments, and the callback that
  // reads it is HMAC-verified, so it can't be forged by a third party.
  const orderId = `${params.uid}:${params.plan}:${Date.now()}`;

  const res = await fetch(`${API_BASE}/invoice`, {
    method: "POST",
    headers: { "x-api-key": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({
      price_amount: plan.usd,
      price_currency: "usd",
      order_id: orderId,
      order_description: plan.label,
      ipn_callback_url: `${params.siteUrl}/api/payments/nowpayments/ipn`,
      success_url: `${params.siteUrl}/account?payment=success`,
      cancel_url: `${params.siteUrl}/pricing?payment=cancelled`,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`NOWPayments invoice creation failed (HTTP ${res.status}). ${body.slice(0, 300)}`);
  }

  const data = await res.json();
  if (!data?.invoice_url) throw new Error("NOWPayments did not return an invoice URL.");
  return { invoiceUrl: data.invoice_url, invoiceId: String(data.id ?? "") };
}

/** Recursively sorts object keys — NOWPayments signs the payload after
 * sorting keys at every level, so the verification side has to rebuild
 * the exact same string or every signature check fails. */
function sortObjectDeep(obj: unknown): unknown {
  if (Array.isArray(obj)) return obj.map(sortObjectDeep);
  if (obj && typeof obj === "object") {
    return Object.keys(obj as Record<string, unknown>)
      .sort()
      .reduce<Record<string, unknown>>((acc, key) => {
        acc[key] = sortObjectDeep((obj as Record<string, unknown>)[key]);
        return acc;
      }, {});
  }
  return obj;
}

/**
 * Verifies an IPN callback really came from NOWPayments: HMAC-SHA512 of
 * the deep-key-sorted JSON payload, using the IPN secret, compared
 * against the x-nowpayments-sig header.
 *
 * Without this check the callback endpoint would be an open door for
 * anyone to POST "payment finished" and grant themselves a paid plan —
 * so a missing IPN secret is treated as a hard failure rather than
 * quietly skipping verification.
 */
export function verifyIpnSignature(payload: unknown, signature: string | null): boolean {
  const secret = process.env.NOWPAYMENTS_IPN_SECRET;
  if (!secret || !signature) return false;

  const expected = crypto
    .createHmac("sha512", secret)
    .update(JSON.stringify(sortObjectDeep(payload)))
    .digest("hex");

  // Constant-time compare so the endpoint can't be used as a timing
  // oracle to brute-force a valid signature byte by byte.
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(signature, "utf8");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

/** NOWPayments statuses that mean "the money actually arrived". */
export function isPaidStatus(status: string): boolean {
  return status === "finished" || status === "confirmed";
}

export function parseOrderId(orderId: unknown): { uid: string; plan: Exclude<PlanId, "free"> } | null {
  if (typeof orderId !== "string") return null;
  const [uid, plan] = orderId.split(":");
  if (!uid || (plan !== "standard" && plan !== "pro")) return null;
  return { uid, plan };
}

/* ===========================================================================
 * Recurring payments (NOWPayments "Subscriptions")
 * ===========================================================================
 * Unlike the invoice endpoints above — which authenticate with a plain
 * x-api-key header — every subscription endpoint requires a Bearer JWT
 * minted from the merchant's dashboard login. That JWT is short-lived
 * (roughly 5 minutes), so a value pasted into an env var at deploy time
 * is expired long before it's ever used. It has to be minted on demand.
 */

const JWT_SAFETY_WINDOW_MS = 60_000; // refresh a minute before we think it dies
const JWT_ASSUMED_LIFETIME_MS = 4 * 60_000;

let cachedJwt: { token: string; expiresAt: number } | null = null;

export function areSubscriptionsConfigured(): boolean {
  return !!(
    process.env.NOWPAYMENTS_API_KEY &&
    process.env.NOWPAYMENTS_EMAIL &&
    process.env.NOWPAYMENTS_PASSWORD
  );
}

/**
 * Mints (and caches) a merchant JWT.
 *
 * Cached by wall-clock lifetime rather than by reading the token's own
 * `exp` claim: any clock skew between this server and NOWPayments makes
 * that claim unreliable, and a token believed valid but actually
 * expired fails the request it was fetched for.
 *
 * Note the x-api-key header — /v1/auth validates the merchant API key
 * *in addition to* the credentials. Without it NOWPayments rejects the
 * request outright, which is a genuinely confusing failure because the
 * credentials themselves are correct.
 */
async function getMerchantJwt(forceRefresh = false): Promise<string> {
  if (!forceRefresh && cachedJwt && Date.now() < cachedJwt.expiresAt) {
    return cachedJwt.token;
  }

  const apiKey = process.env.NOWPAYMENTS_API_KEY;
  const email = process.env.NOWPAYMENTS_EMAIL;
  const password = process.env.NOWPAYMENTS_PASSWORD;
  if (!apiKey || !email || !password) {
    throw new Error("NOWPayments subscription credentials are not configured.");
  }

  const res = await fetch(`${API_BASE}/auth`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": apiKey },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    throw new Error(
      res.status === 401
        ? "NOWPayments rejected the merchant credentials (check NOWPAYMENTS_EMAIL / NOWPAYMENTS_PASSWORD)."
        : `NOWPayments auth failed (HTTP ${res.status}).`
    );
  }

  const data = await res.json();
  if (!data?.token) throw new Error("NOWPayments auth returned no token.");

  cachedJwt = {
    token: data.token,
    expiresAt: Date.now() + JWT_ASSUMED_LIFETIME_MS - JWT_SAFETY_WINDOW_MS,
  };
  return data.token;
}

/** Authenticated subscription-API call, with a single retry on 401 —
 * the cached JWT can expire in the gap between minting and using it, and
 * one clean retry is far better than surfacing a spurious auth error. */
async function subscriptionFetch(path: string, init: RequestInit, retry = true): Promise<Response> {
  const token = await getMerchantJwt();
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      ...(init.headers || {}),
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });
  if (res.status === 401 && retry) {
    await getMerchantJwt(true);
    return subscriptionFetch(path, init, false);
  }
  return res;
}

export interface SubscriptionPlan {
  id: string;
  title: string;
  intervalDay: number;
  amount: number;
  currency: string;
}

/** Creates a recurring-payment plan. Run once per plan (or via the
 * NOWPayments dashboard) — the returned id goes in NOWPAYMENTS_PLAN_*. */
export async function createSubscriptionPlan(params: {
  title: string;
  intervalDay: number;
  amount: number;
  siteUrl: string;
}): Promise<SubscriptionPlan> {
  const res = await subscriptionFetch("/subscriptions/plans", {
    method: "POST",
    body: JSON.stringify({
      title: params.title,
      interval_day: params.intervalDay,
      amount: params.amount,
      currency: "usd",
      ipn_callback_url: `${params.siteUrl}/api/payments/nowpayments/ipn`,
      success_url: `${params.siteUrl}/account?payment=success`,
      cancel_url: `${params.siteUrl}/pricing?payment=cancelled`,
      partially_paid_url: `${params.siteUrl}/account?payment=partial`,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Couldn't create subscription plan (HTTP ${res.status}). ${body.slice(0, 200)}`);
  }
  const d = await res.json();
  const plan = d?.result ?? d;
  return {
    id: String(plan.id),
    title: plan.title,
    intervalDay: Number(plan.interval_day),
    amount: Number(plan.amount),
    currency: plan.currency,
  };
}

/** Maps our plan ids to the NOWPayments plan ids created on the
 * dashboard (or via createSubscriptionPlan above). */
export function subscriptionPlanId(plan: Exclude<PlanId, "free">): string | null {
  const id =
    plan === "pro" ? process.env.NOWPAYMENTS_PLAN_PRO : process.env.NOWPAYMENTS_PLAN_STANDARD;
  return id || null;
}

/**
 * Starts an email-based recurring subscription. NOWPayments emails the
 * customer a payment link now, and another one a day before each period
 * ends — so renewals are handled entirely on their side and we just
 * keep receiving IPN callbacks, which the existing webhook already
 * credits idempotently.
 */
export async function createEmailSubscription(params: {
  plan: Exclude<PlanId, "free">;
  email: string;
}): Promise<{ subscriptionId: string }> {
  const planId = subscriptionPlanId(params.plan);
  if (!planId) throw new Error(`No NOWPayments plan id configured for the ${params.plan} plan.`);

  const res = await subscriptionFetch("/subscriptions", {
    method: "POST",
    body: JSON.stringify({ subscription_plan_id: planId, email: params.email }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Couldn't start the subscription (HTTP ${res.status}). ${body.slice(0, 200)}`);
  }
  const d = await res.json();
  const sub = Array.isArray(d?.result) ? d.result[0] : d?.result ?? d;
  return { subscriptionId: String(sub?.id ?? "") };
}

/** Cancels a recurring payment so no further invoices are emailed.
 * Access already paid for is unaffected — the plan simply lapses at the
 * end of the period the person paid for. */
export async function cancelSubscription(subscriptionId: string): Promise<void> {
  const res = await subscriptionFetch(`/subscriptions/${encodeURIComponent(subscriptionId)}`, {
    method: "DELETE",
  });
  if (!res.ok && res.status !== 404) {
    throw new Error(`Couldn't cancel the subscription (HTTP ${res.status}).`);
  }
}
