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
    cspAllowsUnsafeInline: boolean;
    cspAllowsUnsafeEval: boolean;
    cspAllowsWildcardSource: boolean;
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
