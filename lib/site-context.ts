import { Signals } from "./analyze";
import { DeepSignals } from "./deep-signals";

/**
 * Infers what *kind* of site is being audited from real signals already
 * extracted elsewhere (structured data, commerce/pricing markers, nav
 * text, forms) — no guessing, no extra network calls. This is what lets
 * downstream checks (like legal/trust page expectations) actually adapt
 * to context instead of applying one rigid checklist to every site: a
 * one-page portfolio and a multi-tenant SaaS shouldn't be graded against
 * the same "you're missing a DPA" bar.
 */
export type SiteType =
  | "ecommerce"
  | "saas"
  | "local_business"
  | "content_blog"
  | "portfolio_personal"
  | "generic";

export interface SiteContext {
  siteType: SiteType;
  /** Plain-language label for display, e.g. "SaaS / software product". */
  label: string;
  /** Which concrete signals drove the classification — shown as evidence
   * so this never reads as an unexplained black-box guess. */
  reasons: string[];
  /** True if a contact form, mailto, or tel link exists anywhere. */
  collectsContactInfo: boolean;
  /** True if any third-party analytics/ads/chat script was detected —
   * the main trigger for a cookie policy actually being necessary. */
  usesTrackingScripts: boolean;
  /** True if any <form> exists — the main trigger for a privacy policy
   * being necessary regardless of site type. */
  collectsFormData: boolean;
}

export function classifySiteContext(html: string, signals: Signals, deep: DeepSignals): SiteContext {
  const bodyLower = html.slice(0, 400_000).toLowerCase(); // bounded — this never needs the whole doc
  const sd = deep.structuredData;
  const mon = deep.monetization;

  const reasons: string[] = [];
  const scores: Record<SiteType, number> = {
    ecommerce: 0,
    saas: 0,
    local_business: 0,
    content_blog: 0,
    portfolio_personal: 0,
    generic: 0,
  };

  // ── E-commerce ──────────────────────────────────────────────────
  if (mon.hasCartOrCheckoutSignals) {
    scores.ecommerce += 3;
    reasons.push("cart/checkout markup found in the page");
  }
  if (sd.hasProduct) {
    scores.ecommerce += 3;
    reasons.push('schema.org "Product" structured data present');
  }
  if (mon.paymentProcessorsDetected.length > 0) {
    scores.ecommerce += 2;
    reasons.push(`payment processor detected (${mon.paymentProcessorsDetected.join(", ")})`);
  }
  if (/\b(add to cart|shopping cart|checkout|shop now|free shipping)\b/i.test(bodyLower)) {
    scores.ecommerce += 1;
  }

  // ── SaaS / software product ──────────────────────────────────────
  if (mon.hasPricingSignals) {
    scores.saas += 2;
    reasons.push("pricing-page signals detected");
  }
  if (/\b(sign up free|start free trial|book a demo|api (docs|documentation)|dashboard|log ?in)\b/i.test(bodyLower)) {
    scores.saas += 2;
    reasons.push('SaaS-style copy found ("start free trial" / "API docs" / "dashboard")');
  }
  if (/\b(saas|software as a service|platform for|no-code|api-first)\b/i.test(bodyLower)) {
    scores.saas += 1;
  }
  if (deep.techStack.detectedTagManagers.length > 0 || deep.thirdPartyScripts.chatWidgetScripts.length > 0) {
    scores.saas += 1;
  }

  // ── Local business ──────────────────────────────────────────────
  if (sd.hasLocalBusiness) {
    scores.local_business += 4;
    reasons.push('schema.org "LocalBusiness" structured data present');
  }
  if (/\b(opening hours|business hours|get directions|book an appointment|our location)\b/i.test(bodyLower)) {
    scores.local_business += 2;
  }

  // ── Content / blog ───────────────────────────────────────────────
  if (sd.hasArticle) {
    scores.content_blog += 3;
    reasons.push('schema.org "Article"/"BlogPosting" structured data present');
  }
  if (deep.htmlStructure.hasArticleOrSection && signals.wordCount > 600) {
    scores.content_blog += 1;
  }
  if (/\b(subscribe|newsletter|read more|posted by|min read)\b/i.test(bodyLower)) {
    scores.content_blog += 1;
  }

  // ── Portfolio / personal ─────────────────────────────────────────
  if (/\b(my portfolio|hire me|freelance|personal blog|about me\b)\b/i.test(bodyLower)) {
    scores.portfolio_personal += 2;
    reasons.push('personal/portfolio phrasing found ("hire me" / "about me")');
  }
  if (signals.formCount === 0 && mon.hasCartOrCheckoutSignals === false && !mon.hasPricingSignals && signals.wordCount < 1500) {
    scores.portfolio_personal += 1;
  }

  let best: SiteType = "generic";
  let bestScore = 0;
  (Object.keys(scores) as SiteType[]).forEach((k) => {
    if (scores[k] > bestScore) {
      best = k;
      bestScore = scores[k];
    }
  });
  if (bestScore === 0) reasons.push("no strong signals either way — falling back to a generic baseline");

  const labels: Record<SiteType, string> = {
    ecommerce: "E-commerce / online store",
    saas: "SaaS / software product",
    local_business: "Local business",
    content_blog: "Content site / blog",
    portfolio_personal: "Portfolio / personal site",
    generic: "General website",
  };

  return {
    siteType: best,
    label: labels[best],
    reasons: reasons.slice(0, 4),
    collectsContactInfo: signals.formCount > 0 || signals.telOrMailtoLinks > 0,
    usesTrackingScripts: deep.thirdPartyScripts.analyticsScripts.length > 0 || deep.thirdPartyScripts.adScripts.length > 0,
    collectsFormData: signals.formCount > 0,
  };
}
