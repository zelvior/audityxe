import { AuditModule, PageSpeedSummary } from "./types";
import { Signals } from "./analyze";
import { DeepSignals } from "./deep-signals";
import { BrokenLinkResult, ImageSampleResult, AdsTxtResult, OgImageResult, ServerHardeningResult, SourceMapExposureResult, SecurityTxtResult, FaviconManifestResult, AssetWeightResult, CookieAuditResult, RedirectChainResult } from "./network-checks";
import { TlsCertInfo } from "./tls-check";
import { EmailAuthInfo } from "./dns-email-auth";
import { DnsSecurityInfo } from "./dns-security";
import { LegalPagesResult } from "./legal-pages";
import { SiteContext } from "./site-context";
import { SiteCrawlResult } from "./site-crawl";
export interface ModuleContext {
    signals: Signals;
    deep: DeepSignals;
    brokenLinks: BrokenLinkResult;
    imageSample: ImageSampleResult;
    adsTxt: AdsTxtResult;
    ogImage: OgImageResult;
    pageSpeed: PageSpeedSummary;
    tlsCert: TlsCertInfo;
    emailAuth: EmailAuthInfo;
    serverHardening: ServerHardeningResult;
    dnsSecurity: DnsSecurityInfo;
    sourceMapExposure: SourceMapExposureResult;
    securityTxt: SecurityTxtResult;
    faviconManifest: FaviconManifestResult;
    assetWeights: AssetWeightResult;
    legalPages: LegalPagesResult;
    siteContext: SiteContext;
    siteCrawl: SiteCrawlResult;
    cookieFlags: CookieAuditResult;
    redirectChain: RedirectChainResult;
}
/**
 * Builds a real module (same shape, same pass/warn/fail scoring engine
 * as every other module) out of the Lighthouse/PageSpeed Insights data
 * — previously that data only ever reached the person via the JSON/PDF
 * export's separate `pageSpeed` field; it had no card in the actual
 * Full Deep Audit module list in the app itself. Returns null when no
 * real-browser pass was run (locked plan, or not requested) so callers
 * simply skip pushing anything rather than showing an empty module.
 */
export declare function buildLighthouseModule(pageSpeed: PageSpeedSummary): AuditModule | null;
export declare function buildAuditModules(ctx: ModuleContext): AuditModule[];
