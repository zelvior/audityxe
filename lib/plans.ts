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
    dailyAudits: 3,
    competitorAudits: false,
    priceUsd30: 0,
    priceUsd365: 0,
    tagline: "Try the full audit engine, no card required.",
    features: [
      "3 audits per day",
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
    dailyAudits: 20,
    competitorAudits: true,
    priceUsd30: 5,
    priceUsd365: 39,
    tagline: "For builders shipping and promoting regularly.",
    features: [
      "20 audits per day",
      "Everything in Free",
      "Competitor head-to-head battles",
      "Priority queue for report generation",
      "30 or 365-day access grants",
    ],
  },
  pro: {
    id: "pro",
    name: "Pro",
    dailyAudits: 50,
    competitorAudits: true,
    priceUsd30: 12,
    priceUsd365: 99,
    tagline: "Built for agencies auditing client sites and portfolios at scale.",
    features: [
      "50 audits per day — enough for a full client roster",
      "Everything in Standard",
      "Bulk audit — up to 20 client URLs in one request",
      "CSV export for client reporting",
      "Highest-priority queue",
      "Early access to new audit modules",
      "Email support",
    ],
  },
};

export const DEFAULT_PLAN: PlanId = "free";

export function planLimit(plan: PlanId): number {
  return PLANS[plan]?.dailyAudits ?? PLANS.free.dailyAudits;
}

export function priceForDuration(plan: Plan, duration: PlanDuration): number {
  return duration === 30 ? plan.priceUsd30 : plan.priceUsd365;
}
