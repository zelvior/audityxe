/**
 * Real, live network probes beyond the main page fetch. Every check here
 * makes an actual HTTP request to the target site (or a resource it
 * references) — nothing is simulated. Kept fast and bounded: small
 * samples, short per-request timeouts, run concurrently.
 *
 * Every URL probed here is extracted from the audited page's own HTML —
 * i.e. attacker/site-owner-controlled content — so each one goes through
 * the same SSRF validation as the main page fetch, including on every
 * redirect hop (native fetch's redirect:"follow" would otherwise bypass
 * that check entirely).
 */
export declare function probe(url: string, method?: "HEAD" | "GET"): Promise<{
    ok: boolean;
    status: number;
    contentType: string;
    contentLength: number | null;
}>;
export interface BrokenLinkResult {
    checked: number;
    broken: {
        url: string;
        status: number;
    }[];
    skippedTotal: number;
}
export declare function checkBrokenLinks(html: string, baseUrl: string, sampleSize?: number): Promise<BrokenLinkResult>;
export interface ImageSampleResult {
    checked: number;
    oversized: {
        url: string;
        sizeKb: number;
    }[];
    wrongContentType: number;
}
export declare function checkImageSample(html: string, baseUrl: string, sampleSize?: number): Promise<ImageSampleResult>;
export interface AdsTxtResult {
    fetched: boolean;
    exists: boolean;
    entryCount: number;
}
export declare function checkAdsTxt(origin: string): Promise<AdsTxtResult>;
export interface ServerHardeningResult {
    checked: boolean;
    allowedMethods: string[];
    exposesDangerousMethods: boolean;
    exposedPaths: {
        path: string;
        status: number;
    }[];
    directoryListingDetected: boolean;
}
export declare function checkServerHardening(origin: string): Promise<ServerHardeningResult>;
export interface SourceMapExposureResult {
    checked: boolean;
    scriptsSampled: number;
    exposedSourceMaps: string[];
}
export declare function checkSourceMapExposure(html: string, baseUrl: string): Promise<SourceMapExposureResult>;
export interface OgImageResult {
    checked: boolean;
    exists: boolean;
    isImage: boolean;
    sizeKb: number | null;
}
export declare function checkOgImage(ogImageUrl: string | null, baseUrl: string): Promise<OgImageResult>;
export interface SecurityTxtResult {
    checked: boolean;
    exists: boolean;
    checkedUrl: string;
    hasContact: boolean;
    hasExpires: boolean;
    isExpired: boolean;
    expiresAt: string | null;
}
export declare function checkSecurityTxt(origin: string): Promise<SecurityTxtResult>;
export interface FaviconManifestResult {
    checked: boolean;
    faviconIcoExists: boolean;
    manifestExists: boolean;
    manifestUrl: string | null;
}
export declare function checkFaviconManifest(origin: string, html: string, baseUrl: string): Promise<FaviconManifestResult>;
export interface CookieAuditResult {
    checked: boolean;
    cookieCount: number;
    missingSecure: string[];
    missingHttpOnly: string[];
    missingSameSite: string[];
}
export declare function checkCookieFlags(origin: string): Promise<CookieAuditResult>;
export interface RedirectChainResult {
    checked: boolean;
    hopCount: number;
    chain: string[];
    isLoop: boolean;
    excessiveHops: boolean;
    httpsUpgradeMissing: boolean;
}
export declare function checkRedirectChain(rawUrl: string): Promise<RedirectChainResult>;
export interface AssetWeightResult {
    checked: boolean;
    scriptKb: number;
    styleKb: number;
    imageKb: number;
    scriptCount: number;
    styleCount: number;
    imageCount: number;
}
export declare function checkAssetWeights(html: string, baseUrl: string): Promise<AssetWeightResult>;
