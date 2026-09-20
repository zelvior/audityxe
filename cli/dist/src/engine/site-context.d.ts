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
export type SiteType = "ecommerce" | "saas" | "local_business" | "content_blog" | "portfolio_personal" | "generic";
export interface SiteContext {
    siteType: SiteType;
    /** Plain-language label for display, e.g. "SaaS / software product". */
    label: string;
    /** Which concrete signals drove the classification — shown as evidence
     * so this never reads as an unexplained black-box guess. */
    reasons: string[];
    /** True if a contact form, mailto, or tel link exists anywhere. */
    collectsContactInfo: boolean;
    /** True if any third-party analytics/ads/chat script was detected, OR
     * a known tracking-cookie name was observed on the response — the main
     * trigger for a cookie policy actually being necessary. Checking both
     * signals (not script tags alone) matters: the security module's
     * cookie-classification check flags tracking cookies independently of
     * script detection, and the two used to disagree — a site could get a
     * "tracking cookies present, no consent flow" warning in one module
     * while this one said a cookie policy was "skippable, no tracking
     * detected" in the same report. */
    usesTrackingScripts: boolean;
    /** True if any <form> exists — the main trigger for a privacy policy
     * being necessary regardless of site type. */
    collectsFormData: boolean;
    /** How much stronger the winning site-type score was than the runner
     * up. Low confidence means downstream legal/trust-page expectations
     * derived from this classification should be read as a starting
     * point, not a hard verdict — reduces false-positive "missing page"
     * findings on ambiguous sites. */
    confidence: "high" | "medium" | "low";
}
export declare function classifySiteContext(html: string, signals: Signals, deep: DeepSignals): SiteContext;
