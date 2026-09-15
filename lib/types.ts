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
  /** How much this specific finding matters, independent of the module's
   * aggregate score. A "fail" isn't automatically alarming — a missing
   * canonical tag and an exposed .env file are both "fail" but very
   * different severities. Defaults: fail→"high", warn→"medium" when
   * omitted, so existing callers keep working. */
  severity?: "critical" | "high" | "medium" | "low";
  detail: string;
  /** Concrete, checkable proof behind this finding — an exact URL that
   * was fetched, an HTTP status returned, a literal count of elements
   * found, or a snippet of real markup. Every finding should be provable
   * from this field, not just asserted in `detail`. */
  evidence?: string;
  /** How sure we are this finding is correct. "high" = deterministic
   * check against directly observed data (an HTTP status, a literal tag
   * count). "medium"/"low" = heuristic or inferred (keyword matching,
   * classification, anything that could be a false positive/negative).
   * Omitted = high, so existing callers keep working. */
  confidence?: "high" | "medium" | "low";
  /** True when the underlying check could not actually be verified
   * (a lookup timed out, errored, or was blocked) rather than genuinely
   * confirming an absence. Unverifiable findings are shown for
   * transparency but never penalize the module's score/status the way a
   * confirmed fail/warn does. */
  unverifiable?: boolean;
}

export interface AuditModule {
  id: string;
  label: string;
  status: "good" | "warning" | "critical";
  /** Null specifically means "this module's checks couldn't run at
   * all" (e.g. the PageSpeed Insights request itself failed) — a
   * distinct state from a low-but-real score, so the UI/exports can
   * show "not scored" instead of a misleadingly specific number
   * computed from zero actual data. */
  score: number | null;
  summary: string;
  findings: AuditModuleFinding[];
}

export interface PageSpeedSummary {
  fetched: boolean;
  /** Distinct from `fetched`: true whenever a PageSpeed Insights call
   * was actually attempted (includePageSpeed was on), regardless of
   * whether it succeeded — so a failure can be told apart from "never
   * requested" (a locked plan, or the toggle left off). */
  attempted: boolean;
  /** Human-readable reason the call failed, when `attempted` is true
   * and `fetched` is false — surfaced directly to the person instead
   * of the Lighthouse module just silently not appearing, which gave
   * zero signal for diagnosing e.g. an invalid BYOK API key. */
  errorMessage: string | null;
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
  /** Real-world (CrUX field) data from actual Chrome users, when Google
   * has enough traffic on this origin to report it — distinct from the
   * lab-simulated coreWebVitals above. This is what "real world
   * performance" claims should be based on when available, since lab
   * runs are a single simulated device/network condition and can miss
   * how the page performs for actual visitors. */
  fieldData?: {
    available: boolean;
    scope: "page" | "origin" | null;
    lcpMs: number | null;
    clsScore: number | null;
    fcpMs: number | null;
    inpMs: number | null;
    overallCategory: "FAST" | "AVERAGE" | "SLOW" | null;
  };
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
    /** How confidently the classifier picked this type over the
     * next-best candidate — low confidence means legal/trust-page
     * expectations derived from it should be read as a starting point,
     * not a hard verdict. */
    confidence?: "high" | "medium" | "low";
  };
  /** Plain-language explanation of how `overall` is derived from
   * `categories`, so the number is never an unexplained black box. */
  scoringMethodology?: string;
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
  /** Why PageSpeed/Lighthouse data wasn't included, when it wasn't —
   * lets the UI (and exports) explain the gap instead of just showing
   * an empty performance section. */
  pageSpeedLockReason?: "not_confirmed" | "weekly_limit";
  _usage?: { used: number; limit: number; remaining: number; plan: string };
  competitor?: {
    url: string;
    overall: number;
    categories: CategoryScore[];
    summary: string[];
  };
}
