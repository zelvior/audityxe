export type PlanId = "free" | "standard" | "pro";
export type PlanDuration = 30 | 365;

export interface Plan {
  id: PlanId;
  name: string;
  dailyAudits: number;
  competitorAudits: boolean;
  /** USD price for a 30-day grant. 0 for the free plan. */
  priceUsd30: number;
  /** USD price for a 365-day grant (discounted vs. 30-day * 12). 0 for the free plan. */
  priceUsd365: number;
  tagline: string;
  features: string[];
}

export const PLANS: Record<PlanId, Plan> = {
  free: {
    id: "free",
    name: "Free",
    dailyAudits: 2,
    competitorAudits: false,
    priceUsd30: 0,
    priceUsd365: 0,
    tagline: "Try the full audit engine, no card required.",
    features: [
      "2 audits per day",
      "All 6 scoring categories",
      "Full 17-area deep audit breakdown",
      "Real browser-rendered performance & accessibility audit",
      "Priority fixes with code snippets and real evidence",
      "X + LinkedIn promo copy",
      "Shareable banner export",
    ],
  },
  standard: {
    id: "standard",
    name: "Standard",
    dailyAudits: 5,
    competitorAudits: true,
    priceUsd30: 3,
    priceUsd365: 25,
    tagline: "For builders shipping and promoting regularly.",
    features: [
      "5 audits per day",
      "Everything in Free",
      "Competitor head-to-head battles",
      "Priority queue for report generation",
      "30 or 365-day access grants",
    ],
  },
  pro: {
    id: "pro",
    name: "Pro",
    dailyAudits: 8,
    competitorAudits: true,
    priceUsd30: 6,
    priceUsd365: 49,
    tagline: "Built for agencies auditing client sites and portfolios at scale.",
    features: [
      "8 audits per day",
      "Everything in Standard",
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

export function priceForDuration(plan: Plan, duration: PlanDuration): number {
  return duration === 30 ? plan.priceUsd30 : plan.priceUsd365;
}
