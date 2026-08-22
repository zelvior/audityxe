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
      "Full 16-area deep audit breakdown",
      "Priority fixes with code snippets",
      "X + LinkedIn promo copy",
      "Shareable banner export",
    ],
  },
  standard: {
    id: "standard",
    name: "Standard",
    dailyAudits: 25,
    competitorAudits: true,
    priceUsd30: 19,
    priceUsd365: 190,
    tagline: "For builders shipping and promoting regularly.",
    features: [
      "25 audits per day",
      "Everything in Free",
      "Competitor head-to-head battles",
      "Priority AI copy generation",
      "30 or 365-day access grants",
    ],
  },
  pro: {
    id: "pro",
    name: "Pro",
    dailyAudits: 200,
    competitorAudits: true,
    priceUsd30: 49,
    priceUsd365: 490,
    tagline: "For agencies auditing client sites at scale.",
    features: [
      "200 audits per day",
      "Everything in Standard",
      "Bulk audit — up to 20 URLs in one request",
      "Highest-priority Gemini queue",
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
