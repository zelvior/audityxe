import { AuditResult } from "./types";
export interface Signals {
    title: string;
    metaDescription: string;
    h1Count: number;
    h1Text: string;
    h2Count: number;
    wordCount: number;
    headingOrderValid: boolean;
    duplicateTitleAndH1: boolean;
    duplicateH2Texts: string[];
    duplicateH3Texts: string[];
    readingTimeMinutes: number;
    fleschKincaidGrade: number | null;
    hasViewport: boolean;
    viewportHasInitialScale: boolean;
    imgTotal: number;
    imgMissingAlt: number;
    imgLazyCount: number;
    iframeTotal: number;
    iframeMissingDimensions: number;
    ariaLandmarkCount: number;
    inlineStyleCount: number;
    fontFamilyCount: number;
    formCount: number;
    inputCount: number;
    ctaButtonCount: number;
    hasAboveFoldCta: boolean;
    linkCount: number;
    telOrMailtoLinks: number;
    isHttps: boolean;
    htmlLangSet: boolean;
    charsetSet: boolean;
    hasCanonical: boolean;
    hasRobotsMeta: boolean;
    robotsBlocksIndexing: boolean;
    hasStructuredData: boolean;
    scriptCount: number;
    externalScriptCount: number;
    renderBlockingStylesheets: number;
    htmlSizeKb: number;
    hasFavicon: boolean;
    hasAppleTouchIcon: boolean;
    hasOgImage: boolean;
    hasOgTitle: boolean;
    hasOgDescription: boolean;
    hasTwitterCard: boolean;
    hasThemeColor: boolean;
    hasManifest: boolean;
    robotsTxt: RobotsSignals;
    sitemap: SitemapSignals;
    llmsTxt: LlmsTxtSignals;
    security: SecuritySignals;
}
export interface SecuritySignals {
    finalIsHttps: boolean;
    redirectHopCount: number;
    httpDowngradeDetected: boolean;
    responseTimeMs: number;
    hasHsts: boolean;
    hstsMaxAge: number | null;
    hstsIncludesSubDomains: boolean;
    hstsPreload: boolean;
    hasCsp: boolean;
    /** True only when the *script-executing* directive (script-src, or
     * default-src as its fallback per the CSP spec) itself allows
     * unsafe-inline/unsafe-eval/a wildcard source — not just whether that
     * token appears anywhere in the header string. A whole-string regex
     * (the previous approach) produces false positives: e.g.
     * "object-src 'none'; script-src 'self'; img-src *" contains a bare
     * "*" for images only, which poses no XSS risk at all, but a
     * whole-string match would have flagged it as weakening script
     * execution. Parsed per-directive via parseCsp() below instead. */
    cspAllowsUnsafeInline: boolean;
    cspAllowsUnsafeEval: boolean;
    cspAllowsWildcardSource: boolean;
    /** Same false-positive concern as above but for style-src specifically
     * — unsafe-inline styles are a real but meaningfully lower-severity
     * issue than unsafe-inline scripts (CSS injection vs. arbitrary JS
     * execution), so tracked and reported separately rather than lumped
     * into the script-level finding. */
    cspStyleAllowsUnsafeInline: boolean;
    /** object-src 'none' (or equivalent default-src 'none') blocks legacy
     * plugin content (Flash/Java applets) that classic XSS payloads and
     * clickjacking-adjacent attacks have historically abused — a
     * well-known CSP hardening recommendation distinct from script-src. */
    cspHasObjectSrcNone: boolean;
    /** base-uri restricts <base href> injection, which can otherwise
     * redirect every relative script/link/form on the page to an
     * attacker's origin even with a strict script-src in place. */
    cspRestrictsBaseUri: boolean;
    /** frame-ancestors is CSP's modern, more expressive replacement for
     * X-Frame-Options (supports multiple origins, wildcards by scheme,
     * and is respected by browsers that also honor CSP) — its absence is
     * a real gap even when X-Frame-Options is present, since the two
     * mechanisms don't always agree on edge cases (e.g. some browsers
     * prioritize frame-ancestors when both are set). */
    cspHasFrameAncestors: boolean;
    /** A nonce- or strict-dynamic-based script-src is the strongest,
     * most modern CSP posture — strictly stronger than a static
     * allowlist of origins, since it can't be bypassed by a JSONP/open
     * redirect on an allowlisted host the way an origin-based allowlist
     * can. Tracked as a positive signal, not just an absence check. */
    cspUsesNonceOrStrictDynamic: boolean;
    /** A separate Content-Security-Policy-Report-Only header (monitoring
     * mode, not enforced) — worth surfacing distinctly since a site can
     * have a report-only CSP that looks reassuring in a raw header dump
     * but enforces nothing at all. */
    hasCspReportOnly: boolean;
    hasXFrameOptions: boolean;
    hasXContentTypeOptions: boolean;
    hasReferrerPolicy: boolean;
    referrerPolicyIsWeak: boolean;
    hasPermissionsPolicy: boolean;
    hasCoop: boolean;
    hasCoep: boolean;
    hasCorp: boolean;
    hasClearSiteData: boolean;
    exposesServerHeader: boolean;
    serverHeaderValue: string | null;
    exposesPoweredBy: boolean;
    poweredByValue: string | null;
    hasCacheControl: boolean;
    cacheControlIsPublicOnSensitivePage: boolean;
    hasCompression: boolean;
    contentEncoding: string | null;
    hasDoctype: boolean;
    hasMetaRefresh: boolean;
    mixedContentCount: number;
    cookieCount: number;
    cookiesMissingSecure: number;
    cookiesMissingHttpOnly: number;
    cookiesMissingSameSite: number;
    cookiesPersistentCount: number;
    cookiesSessionCount: number;
    cookiesTrackingSuspectedCount: number;
    formCountTotal: number;
    formsWithInsecureAction: number;
    corsAllowsAnyOrigin: boolean;
    corsAllowsCredentialsWithWildcard: boolean;
    /** The raw X-Robots-Tag response header, if present — a page can be
     * blocked from indexing at the HTTP-header level even when its HTML
     * <meta name="robots"> tag looks perfectly fine, which a check that
     * only reads the HTML would miss entirely. */
    xRobotsTagValue: string | null;
}
export interface RobotsSignals {
    fetched: boolean;
    exists: boolean;
    blocksAllCrawlers: boolean;
    referencesSitemap: boolean;
    sitemapUrls: string[];
    ruleCount: number;
    checkedUrl: string;
    httpStatus: number | null;
    /** Named AI answer-engine crawlers (GPTBot, ClaudeBot, PerplexityBot,
     * Google-Extended, etc.) that this robots.txt explicitly disallows —
     * distinct from blocksAllCrawlers, since a site can welcome regular
     * search engines while quietly locking out every AI crawler that
     * would otherwise cite it in ChatGPT/Claude/Perplexity answers. */
    aiBotsBlocked: string[];
}
export interface LlmsTxtSignals {
    fetched: boolean;
    exists: boolean;
    httpStatus: number | null;
    /** Rough non-empty-content check — a 200 response with an
     * effectively blank body isn't a real llms.txt. */
    hasContent: boolean;
    checkedUrl: string;
}
export interface SitemapSignals {
    fetched: boolean;
    exists: boolean;
    isValidXml: boolean;
    urlCount: number;
    hasLastmod: boolean;
    isSitemapIndex: boolean;
    checkedUrl: string;
    httpStatus: number | null;
}
export interface AuditOptions {
    /** Promo copy/banner generation — Pro-only, requires BYOK. */
    includePromo?: boolean;
    /** Why promo is off, when it is — passed through untouched to the
     * result so the UI can show the right CTA. Ignored if includePromo. */
    promoLockReason?: "plan" | "byok_missing";
    /** PageSpeed Insights (real Lighthouse/browser run) — gated to Pro. */
    includePageSpeed?: boolean;
    /** User's own AI credentials — required for includePromo to actually
     * produce AI copy; without it, promo falls back to the deterministic
     * template even if includePromo is true. */
    byok?: {
        apiKey: string;
        baseUrl?: string | null;
        model?: string | null;
    };
    /** User's own PageSpeed Insights (Google Cloud) API key — raises PSI's
     * own quota; independent of the AI byok above. */
    psiByokKey?: string | null;
    /** "fast" (default) crawls a bounded sample from the homepage's own
     * links + sitemap seeds. "deep" runs a real multi-hop request queue
     * (site-crawl-deep.ts) — slower, but reaches pages fast mode can't.
     * Lazy-imported only when requested, so its dependency (cheerio)
     * never loads on the default fast path. */
    crawlMode?: "fast" | "deep";
}
export declare function runAudit(rawUrl: string, competitorRawUrl?: string, options?: AuditOptions): Promise<AuditResult>;
