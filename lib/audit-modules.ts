import { AuditModule, AuditModuleFinding, PageSpeedSummary } from "./types";
import { Signals } from "./analyze";
import { DeepSignals } from "./deep-signals";
import { BrokenLinkResult, ImageSampleResult, AdsTxtResult, OgImageResult, ServerHardeningResult, SourceMapExposureResult, SecurityTxtResult, FaviconManifestResult, AssetWeightResult } from "./network-checks";
import { TlsCertInfo } from "./tls-check";
import { EmailAuthInfo } from "./dns-email-auth";
import { DnsSecurityInfo } from "./dns-security";
import { LegalPagesResult } from "./legal-pages";
import { SiteContext } from "./site-context";

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
}

type Severity = "critical" | "high" | "medium" | "low";

function pass(label: string, detail: string, evidence?: string): AuditModuleFinding {
  return { label, status: "pass", detail, evidence };
}
function warn(label: string, detail: string, evidence?: string, severity: Severity = "medium"): AuditModuleFinding {
  return { label, status: "warn", detail, evidence, severity };
}
function fail(label: string, detail: string, evidence?: string, severity: Severity = "high"): AuditModuleFinding {
  return { label, status: "fail", detail, evidence, severity };
}

// Fraction of a module's score lost per finding at each severity. Score
// (quantitative, 0-10) and status (qualitative alarm level) are both
// driven by this table but combined differently below — a module can
// score fairly high while still being flagged "critical" because one
// finding is severe, which a flat pass/fail ratio could never surface.
const SEVERITY_WEIGHT: Record<Severity, number> = { critical: 1, high: 0.65, medium: 0.35, low: 0.12 };

function statusFromFindings(findings: AuditModuleFinding[]): { status: AuditModule["status"]; score: number } {
  const total = findings.length || 1;
  let lost = 0;
  let hasCritical = false;
  let severeFailCount = 0;
  let anyFailOrWarn = false;

  for (const f of findings) {
    if (f.status === "fail") {
      anyFailOrWarn = true;
      const sev = f.severity ?? "high";
      lost += SEVERITY_WEIGHT[sev];
      if (sev === "critical") hasCritical = true;
      if (sev === "critical" || sev === "high") severeFailCount++;
    } else if (f.status === "warn") {
      anyFailOrWarn = true;
      const sev = f.severity ?? "medium";
      lost += SEVERITY_WEIGHT[sev] * 0.5;
    }
  }

  const score = Math.max(0, Math.min(10, Math.round((10 - (lost / total) * 10) * 10) / 10));

  // Status is severity-driven, not score-driven: one critical finding (an
  // exposed .env file, an expired cert, HTTPS entirely absent) marks the
  // whole module critical regardless of how many other checks passed.
  let status: AuditModule["status"] = "good";
  if (hasCritical || severeFailCount >= 2) status = "critical";
  else if (anyFailOrWarn) status = "warning";

  return { status, score };
}

function makeModule(id: string, label: string, summary: string, findings: AuditModuleFinding[]): AuditModule {
  const { status, score } = statusFromFindings(findings);
  return { id, label, status, score, summary, findings };
}

export function buildAuditModules(ctx: ModuleContext): AuditModule[] {
  const { signals: s, deep: d, brokenLinks, imageSample, adsTxt, ogImage, pageSpeed } = ctx;
  const modules: AuditModule[] = [];

  /* 1. SEO ────────────────────────────────────────────────────────── */
  modules.push(
    makeModule(
      "seo",
      "SEO",
      "Crawlability, indexability, and on-page search signals.",
      [
        s.title
          ? s.title.length >= 15 && s.title.length <= 65
            ? pass("Title tag", `${s.title.length} characters — within the ideal range.`)
            : warn("Title tag", `${s.title.length} characters — outside the ideal 15-65 range.`)
          : fail("Title tag", "Missing entirely."),
        s.metaDescription
          ? s.metaDescription.length <= 160
            ? pass("Meta description", `${s.metaDescription.length} characters.`)
            : warn("Meta description", `${s.metaDescription.length} characters — will be truncated in search results.`)
          : fail("Meta description", "Missing entirely."),
        s.hasCanonical ? pass("Canonical tag", "Present.") : warn("Canonical tag", "Missing — risk of duplicate-content dilution."),
        s.h1Count === 1 ? pass("H1 heading", "Exactly one H1 found.") : fail("H1 heading", `${s.h1Count} H1 tags found (should be exactly 1).`),
        s.robotsTxt.exists
          ? s.robotsTxt.blocksAllCrawlers
            ? fail("robots.txt", "Blocks all crawlers site-wide.", undefined, "critical")
            : pass("robots.txt", `Found, ${s.robotsTxt.ruleCount} rule(s).`)
          : warn("robots.txt", "Not found at the site root."),
        s.sitemap.exists
          ? pass("sitemap.xml", `Found, ${s.sitemap.urlCount} ${s.sitemap.isSitemapIndex ? "nested sitemap(s)" : "URL(s)"} listed.`)
          : warn("sitemap.xml", "Not found."),
        s.hasStructuredData ? pass("Structured data", "JSON-LD present.") : warn("Structured data", "No JSON-LD found."),
        s.robotsTxt.exists && !s.robotsTxt.blocksAllCrawlers && s.robotsTxt.referencesSitemap
          ? pass("robots<->sitemap link", "robots.txt correctly references the sitemap.")
          : warn("robots<->sitemap link", "robots.txt doesn't reference a sitemap."),
      ]
    )
  );

  /* 2. Performance ────────────────────────────────────────────────── */
  modules.push(
    makeModule(
      "performance",
      "Performance",
      "Real measured response time, page weight, and render-blocking resources.",
      [
        s.security.responseTimeMs < 500
          ? pass("Server response time", `${s.security.responseTimeMs}ms — fast.`)
          : s.security.responseTimeMs < 1500
          ? warn("Server response time", `${s.security.responseTimeMs}ms — acceptable.`)
          : fail("Server response time", `${s.security.responseTimeMs}ms — slow, hurts first impression and Core Web Vitals.`),
        s.htmlSizeKb < 100
          ? pass("HTML document size", `${s.htmlSizeKb} KB.`)
          : warn("HTML document size", `${s.htmlSizeKb} KB — on the heavy side for a document.`),
        s.renderBlockingStylesheets <= 3
          ? pass("Render-blocking stylesheets", `${s.renderBlockingStylesheets} found.`)
          : warn("Render-blocking stylesheets", `${s.renderBlockingStylesheets} found — consider deferring non-critical CSS.`),
        s.externalScriptCount <= 8
          ? pass("External scripts", `${s.externalScriptCount} loaded.`)
          : warn("External scripts", `${s.externalScriptCount} loaded — each adds a network round-trip.`),
        d.images.lazyLoadedCount > 0 || d.images.total === 0
          ? pass("Lazy-loaded images", `${d.images.lazyLoadedCount} of ${d.images.total} images use loading="lazy".`)
          : warn("Lazy-loaded images", `0 of ${d.images.total} images use loading="lazy".`),
        s.security.redirectHopCount === 0
          ? pass("Redirect chain", "Direct — no redirect hops before reaching this page.")
          : warn("Redirect chain", `${s.security.redirectHopCount} hop(s) before reaching the final page.`),
        s.security.hasCompression
          ? /\bbr\b/i.test(s.security.contentEncoding || "")
            ? pass("Response compression", `Brotli (br) — the most efficient modern compression.`)
            : /zstd/i.test(s.security.contentEncoding || "")
            ? pass("Response compression", `Zstandard (zstd) — modern, fast compression.`)
            : /gzip/i.test(s.security.contentEncoding || "")
            ? warn("Response compression", `Gzip only — switching to Brotli typically cuts another 15-20% off transfer size.`)
            : pass("Response compression", `Content-Encoding: ${s.security.contentEncoding}.`)
          : warn("Response compression", "No Content-Encoding header detected — enable gzip/brotli."),
        imageSample.oversized.length === 0
          ? pass("Sampled image weight", `${imageSample.checked} image(s) checked, none over 500KB.`)
          : fail("Sampled image weight", `${imageSample.oversized.length} of ${imageSample.checked} sampled images exceed 500KB.`),
        (() => {
          const aw = ctx.assetWeights;
          const total = aw.scriptKb + aw.styleKb + aw.imageKb;
          if (!aw.checked || total === 0) return pass("Asset payload distribution", "No external script/stylesheet/image assets to weigh.");
          const heaviest = aw.scriptKb >= aw.styleKb && aw.scriptKb >= aw.imageKb ? "scripts" : aw.imageKb >= aw.styleKb ? "images" : "stylesheets";
          const detail = `Estimated ~${total}KB total \u2014 scripts ~${aw.scriptKb}KB (${aw.scriptCount}), stylesheets ~${aw.styleKb}KB (${aw.styleCount}), images ~${aw.imageKb}KB (${aw.imageCount}). ${heaviest} are the heaviest category.`;
          return total > 2000 ? warn("Asset payload distribution", detail) : pass("Asset payload distribution", detail);
        })(),
        s.iframeTotal === 0
          ? pass("Layout shift risk (embeds)", "No <iframe> elements on this page.")
          : s.iframeMissingDimensions === 0
          ? pass("Layout shift risk (embeds)", `${s.iframeTotal} <iframe>(s), all with explicit width/height.`)
          : warn("Layout shift risk (embeds)", `${s.iframeMissingDimensions} of ${s.iframeTotal} <iframe>(s) missing explicit width/height — a common CLS cause.`),
      ]
    )
  );

  /* 3. Security headers ───────────────────────────────────────────── */
  modules.push(
    makeModule(
      "security-headers",
      "Security Headers",
      "Real HTTP response headers that protect visitors and the site itself.",
      [
        s.security.finalIsHttps ? pass("HTTPS", "Site is served over HTTPS.") : fail("HTTPS", "Site is not served over HTTPS.", undefined, "critical"),
        s.security.httpDowngradeDetected
          ? fail("Redirect downgrade", "Redirect chain drops from HTTPS to HTTP.", undefined, "critical")
          : pass("Redirect downgrade", "No HTTPS to HTTP downgrade detected."),
        s.security.hasHsts
          ? s.security.hstsMaxAge !== null && s.security.hstsMaxAge < 15552000
            ? warn("Strict-Transport-Security", `Present, but max-age=${s.security.hstsMaxAge}s is under the recommended 180 days.`)
            : pass(
                "Strict-Transport-Security",
                `Present, max-age=${s.security.hstsMaxAge ?? "?"}s${s.security.hstsIncludesSubDomains ? ", includeSubDomains" : ""}${s.security.hstsPreload ? ", preload" : ""}.`
              )
          : warn("Strict-Transport-Security", "Missing."),
        s.security.hasHsts && !s.security.hstsIncludesSubDomains
          ? warn("HSTS includeSubDomains", "Not set — subdomains aren't covered by HSTS enforcement.")
          : s.security.hasHsts
          ? pass("HSTS includeSubDomains", "Set.")
          : pass("HSTS includeSubDomains", "N/A — HSTS not present."),
        s.security.hasCsp
          ? s.security.cspAllowsUnsafeInline || s.security.cspAllowsUnsafeEval || s.security.cspAllowsWildcardSource
            ? warn(
                "Content-Security-Policy",
                `Present but weakened: ${[
                  s.security.cspAllowsUnsafeInline && "'unsafe-inline'",
                  s.security.cspAllowsUnsafeEval && "'unsafe-eval'",
                  s.security.cspAllowsWildcardSource && "wildcard (*) source",
                ]
                  .filter(Boolean)
                  .join(", ")} weakens script/style origin restrictions.`
              )
            : pass("Content-Security-Policy", "Present, no unsafe-inline/unsafe-eval/wildcard sources detected.")
          : warn("Content-Security-Policy", "Missing."),
        s.security.hasXFrameOptions ? pass("X-Frame-Options", "Present.") : warn("X-Frame-Options", "Missing — clickjacking risk."),
        s.security.hasXContentTypeOptions
          ? pass("X-Content-Type-Options", "Set to nosniff.")
          : warn("X-Content-Type-Options", "Missing."),
        s.security.hasReferrerPolicy
          ? s.security.referrerPolicyIsWeak
            ? warn("Referrer-Policy", "Present but set to a permissive value that leaks the full URL cross-origin.")
            : pass("Referrer-Policy", "Present with a privacy-conscious value.")
          : warn("Referrer-Policy", "Missing."),
        s.security.hasPermissionsPolicy ? pass("Permissions-Policy", "Present.") : warn("Permissions-Policy", "Missing."),
        s.security.hasCoop ? pass("Cross-Origin-Opener-Policy", "Present.") : warn("Cross-Origin-Opener-Policy", "Missing — leaves cross-origin window references open."),
        s.security.hasCoep ? pass("Cross-Origin-Embedder-Policy", "Present.") : warn("Cross-Origin-Embedder-Policy", "Missing."),
        s.security.hasCorp ? pass("Cross-Origin-Resource-Policy", "Present.") : warn("Cross-Origin-Resource-Policy", "Missing."),
        s.security.corsAllowsAnyOrigin
          ? s.security.corsAllowsCredentialsWithWildcard
            ? fail("CORS configuration", "Access-Control-Allow-Origin: * combined with allow-credentials: true — a serious CORS misconfiguration.", undefined, "critical")
            : warn("CORS configuration", "Access-Control-Allow-Origin: * — any origin can read this response.")
          : pass("CORS configuration", "No wildcard Access-Control-Allow-Origin detected."),
        s.security.exposesServerHeader
          ? warn("Server header exposure", `Server header reveals: "${s.security.serverHeaderValue}".`)
          : pass("Server header exposure", "Not exposing identifying server software."),
        s.security.exposesPoweredBy
          ? fail("X-Powered-By", "Header exposes the underlying framework to attackers.")
          : pass("X-Powered-By", "Not exposed."),
        s.security.cacheControlIsPublicOnSensitivePage
          ? warn("Cache-Control on sensitive path", "This URL looks account/admin-sensitive but Cache-Control is public — could let shared caches store private responses.")
          : pass("Cache-Control on sensitive path", "No public-cache-on-sensitive-path issue detected."),
        s.security.cookieCount === 0
          ? pass("Cookie security", "No cookies set on this response.")
          : s.security.cookiesMissingSecure === 0 && s.security.cookiesMissingHttpOnly === 0 && s.security.cookiesMissingSameSite === 0
          ? pass("Cookie security", `${s.security.cookieCount} cookie(s) set, all with Secure, HttpOnly, and SameSite.`)
          : warn(
              "Cookie security",
              `${s.security.cookieCount} cookie(s) set — ${s.security.cookiesMissingSecure} missing Secure, ${s.security.cookiesMissingHttpOnly} missing HttpOnly, ${s.security.cookiesMissingSameSite} missing SameSite.`
            ),
        s.security.cookieCount === 0
          ? pass("Cookie classification", "No cookies to classify.")
          : (() => {
              const parts = [`${s.security.cookiesSessionCount} session`, `${s.security.cookiesPersistentCount} persistent`];
              if (s.security.cookiesTrackingSuspectedCount > 0) parts.push(`${s.security.cookiesTrackingSuspectedCount} likely tracking`);
              return s.security.cookiesTrackingSuspectedCount > 0
                ? warn("Cookie classification", `${parts.join(", ")} cookie(s) — tracking cookies present without a visible consent flow being verifiable here.`)
                : pass("Cookie classification", `${parts.join(", ")} cookie(s).`);
            })(),
        s.security.mixedContentCount === 0
          ? pass("Mixed content", "No HTTP resources found on this HTTPS page.")
          : fail("Mixed content", `${s.security.mixedContentCount} resource(s) load over plain HTTP on an HTTPS page — browsers may block or warn on these.`),
        s.security.formCountTotal === 0
          ? pass("Form action security", "No forms on this page.")
          : s.security.formsWithInsecureAction === 0
          ? pass("Form action security", `${s.security.formCountTotal} form(s) found, none submit over plain HTTP.`)
          : fail("Form action security", `${s.security.formsWithInsecureAction} of ${s.security.formCountTotal} form(s) submit to an insecure http:// action on an HTTPS page.`),
      ]
    )
  );

  /* 3b. SSL / TLS certificate ─────────────────────────────────────── */
  const tls = ctx.tlsCert;
  const tlsFindings: AuditModuleFinding[] = [];
  if (!s.security.finalIsHttps) {
    tlsFindings.push(fail("HTTPS availability", "Site is not served over HTTPS — no TLS certificate to inspect.", undefined, "critical"));
  } else if (!tls.fetched) {
    tlsFindings.push(warn("TLS handshake", tls.error || "Could not complete a direct TLS handshake to inspect the certificate."));
  } else {
    tlsFindings.push(
      tls.isExpired
        ? fail("Certificate expiration", `Certificate expired on ${tls.validTo}.`)
        : tls.daysUntilExpiry !== null && tls.daysUntilExpiry < 14
        ? warn("Certificate expiration", `Certificate expires in ${tls.daysUntilExpiry} day(s) (${tls.validTo}).`)
        : pass("Certificate expiration", `Valid until ${tls.validTo}${tls.daysUntilExpiry !== null ? ` (${tls.daysUntilExpiry} days remaining)` : ""}.`)
    );
    tlsFindings.push(
      tls.isSelfSigned
        ? fail("Certificate issuer", "Certificate appears self-signed (issuer CN matches subject CN).", undefined, "critical")
        : pass("Certificate issuer", `Issued by ${tls.issuerOrg || tls.issuerCN || "a recognized CA"}.`)
    );
    tlsFindings.push(
      tls.hostnameMatches
        ? pass("Hostname / SAN match", `Certificate covers this hostname (${tls.sanCount} SAN entr${tls.sanCount === 1 ? "y" : "ies"}).`)
        : fail("Hostname / SAN match", "Certificate's subject/SAN entries do not match the requested hostname.")
    );
    tlsFindings.push(
      tls.isWeakProtocol
        ? fail("TLS protocol version", `Negotiated ${tls.protocol} — deprecated and insecure.`)
        : pass("TLS protocol version", `Negotiated ${tls.protocol || "an unknown protocol"}.`)
    );
    tlsFindings.push(
      tls.cipherName
        ? pass("Cipher suite", `Negotiated ${tls.cipherName}.`)
        : warn("Cipher suite", "Could not determine the negotiated cipher.")
    );
    if (tls.keyBits) {
      tlsFindings.push(
        tls.keyBits < 2048
          ? warn("Key strength", `${tls.keyType || "Key"} at ${tls.keyBits} bits — below the 2048-bit RSA-equivalent baseline.`)
          : pass("Key strength", `${tls.keyType || "Key"} at ${tls.keyBits} bits.`)
      );
    }
  }
  modules.push(makeModule("ssl-tls", "SSL / TLS Certificate", "Live TLS handshake and certificate chain inspection.", tlsFindings));

  /* 3c. Email authentication (SPF / DKIM / DMARC) ─────────────────── */
  const ea = ctx.emailAuth;
  const emailFindings: AuditModuleFinding[] = [];
  if (!ea.fetched) {
    emailFindings.push(warn("DNS lookup", ea.error || "Could not complete DNS lookups for email authentication records."));
  } else {
    emailFindings.push(
      ea.hasSpf
        ? ea.spfIsPermissive
          ? warn("SPF record", `Present but permissive: "${ea.spfRecord}" doesn't end in -all, allowing unauthorized senders.`)
          : pass("SPF record", `Present and enforced: "${ea.spfRecord}".`)
        : warn("SPF record", "No SPF (v=spf1) TXT record found — mail can be spoofed from this domain.")
    );
    if (ea.hasSpf) {
      emailFindings.push(
        ea.spfExceedsLookupLimit
          ? fail(
              "SPF lookup limit",
              `~${ea.spfLookupCount} DNS-lookup mechanisms found in the SPF record, over RFC 7208's hard limit of 10 \u2014 receiving mail servers will return a permerror and may treat SPF as unset entirely.`,
              undefined,
              "high"
            )
          : pass("SPF lookup limit", `~${ea.spfLookupCount} of the 10 allowed DNS-lookup mechanisms used.`)
      );
    }
    emailFindings.push(
      ea.hasDmarc
        ? ea.dmarcPolicy === "reject" || ea.dmarcPolicy === "quarantine"
          ? pass("DMARC policy", `Enforced at p=${ea.dmarcPolicy}.`)
          : warn("DMARC policy", `Present but set to p=${ea.dmarcPolicy || "unknown"} — monitoring only, not enforced.`)
        : warn("DMARC policy", "No DMARC (_dmarc TXT) record found.")
    );
    emailFindings.push(
      ea.hasDkimOnAnyCommonSelector
        ? pass("DKIM", `A DKIM record was found on a common selector (checked: ${ea.dkimSelectorsChecked.join(", ")}).`)
        : warn("DKIM", `No DKIM record found on common selectors (checked: ${ea.dkimSelectorsChecked.join(", ")}) — custom selectors aren't detectable this way.`)
    );
  }
  modules.push(makeModule("email-auth", "Email Authentication (SPF/DKIM/DMARC)", "Live DNS TXT record checks for domain email spoofing protection.", emailFindings));

  /* 3d. Server hardening: dangerous methods, exposed paths ────────── */
  const sh = ctx.serverHardening;
  const shFindings: AuditModuleFinding[] = [];
  if (!sh.checked) {
    shFindings.push(warn("Server hardening probe", "Could not complete the server hardening probe for this site."));
  } else {
    shFindings.push(
      sh.exposesDangerousMethods
        ? fail("Dangerous HTTP methods", `Server allows: ${sh.allowedMethods.filter((m) => ["PUT", "DELETE", "TRACE", "CONNECT"].includes(m)).join(", ")}.`)
        : pass("Dangerous HTTP methods", sh.allowedMethods.length ? `Only allows: ${sh.allowedMethods.join(", ")}.` : "No unsafe methods detected.")
    );
    shFindings.push(
      sh.exposedPaths.length > 0
        ? fail("Exposed configuration files", `Publicly accessible: ${sh.exposedPaths.map((p) => p.path).join(", ")}.`, undefined, "critical")
        : pass("Exposed configuration files", "No common sensitive files (.env, .git, backups) are publicly accessible.")
    );
    shFindings.push(
      sh.directoryListingDetected
        ? fail("Directory listing", "A directory listing was found exposed on this server.", undefined, "critical")
        : pass("Directory listing", "No directory listing detected on sampled paths.")
    );
  }
  modules.push(makeModule("server-hardening", "Server Hardening", "Safe, read-only probes for dangerous HTTP methods, exposed config files, and directory listing.", shFindings));

  /* 3e. DNS security: CAA + dangling CNAME / subdomain takeover ───── */
  const dnsSec = ctx.dnsSecurity;
  const dnsFindings: AuditModuleFinding[] = [];
  if (!dnsSec.fetched) {
    dnsFindings.push(warn("DNS security lookup", dnsSec.error || "Could not complete DNS security lookups."));
  } else {
    dnsFindings.push(
      dnsSec.hasCaaRecords
        ? pass("CAA record", `Certificate issuance restricted to: ${dnsSec.caaIssuers.join(", ") || "specified issuer(s)"}.`)
        : warn("CAA record", "No CAA record found — any public CA can issue certificates for this domain.")
    );
    dnsFindings.push(
      dnsSec.dnssecEnabled
        ? pass("DNSSEC", "DNSSEC signing verified — DNS responses for this zone are cryptographically authenticated.")
        : warn("DNSSEC", "DNSSEC is not enabled — DNS responses for this zone cannot be cryptographically verified, leaving it more exposed to cache poisoning/spoofing.")
    );
    if (dnsSec.cnameTarget) {
      dnsFindings.push(
        dnsSec.possibleDanglingCname
          ? fail(
              "Dangling CNAME / subdomain takeover",
              `CNAME points to ${dnsSec.cnameTarget} (${dnsSec.cnamePointsToKnownService}), which does not resolve — this pattern is consistent with a claimable, unclaimed third-party resource.`,
              undefined,
              "critical"
            )
          : pass("Dangling CNAME / subdomain takeover", `CNAME target (${dnsSec.cnameTarget}) resolves normally.`)
      );
    } else {
      dnsFindings.push(pass("Dangling CNAME / subdomain takeover", "No CNAME record — not applicable."));
    }
    dnsFindings.push(
      dnsSec.nsRecords.length === 0
        ? warn("Nameserver records", "No NS records could be resolved for this domain.")
        : dnsSec.nsProviderDiversity
        ? pass("Nameserver provider diversity", `${dnsSec.nsRecords.length} nameserver(s) across multiple providers: ${dnsSec.nsRecords.join(", ")}.`)
        : warn("Nameserver provider diversity", `All ${dnsSec.nsRecords.length} nameserver(s) belong to a single provider (${dnsSec.nsRecords.join(", ")}) — that provider going down takes the whole zone offline.`, undefined, "medium")
    );
    dnsFindings.push(
      dnsSec.hasSoaRecord
        ? pass("SOA record", "Start of Authority record resolves correctly for this zone.")
        : warn("SOA record", "No SOA record could be resolved \u2014 unusual for a properly delegated zone.")
    );
    dnsFindings.push(
      dnsSec.mxRecords.length > 0
        ? pass("MX records", `${dnsSec.mxRecords.length} mail exchanger(s) configured: ${dnsSec.mxRecords.map((m) => `${m.exchange} (priority ${m.priority})`).join(", ")}.`)
        : pass("MX records", "No MX records \u2014 this domain doesn't receive email directly.")
    );
  }
  modules.push(makeModule("dns-security", "DNS Security (CAA, DNSSEC, Subdomain Takeover & Zone Health)", "Live DNS checks for certificate-issuance restrictions, DNSSEC signing, dangling CNAME takeover risk, nameserver redundancy, and mail routing.", dnsFindings));

  /* 3f. Subresource Integrity & source map exposure ──────────────── */
  const sri = d.sri;
  const smExp = ctx.sourceMapExposure;
  const sriFindings: AuditModuleFinding[] = [
    sri.crossOriginScriptCount === 0
      ? pass("Script SRI", "No cross-origin <script> tags found.")
      : sri.crossOriginScriptsMissingIntegrity === 0
      ? pass("Script SRI", `All ${sri.crossOriginScriptCount} cross-origin script(s) have an integrity attribute.`)
      : warn("Script SRI", `${sri.crossOriginScriptsMissingIntegrity} of ${sri.crossOriginScriptCount} cross-origin script(s) are missing Subresource Integrity — a compromised CDN could silently modify this code.`),
    sri.crossOriginStylesheetCount === 0
      ? pass("Stylesheet SRI", "No cross-origin stylesheets found.")
      : sri.crossOriginStylesheetsMissingIntegrity === 0
      ? pass("Stylesheet SRI", `All ${sri.crossOriginStylesheetCount} cross-origin stylesheet(s) have an integrity attribute.`)
      : warn("Stylesheet SRI", `${sri.crossOriginStylesheetsMissingIntegrity} of ${sri.crossOriginStylesheetCount} cross-origin stylesheet(s) are missing Subresource Integrity.`),
    !smExp.checked
      ? warn("Source map exposure", "Could not complete the source map exposure probe.")
      : smExp.exposedSourceMaps.length === 0
      ? pass("Source map exposure", `No exposed .js.map files found (sampled ${smExp.scriptsSampled} script${smExp.scriptsSampled === 1 ? "" : "s"}).`)
      : warn("Source map exposure", `${smExp.exposedSourceMaps.length} publicly accessible .js.map file(s) found — can reveal original, unminified source code.`, undefined, "high"),
  ];
  modules.push(makeModule("sri-source-maps", "Subresource Integrity & Source Maps", "SRI coverage on cross-origin assets and public exposure of JS source maps.", sriFindings));

  /* 3g. Trust signals: security.txt, favicon & manifest ───────────── */
  const secTxt = ctx.securityTxt;
  const favMan = ctx.faviconManifest;
  const trustFindings: AuditModuleFinding[] = [
    !secTxt.exists
      ? warn("Vulnerability disclosure (security.txt)", `No /.well-known/security.txt found — security researchers have no documented way to report issues responsibly.`)
      : !secTxt.hasContact
      ? warn("Vulnerability disclosure (security.txt)", "security.txt exists but has no Contact: field.")
      : secTxt.isExpired
      ? warn("Vulnerability disclosure (security.txt)", `security.txt exists but its Expires date (${secTxt.expiresAt}) has passed — per RFC 9116 it should be treated as stale.`)
      : pass("Vulnerability disclosure (security.txt)", `security.txt found with a valid contact${secTxt.hasExpires ? " and expiry date" : ""}.`),
    favMan.faviconIcoExists
      ? pass("Favicon", "/favicon.ico resolves correctly.")
      : warn("Favicon", "/favicon.ico is missing or unreachable — most browsers still request this as a fallback."),
    !favMan.manifestUrl
      ? warn("Web app manifest", "No <link rel=\"manifest\"> found — required for installable/PWA behavior on mobile.")
      : favMan.manifestExists
      ? pass("Web app manifest", "manifest.json is linked and resolves correctly.")
      : fail("Web app manifest", `manifest is linked (${favMan.manifestUrl}) but the file doesn't resolve — PWA install will fail.`),
  ];
  modules.push(makeModule("trust-signals", "Trust Signals (security.txt, Favicon & Manifest)", "Vulnerability disclosure policy and PWA/browser icon setup.", trustFindings));

  /* 3g-2. Legal & trust pages — ranked against the detected site type ─ */
  const site = ctx.siteContext;
  const legal = ctx.legalPages;
  const rankLabel: Record<string, string> = { necessary: "Necessary", recommended: "Recommended", skippable: "Skippable" };
  const legalFindings: AuditModuleFinding[] = legal.pages.map((p) => {
    const tag = `[${rankLabel[p.rank]}]`;
    if (p.found) {
      const via = p.discoveredVia === "guessed_path" ? " (not linked in nav/footer, found by direct probe)" : "";
      return pass(`${tag} ${p.label}`, `Found and live at ${p.url}${via}. ${p.rankReason}.`, `HTTP ${p.httpStatus} — ${p.url}`);
    }
    if (p.rank === "necessary") {
      return fail(`${tag} ${p.label}`, `Not found anywhere on the site (checked nav/footer links and conventional URLs). ${p.rankReason}.`);
    }
    if (p.rank === "recommended") {
      return warn(`${tag} ${p.label}`, `Not found. ${p.rankReason}.`);
    }
    return pass(`${tag} ${p.label}`, `Not found, but not expected for this site type. ${p.rankReason}.`);
  });
  const legalSummary = `Detected as: ${site.label}${
    site.reasons.length ? ` (based on ${site.reasons.join("; ")})` : ""
  }. Each legal/trust page below is ranked necessary, recommended, or skippable specifically for this site type, not a one-size-fits-all checklist.`;
  modules.push(makeModule("legal-trust-pages", "Legal & Trust Pages", legalSummary, legalFindings));

  /* 3h. Content quality: duplicate headings & readability ─────────── */
  const contentFindings: AuditModuleFinding[] = [
    s.duplicateH2Texts.length === 0
      ? pass("Duplicate H2 headings", "No repeated <h2> text found.")
      : warn("Duplicate H2 headings", `${s.duplicateH2Texts.length} <h2> text(s) repeat verbatim (e.g. "${s.duplicateH2Texts[0]}") — hurts scannability and heading-based navigation.`),
    s.duplicateH3Texts.length === 0
      ? pass("Duplicate H3 headings", "No repeated <h3> text found.")
      : warn("Duplicate H3 headings", `${s.duplicateH3Texts.length} <h3> text(s) repeat verbatim (e.g. "${s.duplicateH3Texts[0]}").`),
    s.wordCount === 0
      ? warn("Reading time", "No visible body text detected.")
      : pass("Reading time", `~${s.readingTimeMinutes} min read at ${s.wordCount} words (200 wpm).`),
    s.fleschKincaidGrade === null
      ? pass("Readability (Flesch-Kincaid)", "Not enough text to score.")
      : s.fleschKincaidGrade <= 10
      ? pass("Readability (Flesch-Kincaid)", `Grade level ${s.fleschKincaidGrade} — accessible to a broad audience.`)
      : warn("Readability (Flesch-Kincaid)", `Grade level ${s.fleschKincaidGrade} — noticeably dense; consider shorter sentences and simpler words for a general audience.`),
  ];
  modules.push(makeModule("content-quality", "Content Quality & Readability", "Duplicate heading detection, estimated reading time, and Flesch-Kincaid grade level.", contentFindings));

  /* 4. Accessibility ──────────────────────────────────────────────── */
  modules.push(

    makeModule(
      "accessibility",
      "Accessibility",
      "Real markup checks for keyboard, screen-reader, and form usability.",
      [
        d.accessibility.htmlLangValue
          ? pass("Document language", `lang="${d.accessibility.htmlLangValue}" declared.`)
          : fail("Document language", "No lang attribute on <html> — screen readers can't pick a pronunciation."),
        d.accessibility.totalFormInputs === 0
          ? pass("Form labels", "No form inputs on this page.")
          : d.accessibility.inputsWithoutLabel === 0
          ? pass("Form labels", `All ${d.accessibility.totalFormInputs} input(s) have an associated label.`)
          : fail("Form labels", `${d.accessibility.inputsWithoutLabel} of ${d.accessibility.totalFormInputs} inputs have no label or aria-label.`),
        d.accessibility.totalButtons === 0
          ? pass("Button names", "No <button> elements on this page.")
          : d.accessibility.buttonsWithoutAccessibleName === 0
          ? pass("Button names", `All ${d.accessibility.totalButtons} button(s) have accessible text.`)
          : warn("Button names", `${d.accessibility.buttonsWithoutAccessibleName} button(s) have no visible text or aria-label.`),
        d.accessibility.linksWithoutAccessibleName === 0
          ? pass("Link names", "All links have accessible text.")
          : warn("Link names", `${d.accessibility.linksWithoutAccessibleName} link(s) have no discernible text (empty or icon-only with no label).`),
        s.imgTotal === 0
          ? pass("Image alt text", "No images on this page.")
          : s.imgMissingAlt === 0
          ? pass("Image alt text", `All ${s.imgTotal} image(s) have alt text.`)
          : fail("Image alt text", `${s.imgMissingAlt} of ${s.imgTotal} images are missing alt text.`),
        d.accessibility.positiveTabindexCount === 0
          ? pass("tabindex usage", "No positive tabindex values found (good — avoids scrambled tab order).")
          : warn("tabindex usage", `${d.accessibility.positiveTabindexCount} element(s) use a positive tabindex, which can scramble keyboard navigation order.`),
        d.accessibility.ariaHiddenOnBodyOrHtml
          ? fail("aria-hidden misuse", 'aria-hidden="true" found on <html> or <body> — this hides the entire page from assistive tech.', undefined, "critical")
          : pass("aria-hidden misuse", "Not misused on root elements."),
        d.htmlStructure.hasMainTag ? pass("Landmark regions", "A <main> landmark is present.") : warn("Landmark regions", "No <main> element — screen reader users can't skip to content."),
        d.accessibility.iframesWithoutTitle === 0
          ? pass("iframe titles", "No untitled <iframe> elements found.")
          : warn("iframe titles", `${d.accessibility.iframesWithoutTitle} <iframe> element(s) missing a title attribute.`),
      ]
    )
  );

  /* 5. Mobile responsiveness ──────────────────────────────────────── */
  modules.push(
    makeModule(
      "mobile",
      "Mobile Responsiveness",
      "Viewport configuration, touch icons, and responsive CSS signals.",
      [
        d.mobile.viewportContent
          ? d.mobile.viewportHasWidthDevice
            ? pass("Viewport meta tag", `Present: "${d.mobile.viewportContent}".`)
            : warn("Viewport meta tag", `Present but missing width=device-width: "${d.mobile.viewportContent}".`)
          : fail("Viewport meta tag", "Missing entirely — page likely renders desktop-width on mobile."),
        d.mobile.viewportAllowsUserScaling
          ? pass("Pinch-to-zoom", "Not disabled.")
          : fail("Pinch-to-zoom", "Disabled via user-scalable=no or maximum-scale=1 — an accessibility violation."),
        d.mobile.mediaQueryCount > 0
          ? pass("Responsive CSS", `${d.mobile.mediaQueryCount} @media quer${d.mobile.mediaQueryCount === 1 ? "y" : "ies"} found in inline styles.`)
          : d.mobile.responsiveClassHintCount > 0
          ? pass(
              "Responsive CSS",
              `No inline @media rules, but ${d.mobile.responsiveClassHintCount} responsive utility-class usage(s) found (e.g. Tailwind-style sm:/md:/lg: breakpoints) — real evidence of a responsive framework, even though its rules live in an external stylesheet we don't fetch.`
            )
          : warn("Responsive CSS", "No @media queries found in inline <style> blocks, and no responsive utility-class framework detected (external stylesheets aren't inspected)."),
        d.mobile.appleTouchIconCount > 0
          ? pass("Apple touch icon", `${d.mobile.appleTouchIconCount} declared.`)
          : warn("Apple touch icon", "Missing — iOS home-screen bookmarks fall back to a screenshot."),
        s.hasThemeColor ? pass("Theme color", "Declared for mobile browser chrome.") : warn("Theme color", "Not declared."),
      ]
    )
  );

  /* 6. UX / UI ─────────────────────────────────────────────────────── */
  modules.push(
    makeModule(
      "ux-ui",
      "UX / UI",
      "Visual hierarchy and conversion-path signals.",
      [
        s.hasAboveFoldCta
          ? pass("Above-the-fold CTA", "A clear call-to-action is present in the first screen of content.")
          : fail("Above-the-fold CTA", "No clear call-to-action detected near the top of the page."),
        s.h1Count === 1 ? pass("Primary heading clarity", "Single, clear H1.") : warn("Primary heading clarity", `${s.h1Count} H1 tags dilute the visual hierarchy.`),
        s.headingOrderValid ? pass("Heading nesting", "Levels are nested in order.") : fail("Heading nesting", "Heading levels skip a step, breaking the visual/document outline."),
        d.htmlStructure.divRatio < 0.6
          ? pass("Markup semantics", `${Math.round(d.htmlStructure.divRatio * 100)}% of elements are <div> — reasonable balance.`)
          : warn("Markup semantics", `${Math.round(d.htmlStructure.divRatio * 100)}% of elements are <div> — heavy "div soup" can indicate inconsistent component structure.`),
        s.formCount > 0 && s.inputCount > 8
          ? warn("Form length", `A form has ${s.inputCount} fields — long forms suppress completion.`)
          : pass("Form length", s.formCount > 0 ? `Forms have a reasonable field count (${s.inputCount}).` : "No long forms detected."),
        s.wordCount >= 150
          ? pass("Content depth", `${s.wordCount} words of visible copy.`)
          : warn("Content depth", `Only ${s.wordCount} words of visible copy — may read as thin content.`),
        d.vibeCoded.distinctFontFamilyCount <= 2
          ? pass("Font family limit", `${d.vibeCoded.distinctFontFamilyCount} distinct font-family declaration(s) — within the recommended max of 2.`)
          : warn("Font family limit", `${d.vibeCoded.distinctFontFamilyCount} distinct font-family declarations found — more than 2 typically hurts visual consistency.`),
        d.vibeCoded.loremIpsumHint
          ? fail("Placeholder text", "Lorem ipsum placeholder copy found in the shipped markup.")
          : pass("Placeholder text", "No lorem ipsum placeholder copy detected."),
      ]
    )
  );

  /* 6b. AI-Generated / "Vibe-Coded" Pattern Detection ─────────────────
     Heuristic, contextual signals only. A single occurrence of any one
     pattern is never treated as a failure — only meaningful combinations
     and severity are scored, per Audityxe's own methodology: personal
     taste is never imposed as a universal rule. ────────────────────── */
  const vc = d.vibeCoded;
  const vibeFindings: AuditModuleFinding[] = [];
  const vibeSignalCount = vc.totalSignalCount;

  vibeFindings.push(
    vc.purpleBlueGradientHints > 0
      ? warn("Purple-to-blue gradients", `${vc.purpleBlueGradientHints} purple-to-blue gradient declaration(s) detected — one of the most recognizable generic-AI-template signals.`)
      : pass("Purple-to-blue gradients", "None detected.")
  );
  vibeFindings.push(
    vc.gradientTextHints > 0
      ? warn("Gradient hero text", `${vc.gradientTextHints} clipped-gradient text declaration(s) found — a common templated-hero pattern.`)
      : pass("Gradient hero text", "None detected.")
  );
  vibeFindings.push(
    vc.glassmorphismHints > 0
      ? warn("Glassmorphism / frosted glass", `${vc.glassmorphismHints} backdrop-filter: blur() usage(s) found — heavy frosted-glass card styling is a generic-template hallmark when overused.`)
      : pass("Glassmorphism / frosted glass", "None detected.")
  );
  vibeFindings.push(
    vc.emojiInHeadingOrButtonCount > 0
      ? warn("Emojis in production UI", `${vc.emojiInHeadingOrButtonCount} emoji character(s) found inside headings or buttons.`)
      : pass("Emojis in production UI", "None found in headings or buttons.")
  );
  vibeFindings.push(
    vc.pillBadgeAboveHeadingHints > 0
      ? warn("Pill badge above hero headline", `${vc.pillBadgeAboveHeadingHints} pill/badge element(s) sitting directly above an <h1> — a very common generic-SaaS hero pattern.`)
      : pass("Pill badge above hero headline", "None detected.")
  );
  vibeFindings.push(
    vc.genericIconRowHints > 0
      ? warn("Repeated icon rows", `${vc.genericIconRowHints} run(s) of 3+ consecutive icons found — can indicate generic \"three icon boxes\" filler blocks.`)
      : pass("Repeated icon rows", "None detected.")
  );
  vibeFindings.push(
    vc.scrollFadeInAnimationHints > 0
      ? warn("Scroll-triggered fade-in animation", `${vc.scrollFadeInAnimationHints} scroll-reveal / IntersectionObserver animation hint(s) found.`)
      : pass("Scroll-triggered fade-in animation", "None detected.")
  );
  vibeFindings.push(
    vc.cursorGlowOrParticleHints > 0
      ? warn("Cursor-following glow / particles", `${vc.cursorGlowOrParticleHints} cursor-glow or particle-trail script hint(s) found.`)
      : pass("Cursor-following glow / particles", "None detected.")
  );
  vibeFindings.push(
    vc.hoverOpacityFadeHints > 0
      ? warn("Hover opacity fade on buttons", `${vc.hoverOpacityFadeHints} :hover rule(s) fade opacity down — reduces perceived affordance versus a solid hover state.`)
      : pass("Hover opacity fade on buttons", "None detected.")
  );
  vibeFindings.push(
    vc.grainyTextureHints > 0
      ? warn("Grainy canvas texture overlays", `${vc.grainyTextureHints} noise/grain texture reference(s) found layered over backgrounds.`)
      : pass("Grainy canvas texture overlays", "None detected.")
  );
  vibeFindings.push(
    vc.largeRadiusHints > 0
      ? warn("Oversized card corner radius", `${vc.largeRadiusHints} border-radius declaration(s) in the 20px–32px range — larger radii read as a generic AI-template default.`)
      : pass("Card corner radius", "No 20px+ oversized radii detected.")
  );
  vibeFindings.push(
    vc.interFontOnlyHint
      ? warn("Ubiquitous Inter font", "Inter is the only font-family declared site-wide — the single most common default in AI-generated UIs.")
      : pass("Font choice", "Not exclusively the default Inter font stack.")
  );
  vibeFindings.push(
    vc.spaceGroteskInstrumentSerifPairHint
      ? warn("Space Grotesk + Instrument Serif pairing", "This exact font pairing is one of the most recognizable generic-AI-template signatures.")
      : pass("Font pairing", "Not the generic Space Grotesk + Instrument Serif combination.")
  );
  vibeFindings.push(
    vc.emDashCount >= 3
      ? warn("Overused em dashes", `${vc.emDashCount} em dash (—) characters found in copy — heavy use is a common AI-generated-copy tell.`)
      : pass("Em dash usage", `${vc.emDashCount} found — not excessive.`)
  );
  vibeFindings.push(
    vc.buzzwordsFound.length > 0
      ? warn("Generic SaaS buzzwords", `Found: ${vc.buzzwordsFound.join(", ")}.`)
      : pass("Generic SaaS buzzwords", "None of the common generic-AI marketing phrases detected.")
  );

  const vibeSummary =
    vibeSignalCount === 0
      ? "No AI-generated / vibe-coded pattern signals detected."
      : vibeSignalCount <= 2
      ? `${vibeSignalCount} isolated signal(s) found — normal design choices, not a pattern on their own.`
      : vibeSignalCount <= 5
      ? `${vibeSignalCount} signals found together — starting to read as a templated, AI-generated aesthetic.`
      : `${vibeSignalCount} signals found together — strong combined evidence of an unedited, AI-generated "vibe-coded" build.`;

  const vibeModule = makeModule("vibe-coded-signals", "AI-Generated / Vibe-Coded Pattern Detection", vibeSummary, vibeFindings);
  // Override status: judged on combined signal count/severity, not the
  // pass/warn ratio used elsewhere — one warn here is never a "critical".
  vibeModule.status = vibeSignalCount >= 6 ? "critical" : vibeSignalCount >= 3 ? "warning" : "good";
  vibeModule.score = Math.max(0, Math.round((10 - vibeSignalCount * 1.2) * 10) / 10);
  modules.push(vibeModule);

  /* 7. Technical stack ────────────────────────────────────────────── */
  const stackFindings: AuditModuleFinding[] = [];
  if (d.techStack.detectedCMS) {
    const versionSuffix = d.techStack.detectedCMSVersion ? ` (version ${d.techStack.detectedCMSVersion})` : "";
    stackFindings.push(pass("CMS / platform", `Detected: ${d.techStack.detectedCMS}${versionSuffix}. Confidence: ${d.techStack.confidence}.`));
  } else if (d.techStack.detectedFrameworks.length > 0)
    stackFindings.push(
      pass("CMS / platform", `No traditional CMS — custom-built with ${d.techStack.detectedFrameworks.join(", ")}, which is a legitimate and common approach.`)
    );
  else stackFindings.push(warn("CMS / platform", "No known CMS or JS framework signature detected — stack couldn't be identified.", undefined, "low"));

  if (d.techStack.detectedFrameworks.length > 0)
    stackFindings.push(pass("Frontend framework", `Detected: ${d.techStack.detectedFrameworks.join(", ")}.`));
  else stackFindings.push(warn("Frontend framework", "No known JS framework signature detected.", undefined, "low"));

  if (d.techStack.detectedCssFrameworks.length > 0)
    stackFindings.push(pass("CSS framework", `Detected: ${d.techStack.detectedCssFrameworks.join(", ")}.`));

  if (d.techStack.detectedEcommercePlatforms.length > 0)
    stackFindings.push(pass("E-commerce platform", `Detected: ${d.techStack.detectedEcommercePlatforms.join(", ")}.`));

  if (d.techStack.detectedPageBuilders.length > 0)
    stackFindings.push(pass("Page builder", `Detected: ${d.techStack.detectedPageBuilders.join(", ")} \u2014 worth knowing when hand-editing markup, since builder plugins often regenerate it.`));

  stackFindings.push(
    d.techStack.jqueryDetected
      ? warn("jQuery", "Detected — consider whether it's still needed alongside a modern framework.", undefined, "low")
      : pass("jQuery", "Not detected.")
  );
  stackFindings.push(
    d.techStack.detectedAnalytics.length > 0
      ? pass("Analytics", `Detected: ${d.techStack.detectedAnalytics.join(", ")}.`)
      : warn("Analytics", "No analytics tool detected.", undefined, "low")
  );
  if (d.techStack.detectedAbTestingTools.length > 0)
    stackFindings.push(pass("A/B testing / experimentation", `Detected: ${d.techStack.detectedAbTestingTools.join(", ")}.`));
  if (d.techStack.detectedCookieConsentTools.length > 0)
    stackFindings.push(pass("Cookie consent tooling", `Detected: ${d.techStack.detectedCookieConsentTools.join(", ")}.`));
  else if (d.techStack.detectedAnalytics.length > 0 || d.techStack.detectedTagManagers.length > 0)
    stackFindings.push(
      warn("Cookie consent tooling", "Analytics/tag-manager scripts are present but no cookie-consent tool was detected \u2014 worth confirming compliance is handled another way.", undefined, "medium")
    );
  stackFindings.push(
    d.techStack.detectedCDNs.length > 0
      ? pass("CDN-hosted libraries", `Detected: ${d.techStack.detectedCDNs.join(", ")}.`)
      : pass("CDN-hosted libraries", "None detected (may be self-hosting all assets).")
  );
  if (d.techStack.hostingProvider) stackFindings.push(pass("Hosting provider", `Detected: ${d.techStack.hostingProvider}.`));
  if (d.techStack.generator) {
    const v = d.techStack.generatorVersion ? ` (parsed version: ${d.techStack.generatorVersion})` : "";
    stackFindings.push(pass("Generator meta tag", `"${d.techStack.generator}"${v}.`));
  }
  modules.push(makeModule("tech-stack", "Technical Stack", "What the site is actually built, hosted, and instrumented with.", stackFindings));

  /* 8. HTML structure ─────────────────────────────────────────────── */
  modules.push(
    makeModule(
      "html-structure",
      "HTML Structure",
      "Document validity and semantic markup quality.",
      [
        s.security.hasDoctype ? pass("Doctype", "<!DOCTYPE html> present.") : fail("Doctype", "Missing — triggers quirks-mode rendering.", undefined, "low"),
        d.htmlStructure.hasHeaderTag && d.htmlStructure.hasMainTag && d.htmlStructure.hasFooterTag
          ? pass("Landmark structure", "header/main/footer all present.")
          : warn(
              "Landmark structure",
              `Missing: ${[
                !d.htmlStructure.hasHeaderTag && "<header>",
                !d.htmlStructure.hasMainTag && "<main>",
                !d.htmlStructure.hasFooterTag && "<footer>",
              ]
                .filter(Boolean)
                .join(", ")}.`
            ),
        d.htmlStructure.duplicateIdCount === 0
          ? pass("Unique IDs", `All ${d.htmlStructure.totalIdCount} id attribute(s) are unique.`)
          : fail("Unique IDs", `${d.htmlStructure.duplicateIdCount} duplicate id value(s) found — invalid HTML.`),
        d.htmlStructure.deprecatedTagsUsed.length === 0
          ? pass("Deprecated tags", "None found.")
          : fail("Deprecated tags", `Found: ${d.htmlStructure.deprecatedTagsUsed.join(", ")}.`),
        s.htmlLangSet ? pass("Language declaration", "Present.") : fail("Language declaration", "Missing lang attribute."),
        s.charsetSet ? pass("Charset declaration", "Present.") : fail("Charset declaration", "Missing <meta charset>."),
      ]
    )
  );

  /* 9. Meta tags ───────────────────────────────────────────────────── */
  modules.push(
    makeModule(
      "meta-tags",
      "Meta Tags",
      "Full audit of head-section metadata.",
      [
        s.title ? pass("Title", `"${s.title.slice(0, 60)}${s.title.length > 60 ? "…" : ""}"`) : fail("Title", "Missing."),
        s.metaDescription ? pass("Description", "Present.") : fail("Description", "Missing."),
        s.htmlLangSet ? pass("Language", "Declared.") : fail("Language", "Not declared."),
        s.charsetSet ? pass("Charset", "Declared.") : fail("Charset", "Not declared."),
        s.hasViewport ? pass("Viewport", "Declared.") : fail("Viewport", "Not declared."),
        s.hasCanonical ? pass("Canonical", "Declared.") : warn("Canonical", "Not declared."),
        s.hasRobotsMeta
          ? s.robotsBlocksIndexing
            ? fail("Robots meta", "Set to noindex.")
            : pass("Robots meta", "Present, allows indexing.")
          : pass("Robots meta", "Not set (defaults to indexable — fine)."),
        d.techStack.generator ? pass("Generator", `"${d.techStack.generator}".`) : warn("Generator", "Not declared."),
      ]
    )
  );

  /* 10. Sitemap / robots.txt ──────────────────────────────────────── */
  modules.push(
    makeModule(
      "sitemap-robots",
      "Sitemap & Robots.txt",
      "Live crawl-control files fetched directly from the site.",
      [
        s.robotsTxt.fetched
          ? s.robotsTxt.exists
            ? pass(
                "robots.txt exists",
                `${s.robotsTxt.ruleCount} allow/disallow rule(s).`,
                `Sent a live GET request to ${s.robotsTxt.checkedUrl} \u2014 received HTTP ${s.robotsTxt.httpStatus}.`
              )
            : fail(
                "robots.txt exists",
                "Not found at the domain root.",
                `Sent a live GET request to ${s.robotsTxt.checkedUrl} \u2014 received HTTP ${s.robotsTxt.httpStatus ?? "no response"}.`
              )
          : warn("robots.txt exists", "Could not be checked.", `Request to ${s.robotsTxt.checkedUrl} timed out or failed to connect.`),
        s.robotsTxt.exists && s.robotsTxt.blocksAllCrawlers
          ? fail("Crawler access", "Disallow: / blocks all crawlers site-wide.", `Parsed the fetched ${s.robotsTxt.checkedUrl}: found a "User-agent: *" block containing "Disallow: /".`, "critical")
          : pass("Crawler access", "Not globally blocked."),
        s.sitemap.fetched
          ? s.sitemap.exists
            ? pass(
                "sitemap.xml exists",
                `Valid XML, ${s.sitemap.urlCount} entr${s.sitemap.urlCount === 1 ? "y" : "ies"}.`,
                `Sent a live GET request to ${s.sitemap.checkedUrl} \u2014 received HTTP ${s.sitemap.httpStatus}, parsed as valid sitemap XML.`
              )
            : fail(
                "sitemap.xml exists",
                "Not found or not valid XML.",
                `Sent a live GET request to ${s.sitemap.checkedUrl} \u2014 received HTTP ${s.sitemap.httpStatus ?? "no response"}${s.sitemap.httpStatus && s.sitemap.httpStatus < 300 ? ", but the body did not parse as valid sitemap XML" : ""}.`
              )
          : warn("sitemap.xml exists", "Could not be checked.", `Request to ${s.sitemap.checkedUrl} timed out or failed to connect.`),
        s.sitemap.exists && s.sitemap.hasLastmod
          ? pass("Freshness data", "<lastmod> present in sitemap entries.")
          : s.sitemap.exists
          ? warn("Freshness data", "No <lastmod> dates in the sitemap.")
          : warn("Freshness data", "N/A — no sitemap found."),
        s.robotsTxt.exists && s.sitemap.exists
          ? s.robotsTxt.referencesSitemap
            ? pass("Cross-reference", "robots.txt references the sitemap.")
            : warn("Cross-reference", "Sitemap exists but robots.txt doesn't reference it.")
          : warn("Cross-reference", "N/A — one or both files missing."),
      ]
    )
  );

  /* 11. Structured data ───────────────────────────────────────────── */
  const missingFieldEntries = Object.entries(d.structuredData.missingRequiredFieldsByType);
  modules.push(
    makeModule(
      "structured-data",
      "Structured Data",
      "JSON-LD schema.org markup, parsed and validated.",
      [
        d.structuredData.blockCount > 0
          ? pass("JSON-LD present", `${d.structuredData.blockCount} block(s) found.`)
          : fail("JSON-LD present", "No JSON-LD structured data found on this page."),
        d.structuredData.parseErrorCount === 0
          ? pass("Valid JSON", "All JSON-LD blocks parsed without error.")
          : fail("Valid JSON", `${d.structuredData.parseErrorCount} block(s) contain invalid JSON.`),
        d.structuredData.types.length > 0
          ? pass("Schema types found", d.structuredData.types.join(", "))
          : fail("Schema types found", "None."),
        missingFieldEntries.length === 0
          ? pass("Required fields", d.structuredData.blockCount > 0 ? "All detected schema types have their required fields." : "N/A.")
          : fail(
              "Required fields",
              missingFieldEntries.map(([type, fields]) => `${type} missing ${fields.join(", ")}`).join("; ")
            ),
        d.structuredData.hasOrganization || d.structuredData.hasWebSite
          ? pass("Organization/WebSite schema", "Present — helps search engines understand the entity.")
          : warn("Organization/WebSite schema", "Missing — consider adding for brand knowledge-panel eligibility."),
      ]
    )
  );

  /* 12. Broken links ──────────────────────────────────────────────── */
  modules.push(
    makeModule(
      "broken-links",
      "Broken Links",
      `Live-checked ${brokenLinks.checked} link(s) found on the page via real HTTP requests.`,
      [
        brokenLinks.checked === 0
          ? warn("Links found", "No checkable links found on this page.")
          : pass("Links found", `${brokenLinks.checked} link(s) sampled and checked live${brokenLinks.skippedTotal > 0 ? ` (${brokenLinks.skippedTotal} more not sampled)` : ""}.`),
        ...(() => {
          const nonZero = brokenLinks.broken.filter((b) => b.status !== 0);
          const ambiguous = nonZero.filter((b) => [401, 403, 429].includes(b.status));
          const unambiguous = nonZero.filter((b) => ![401, 403, 429].includes(b.status));
          const findings: AuditModuleFinding[] = [];
          if (unambiguous.length === 0) {
            findings.push(pass("Broken (404/410/5xx)", "None found in the sample."));
          } else {
            findings.push(
              fail("Broken (404/410/5xx)", unambiguous.map((b) => `${b.url} -> ${b.status}`).join("; "))
            );
          }
          if (ambiguous.length > 0) {
            findings.push(
              warn(
                "Blocked automated checks",
                `${ambiguous.map((b) => `${b.url} -> ${b.status}`).join("; ")} (may be intentionally blocking bots rather than genuinely broken — verify manually).`
              )
            );
          }
          return findings;
        })(),
        brokenLinks.broken.filter((b) => b.status === 0).length === 0
          ? pass("Unreachable links", "None in the sample.")
          : warn(
              "Unreachable links",
              `${brokenLinks.broken.filter((b) => b.status === 0).length} link(s) timed out or failed to connect (may be firewalled against bots rather than truly broken).`
            ),
      ]
    )
  );

  /* 13. Image optimization ────────────────────────────────────────── */
  modules.push(
    makeModule(
      "images",
      "Image Optimization",
      "Format, sizing, and lazy-loading, including a live weight sample.",
      [
        d.images.total === 0
          ? pass("Images found", "No <img> elements on this page.")
          : pass("Images found", `${d.images.total} total.`),
        d.images.missingDimensions === 0
          ? pass("Explicit dimensions", "All images declare width/height (prevents layout shift).")
          : warn("Explicit dimensions", `${d.images.missingDimensions} of ${d.images.total} images are missing width/height attributes.`),
        d.images.modernFormatCount > 0
          ? pass("Modern formats", `${d.images.modernFormatCount} image(s) reference WebP/AVIF.`)
          : d.images.legacyFormatCount > 0
          ? warn("Modern formats", `0 images use WebP/AVIF — ${d.images.legacyFormatCount} use legacy JPG/PNG/GIF.`)
          : pass("Modern formats", "N/A."),
        d.images.lazyLoadedCount > 0 || d.images.total === 0
          ? pass("Lazy loading", `${d.images.lazyLoadedCount} of ${d.images.total} images use loading="lazy".`)
          : warn("Lazy loading", "No images use native lazy loading."),
        d.images.dataUriCount === 0
          ? pass("Inline base64 images", "None — keeps HTML payload lean.")
          : warn("Inline base64 images", `${d.images.dataUriCount} image(s) inlined as base64, bloating the HTML document.`),
        imageSample.oversized.length === 0
          ? pass("Live weight sample", `${imageSample.checked} image(s) checked over HTTP — none exceed 500KB.`)
          : fail(
              "Live weight sample",
              imageSample.oversized.map((o) => `${o.url} — ${o.sizeKb}KB`).join("; ")
            ),
      ]
    )
  );

  /* 14. Third-party scripts ───────────────────────────────────────── */
  modules.push(
    makeModule(
      "third-party-scripts",
      "Third-Party Scripts",
      `${d.thirdPartyScripts.totalExternalScripts} external script domain(s) detected and categorized.`,
      [
        d.thirdPartyScripts.totalExternalScripts <= 6
          ? pass("Total external scripts", `${d.thirdPartyScripts.totalExternalScripts} domain(s) — lean.`)
          : warn("Total external scripts", `${d.thirdPartyScripts.totalExternalScripts} domain(s) — each adds latency and a trust dependency.`),
        d.thirdPartyScripts.analyticsScripts.length > 0
          ? pass("Analytics", d.thirdPartyScripts.analyticsScripts.join(", "))
          : warn("Analytics", "None detected."),
        d.thirdPartyScripts.tagManagerScripts.length > 0
          ? pass("Tag managers", d.thirdPartyScripts.tagManagerScripts.join(", "))
          : pass("Tag managers", "None detected."),
        d.thirdPartyScripts.chatWidgetScripts.length > 0
          ? pass("Chat/support widgets", d.thirdPartyScripts.chatWidgetScripts.join(", "))
          : pass("Chat/support widgets", "None detected."),
        d.thirdPartyScripts.fontScripts.length > 0
          ? pass("Web font services", d.thirdPartyScripts.fontScripts.join(", "))
          : pass("Web font services", "None detected (may self-host fonts)."),
        d.thirdPartyScripts.otherThirdPartyScripts.length === 0
          ? pass("Uncategorized third parties", "None.")
          : warn("Uncategorized third parties", d.thirdPartyScripts.otherThirdPartyScripts.join(", ")),
      ]
    )
  );

  /* 15. Social metadata ───────────────────────────────────────────── */
  modules.push(
    makeModule(
      "social-metadata",
      "Social Metadata",
      "Open Graph and Twitter Card tags, with a live check that the preview image actually loads.",
      [
        d.socialMeta.ogType && d.socialMeta.ogUrl && s.hasOgTitle && s.hasOgDescription
          ? pass("Open Graph completeness", "og:title, og:description, og:type, og:url all present.")
          : warn(
              "Open Graph completeness",
              `Missing: ${[
                !s.hasOgTitle && "og:title",
                !s.hasOgDescription && "og:description",
                !d.socialMeta.ogType && "og:type",
                !d.socialMeta.ogUrl && "og:url",
              ]
                .filter(Boolean)
                .join(", ")}.`
            ),
        d.socialMeta.ogSiteName ? pass("og:site_name", `"${d.socialMeta.ogSiteName}".`) : warn("og:site_name", "Not set."),
        d.socialMeta.twitterCard
          ? pass("Twitter Card type", `"${d.socialMeta.twitterCard}".`)
          : warn("Twitter Card type", "Not set — Twitter/X falls back to a generic link preview."),
        d.socialMeta.twitterSite ? pass("twitter:site", `"${d.socialMeta.twitterSite}".`) : warn("twitter:site", "Not set."),
        !d.socialMeta.ogImageUrl
          ? fail("og:image", "Not set — shared links show no preview image.")
          : !ogImage.checked
          ? warn("og:image", "Set, but couldn't be verified live.")
          : ogImage.exists && ogImage.isImage
          ? pass("og:image", `Live-checked — loads correctly${ogImage.sizeKb ? ` (${ogImage.sizeKb}KB)` : ""}.`)
          : warn(
              "og:image",
              `Set to "${d.socialMeta.ogImageUrl}" but a live check couldn't confirm it loads as an image — this can be a genuine broken URL, or a CDN blocking automated requests. Verify manually if unsure.`
            ),
      ]
    )
  );

  /* 16. Basic monetization setup ──────────────────────────────────── */
  const adNetworks = [
    ...(d.monetization.adSenseDetected ? ["Google AdSense"] : []),
    ...d.monetization.otherAdNetworksDetected,
  ];
  modules.push(
    makeModule(
      "monetization",
      "Basic Monetization Setup",
      "Ad networks, affiliate links, payment processors, and a live ads.txt check.",
      [
        adsTxt.fetched
          ? adsTxt.exists
            ? pass("ads.txt", `Found, ${adsTxt.entryCount} entr${adsTxt.entryCount === 1 ? "y" : "ies"}.`)
            : adNetworks.length > 0
            ? fail("ads.txt", "Ad network scripts detected but no ads.txt found — programmatic demand may be blocked.")
            : warn("ads.txt", "Not found (fine if the site doesn't run programmatic ads).")
          : warn("ads.txt", "Could not be checked."),
        adNetworks.length > 0
          ? pass("Ad networks detected", adNetworks.join(", "))
          : pass("Ad networks detected", "None — site may not be ad-monetized."),
        d.monetization.affiliateLinkCount > 0
          ? pass("Affiliate links", `${d.monetization.affiliateLinkCount} link(s) with affiliate/tracking parameters detected.`)
          : pass("Affiliate links", "None detected."),
        d.monetization.paymentProcessorsDetected.length > 0
          ? pass("Payment processors", d.monetization.paymentProcessorsDetected.join(", "))
          : pass("Payment processors", "None detected."),
        d.monetization.donationPlatformsDetected.length > 0
          ? pass("Donation/support platforms", d.monetization.donationPlatformsDetected.join(", "))
          : pass("Donation/support platforms", "None detected."),
        d.monetization.hasCartOrCheckoutSignals
          ? pass("E-commerce signals", "Cart/checkout patterns detected.")
          : pass("E-commerce signals", "None detected."),
      ]
    )
  );

  /* 17. Real browser-rendered audit (PageSpeed Insights / Lighthouse) ── */
  if (pageSpeed.fetched) {
    const cwv = pageSpeed.coreWebVitals;
    modules.push(
      makeModule(
        "browser-audit",
        "Browser-Rendered Audit",
        "Measured by actually rendering this page in real Chrome and running a full audit \u2014 not estimated from HTML alone.",
        [
          pageSpeed.performanceScore !== null
            ? (pageSpeed.performanceScore >= 90 ? pass : pageSpeed.performanceScore >= 50 ? warn : fail)(
                "Rendered performance score",
                `${pageSpeed.performanceScore}/100.`,
                `Real Chrome rendered this page end-to-end and scored it ${pageSpeed.performanceScore}/100 on performance.`
              )
            : warn("Rendered performance score", "Could not be measured for this run."),
          pageSpeed.accessibilityScore !== null
            ? (pageSpeed.accessibilityScore >= 90 ? pass : pageSpeed.accessibilityScore >= 50 ? warn : fail)(
                "Rendered accessibility score",
                `${pageSpeed.accessibilityScore}/100.`,
                `Real Chrome ran a full accessibility audit (contrast, ARIA, labels, focus order) against the rendered page and scored ${pageSpeed.accessibilityScore}/100.`
              )
            : warn("Rendered accessibility score", "Could not be measured for this run."),
          pageSpeed.bestPracticesScore !== null
            ? (pageSpeed.bestPracticesScore >= 90 ? pass : pageSpeed.bestPracticesScore >= 50 ? warn : fail)(
                "Best practices score",
                `${pageSpeed.bestPracticesScore}/100.`
              )
            : warn("Best practices score", "Could not be measured for this run."),
          cwv.lcpMs !== null
            ? (cwv.lcpMs <= 2500 ? pass : cwv.lcpMs <= 4000 ? warn : fail)(
                "Largest Contentful Paint",
                `${(cwv.lcpMs / 1000).toFixed(1)}s (target: under 2.5s).`,
                `Measured the actual time for the largest visible element to render in a real browser: ${cwv.lcpMs}ms.`
              )
            : warn("Largest Contentful Paint", "Not measured."),
          cwv.clsScore !== null
            ? (cwv.clsScore <= 0.1 ? pass : cwv.clsScore <= 0.25 ? warn : fail)(
                "Cumulative Layout Shift",
                `${cwv.clsScore.toFixed(3)} (target: under 0.1).`,
                `Measured actual visual instability during page load in a real browser: a CLS score of ${cwv.clsScore.toFixed(3)}.`
              )
            : warn("Cumulative Layout Shift", "Not measured."),
          cwv.tbtMs !== null
            ? (cwv.tbtMs <= 200 ? pass : cwv.tbtMs <= 600 ? warn : fail)(
                "Total Blocking Time",
                `${cwv.tbtMs}ms (target: under 200ms).`,
                `Measured actual main-thread blocking time between first paint and interactivity in a real browser: ${cwv.tbtMs}ms.`
              )
            : warn("Total Blocking Time", "Not measured."),
          ...pageSpeed.topIssues.slice(0, 4).map((issue) =>
            warn(issue.title, issue.description.slice(0, 200), `Flagged by a real browser-rendered audit (check id: ${issue.id}).`)
          ),
        ]
      )
    );
  }

  return modules;
}
