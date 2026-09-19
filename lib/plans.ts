export type PlanId = "free" | "standard" | "pro";

export interface Plan {
  id: PlanId;
  name: string;
  dailyAudits: number;
  competitorAudits: boolean;
  /** USD price for a 30-day grant. 0 for the free plan. Single
   * monthly tier only — no separate annual pricing. */
  priceUsd: number;
  tagline: string;
  features: string[];
}

/** Reads a plan's USD price from its NEXT_PUBLIC_* env var if set (so
 * it's baked into both the client bundle — this file is imported
 * directly by the client "use client" pricing page — and the server),
 * otherwise falls back to `fallback`. Lets you retune prices from
 * Vercel's Environment Variables UI without touching code; a redeploy
 * is still required since Next.js inlines NEXT_PUBLIC_* vars at build
 * time, not per-request. See "Payments" in the README. */
function envPriceUsd(envVar: string, fallback: number): number {
  const raw = process.env[envVar];
  const n = raw ? Number(raw) : NaN;
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export const PLANS: Record<PlanId, Plan> = {
  free: {
    id: "free",
    name: "Free",
    dailyAudits: 2,
    competitorAudits: false,
    priceUsd: 0,
    tagline: "Try the full audit engine, no card required.",
    features: [
      "2 audits per day",
      "All 6 scoring categories",
      "Full multi-area deep audit breakdown",
      "Priority fixes with code snippets and real evidence",
    ],
  },
  standard: {
    id: "standard",
    name: "Standard",
    dailyAudits: 5,
    competitorAudits: true,
    // Was a flat $3 — several NOWPayments-supported coins (notably
    // ones with meaningful network/gas fees, like ETH-network USDT)
    // enforce a minimum crypto amount per invoice that a $3 conversion
    // can land under, producing "Crypto amount ... is less than
    // minimal" at checkout. $5 clears that floor with real headroom.
    priceUsd: envPriceUsd("NEXT_PUBLIC_STANDARD_PRICE_USD", 5),
    tagline: "For builders shipping and promoting regularly.",
    features: [
      "5 audits per day",
      "Everything in Free",
      "Competitor head-to-head battles",
      "Priority queue for report generation",
      "30-day access per payment",
    ],
  },
  pro: {
    id: "pro",
    name: "Pro",
    dailyAudits: 8,
    competitorAudits: true,
    priceUsd: envPriceUsd("NEXT_PUBLIC_PRO_PRICE_USD", 6),
    tagline: "Built for agencies auditing client sites and portfolios at scale.",
    features: [
      "8 audits per day",
      "Everything in Standard",
      "Real browser-rendered performance & accessibility audit (PageSpeed Insights)",
      "X + LinkedIn promo copy + shareable banner — bring your own AI key",
      "Bulk audit — up to 20 client URLs in one request",
      "CSV export for client reporting",
      "Highest-priority queue",
      "Early access to new audit modules",
      "Email support",
    ],
  },
};

/** Daily audits allowed per IP for a visitor with no account at all. */
export const ANON_DAILY_LIMIT = 1;

export const DEFAULT_PLAN: PlanId = "free";

export function planLimit(plan: PlanId): number {
  return PLANS[plan]?.dailyAudits ?? PLANS.free.dailyAudits;
}
