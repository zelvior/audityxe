export type CategoryKey =
  | "messaging"
  | "uiux"
  | "cro"
  | "seo"
  | "brand"
  | "security";

export interface CategoryScore {
  key: CategoryKey;
  label: string;
  score: number;
}

export interface FixItem {
  id: string;
  category: string;
  target: string;
  problem: string;
  evidence: string;
  fix: string;
  snippet: string;
  language: string;
}

export interface BannerDesign {
  headline: string;
  tagline: string;
  accentWord: string;
  layout: "centered-badge" | "left-stacked";
}

export interface AuditModuleFinding {
  label: string;
  status: "pass" | "warn" | "fail";
  detail: string;
  /** Concrete, checkable proof behind this finding — an exact URL that
   * was fetched, an HTTP status returned, a literal count of elements
   * found, or a snippet of real markup. Every finding should be provable
   * from this field, not just asserted in `detail`. */
  evidence?: string;
}

export interface AuditModule {
  id: string;
  label: string;
  status: "good" | "warning" | "critical";
  score: number;
  summary: string;
  findings: AuditModuleFinding[];
}

export interface PageSpeedSummary {
  fetched: boolean;
  performanceScore: number | null;
  accessibilityScore: number | null;
  bestPracticesScore: number | null;
  seoScore: number | null;
  coreWebVitals: {
    lcpMs: number | null;
    clsScore: number | null;
    tbtMs: number | null;
    fcpMs: number | null;
    speedIndexMs: number | null;
  };
  topIssues: { id: string; title: string; description: string }[];
}

export interface AuditResult {
  url: string;
  overall: number;
  verdict: string;
  categories: CategoryScore[];
  fixes: FixItem[];
  xPost: string;
  linkedinPost: string;
  /** What kind of site this looks like (SaaS, e-commerce, blog, etc.)
   * and why — used to make the legal/trust-page module's expectations
   * adapt to the actual site instead of one fixed checklist for all. */
  siteContext?: {
    siteType: string;
    label: string;
    reasons: string[];
  };
  banner: BannerDesign;
  modules: AuditModule[];
  pageSpeed: PageSpeedSummary;
  /** True when promo copy/banner and PageSpeed weren't generated because
   * the caller's plan doesn't include them (Free/anonymous). The UI uses
   * this to show an upgrade prompt instead of the (deterministic-only)
   * placeholder content. */
  promoLocked?: boolean;
  /** Why promo is locked, when it is — lets the UI show the right CTA
   * ("upgrade to Pro" vs "add your AI key in Settings"). */
  promoLockReason?: "plan" | "byok_missing" | "byok_failed";
  pageSpeedLocked?: boolean;
  _usage?: { used: number; limit: number; remaining: number; plan: string };
  competitor?: {
    url: string;
    overall: number;
    categories: CategoryScore[];
    summary: string[];
  };
}
