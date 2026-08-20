export type PlanId = "free" | "standard" | "pro";

export interface Plan {
  id: PlanId;
  name: string;
  dailyAudits: number;
  competitorAudits: boolean;
  price: string;
  tagline: string;
  features: string[];
}

export const PLANS: Record<PlanId, Plan> = {
  free: {
    id: "free",
    name: "Free",
    dailyAudits: 3,
    competitorAudits: false,
    price: "$0",
    tagline: "Try the full audit engine, no card required.",
    features: [
      "3 audits per day",
      "All 5 scoring categories",
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
    price: "$19/mo",
    tagline: "For builders shipping and promoting regularly.",
    features: [
      "25 audits per day",
      "Everything in Free",
      "Competitor head-to-head battles",
      "Sitemap & robots.txt deep scan",
      "Priority AI copy generation",
    ],
  },
  pro: {
    id: "pro",
    name: "Pro",
    dailyAudits: 200,
    competitorAudits: true,
    price: "$49/mo",
    tagline: "For agencies auditing client sites at scale.",
    features: [
      "200 audits per day",
      "Everything in Standard",
      "Highest-priority Gemini queue",
      "Early access to new audit categories",
      "Email support",
    ],
  },
};

export const DEFAULT_PLAN: PlanId = "free";

export function planLimit(plan: PlanId): number {
  return PLANS[plan]?.dailyAudits ?? PLANS.free.dailyAudits;
}
