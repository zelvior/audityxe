/**
 * Deep, synchronous, regex-based signal extraction from already-fetched
 * HTML. No network calls here — everything is derived from the single
 * HTML response Audityxe already has in memory. Real async probes
 * (broken links, image HEAD checks, ads.txt) live in network-checks.ts.
 */
export interface AccessibilitySignals {
    htmlLangValue: string | null;
    totalFormInputs: number;
    inputsWithoutLabel: number;
    totalButtons: number;
    buttonsWithoutAccessibleName: number;
    totalLinks: number;
    linksWithoutAccessibleName: number;
    /** Links whose entire visible text is a non-descriptive phrase like
     * "click here" or "read more" — a real SEO and screen-reader-
     * navigation problem (screen readers can list all links on a page
     * out of context, so "click here" ×5 tells a blind user nothing
     * about where each one goes), distinct from having no accessible
     * name at all. */
    genericLinkTextCount: number;
    hasSkipLink: boolean;
    positiveTabindexCount: number;
    ariaHiddenOnBodyOrHtml: boolean;
    imagesWithGenericAlt: number;
    iframesWithoutTitle: number;
    /** `outline: none`/`outline: 0` with no visible replacement (a
     * `:focus`/`:focus-visible` box-shadow or border rule) found in
     * inline <style> blocks or style="" attributes — the single most
     * common way sites accidentally make themselves unusable by
     * keyboard, per WCAG 2.1's focus-visibility guidance. */
    suppressesFocusOutlineWithoutReplacement: boolean;
}
export interface TechStackSignals {
    generator: string | null;
    generatorVersion: string | null;
    detectedCMS: string | null;
    detectedCMSVersion: string | null;
    detectedFrameworks: string[];
    detectedCssFrameworks: string[];
    detectedEcommercePlatforms: string[];
    detectedPageBuilders: string[];
    detectedAnalytics: string[];
    detectedTagManagers: string[];
    detectedAbTestingTools: string[];
    detectedCookieConsentTools: string[];
    jqueryDetected: boolean;
    detectedCDNs: string[];
    hostingProvider: string | null;
    /** How many independent signals corroborate the primary CMS/framework
     * call — a single loose regex match is a guess, three concurring
     * signals (generator tag + asset paths + cookie name) is confident. */
    confidence: "high" | "medium" | "low";
}
export interface HtmlStructureSignals {
    hasHeaderTag: boolean;
    hasNavTag: boolean;
    hasMainTag: boolean;
    hasFooterTag: boolean;
    hasArticleOrSection: boolean;
    semanticTagCount: number;
    divCount: number;
    totalElementCount: number;
    divRatio: number;
    totalIdCount: number;
    duplicateIdCount: number;
    deprecatedTagsUsed: string[];
    commentCount: number;
    /** More than one <title> or canonical <link> tag — technically
     * invalid HTML, and browsers/search engines resolve the conflict
     * unpredictably (usually "last one wins," which is rarely what was
     * intended). */
    duplicateTitleTagCount: number;
    duplicateCanonicalTagCount: number;
}
export interface ThirdPartyScriptSignals {
    externalScriptDomains: string[];
    analyticsScripts: string[];
    adScripts: string[];
    chatWidgetScripts: string[];
    fontScripts: string[];
    tagManagerScripts: string[];
    otherThirdPartyScripts: string[];
    totalExternalScripts: number;
}
export interface SriSignals {
    crossOriginScriptCount: number;
    crossOriginScriptsMissingIntegrity: number;
    crossOriginStylesheetCount: number;
    crossOriginStylesheetsMissingIntegrity: number;
}
export interface SocialMetaSignals {
    ogType: string | null;
    ogUrl: string | null;
    ogSiteName: string | null;
    ogImageUrl: string | null;
    twitterCard: string | null;
    twitterSite: string | null;
    twitterCreator: string | null;
    twitterImageUrl: string | null;
    facebookAppId: boolean;
}
export interface MonetizationSignals {
    adSenseDetected: boolean;
    otherAdNetworksDetected: string[];
    affiliateLinkCount: number;
    donationPlatformsDetected: string[];
    paymentProcessorsDetected: string[];
    hasPricingSignals: boolean;
    hasCartOrCheckoutSignals: boolean;
}
export interface StructuredDataSignals {
    blockCount: number;
    parseErrorCount: number;
    types: string[];
    hasOrganization: boolean;
    hasBreadcrumb: boolean;
    hasProduct: boolean;
    hasArticle: boolean;
    hasFaqPage: boolean;
    hasHowTo: boolean;
    hasSpeakable: boolean;
    hasLocalBusiness: boolean;
    hasWebSite: boolean;
    hasReview: boolean;
    missingRequiredFieldsByType: Record<string, string[]>;
}
/** Signals for whether this page's content is actually structured to be
 * lifted as a direct answer by an AI answer engine or a featured
 * snippet — distinct from whether the page is crawlable at all (see
 * StructuredDataSignals/robots.txt/llms.txt for that side). */
export interface AnswerReadinessSignals {
    /** Headings phrased as a question ("How does X work?", "What is
     * Y?") — the single strongest on-page (non-schema) signal that a
     * section is answer-shaped, since it's exactly the pattern AI
     * Overviews / featured snippets and chat answer engines pull from. */
    questionHeadingCount: number;
    questionHeadingSamples: string[];
    /** A concise (roughly 40–320 char) paragraph sitting directly after
     * the page's first heading — the classic "definition-first" pattern
     * that makes a page's opening easy to lift as a direct answer. */
    hasDirectAnswerLead: boolean;
}
export interface ImageOptimizationSignals {
    total: number;
    missingDimensions: number;
    modernFormatCount: number;
    legacyFormatCount: number;
    lazyLoadedCount: number;
    srcsetUsageCount: number;
    dataUriCount: number;
}
export interface MobileSignals {
    viewportContent: string | null;
    viewportHasWidthDevice: boolean;
    viewportAllowsUserScaling: boolean;
    mediaQueryCount: number;
    responsiveClassHintCount: number;
    appleTouchIconCount: number;
    hasMaskIcon: boolean;
    touchIconSizes: string[];
}
export interface VibeCodedSignals {
    purpleBlueGradientHints: number;
    gradientDeclarationCount: number;
    gradientTextHints: number;
    glassmorphismHints: number;
    emojiInHeadingOrButtonCount: number;
    pillBadgeAboveHeadingHints: number;
    genericIconRowHints: number;
    scrollFadeInAnimationHints: number;
    cursorGlowOrParticleHints: number;
    hoverOpacityFadeHints: number;
    grainyTextureHints: number;
    largeRadiusHints: number;
    interFontOnlyHint: boolean;
    spaceGroteskInstrumentSerifPairHint: boolean;
    emDashCount: number;
    buzzwordCount: number;
    buzzwordsFound: string[];
    loremIpsumHint: boolean;
    distinctFontFamilyCount: number;
    totalSignalCount: number;
}
export interface CspOriginSignals {
    scriptOrigins: string[];
    styleOrigins: string[];
    imageOrigins: string[];
    frameOrigins: string[];
    fontOrigins: string[];
    connectOrigins: string[];
}
export interface LinkAndCrawlerSignals {
    blankTargetLinkCount: number;
    blankTargetMissingNoopener: number;
    xRobotsTagValue: string | null;
    xRobotsTagBlocksIndexing: boolean;
    /** True only when the HTTP-header-level directive and the HTML
     * meta-tag-level directive actively disagree on noindex — not just
     * "one exists and the other doesn't," which would flag the (very
     * common and totally fine) case of a site only using one or the
     * other. */
    metaRobotsVsHeaderConflict: boolean;
    aiTrainingOptOut: boolean;
}
export interface DeepSignals {
    accessibility: AccessibilitySignals;
    techStack: TechStackSignals;
    htmlStructure: HtmlStructureSignals;
    thirdPartyScripts: ThirdPartyScriptSignals;
    socialMeta: SocialMetaSignals;
    monetization: MonetizationSignals;
    structuredData: StructuredDataSignals;
    answerReadiness: AnswerReadinessSignals;
    images: ImageOptimizationSignals;
    mobile: MobileSignals;
    vibeCoded: VibeCodedSignals;
    sri: SriSignals;
    cspOrigins: CspOriginSignals;
    linkSafety: LinkAndCrawlerSignals;
}
export declare function extractDeepSignals(html: string, serverHeaderValue?: string | null, xRobotsTagValue?: string | null): DeepSignals;
