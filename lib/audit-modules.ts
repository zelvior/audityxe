import { AuditModule, AuditModuleFinding, PageSpeedSummary } from "./types";
import { Signals } from "./analyze";
import { DeepSignals } from "./deep-signals";
import { BrokenLinkResult, ImageSampleResult, AdsTxtResult, OgImageResult } from "./network-checks";

export interface ModuleContext {
  signals: Signals;
  deep: DeepSignals;
  brokenLinks: BrokenLinkResult;
  imageSample: ImageSampleResult;
  adsTxt: AdsTxtResult;
  ogImage: OgImageResult;
  pageSpeed: PageSpeedSummary;
}

function pass(label: string, detail: string, evidence?: string): AuditModuleFinding {
  return { label, status: "pass", detail, evidence };
}
function warn(label: string, detail: string, evidence?: string): AuditModuleFinding {
  return { label, status: "warn", detail, evidence };
}
function fail(label: string, detail: string, evidence?: string): AuditModuleFinding {
  return { label, status: "fail", detail, evidence };
}

function statusFromFindings(findings: AuditModuleFinding[]): { status: AuditModule["status"]; score: number } {
  const total = findings.length || 1;
  const failCount = findings.filter((f) => f.status === "fail").length;
  const warnCount = findings.filter((f) => f.status === "warn").length;
  const passCount = findings.filter((f) => f.status === "pass").length;
  const score = Math.round(((passCount + warnCount * 0.5) / total) * 100) / 10; // 0-10
  let status: AuditModule["status"] = "good";
  if (failCount > 0 && failCount >= total * 0.4) status = "critical";
  else if (failCount > 0 || warnCount > total * 0.4) status = "warning";
  return { status, score: Math.max(0, Math.min(10, score)) };
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
            ? fail("robots.txt", "Blocks all crawlers site-wide.")
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
          ? pass("Response compression", "Content-Encoding header present.")
          : warn("Response compression", "No Content-Encoding header detected — enable gzip/brotli."),
        imageSample.oversized.length === 0
          ? pass("Sampled image weight", `${imageSample.checked} image(s) checked, none over 500KB.`)
          : fail("Sampled image weight", `${imageSample.oversized.length} of ${imageSample.checked} sampled images exceed 500KB.`),
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
        s.security.finalIsHttps ? pass("HTTPS", "Site is served over HTTPS.") : fail("HTTPS", "Site is not served over HTTPS."),
        s.security.httpDowngradeDetected
          ? fail("Redirect downgrade", "Redirect chain drops from HTTPS to HTTP.")
          : pass("Redirect downgrade", "No HTTPS to HTTP downgrade detected."),
        s.security.hasHsts ? pass("Strict-Transport-Security", "Present.") : warn("Strict-Transport-Security", "Missing."),
        s.security.hasCsp ? pass("Content-Security-Policy", "Present.") : warn("Content-Security-Policy", "Missing."),
        s.security.hasXFrameOptions ? pass("X-Frame-Options", "Present.") : warn("X-Frame-Options", "Missing — clickjacking risk."),
        s.security.hasXContentTypeOptions
          ? pass("X-Content-Type-Options", "Set to nosniff.")
          : warn("X-Content-Type-Options", "Missing."),
        s.security.hasReferrerPolicy ? pass("Referrer-Policy", "Present.") : warn("Referrer-Policy", "Missing."),
        s.security.exposesPoweredBy
          ? fail("X-Powered-By", "Header exposes the underlying framework to attackers.")
          : pass("X-Powered-By", "Not exposed."),
      ]
    )
  );

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
          ? fail("aria-hidden misuse", 'aria-hidden="true" found on <html> or <body> — this hides the entire page from assistive tech.')
          : pass("aria-hidden misuse", "Not misused on root elements."),
        d.htmlStructure.hasMainTag ? pass("Landmark regions", "A <main> landmark is present.") : warn("Landmark regions", "No <main> element — screen reader users can't skip to content."),
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
      ]
    )
  );

  /* 7. Technical stack ────────────────────────────────────────────── */
  const stackFindings: AuditModuleFinding[] = [];
  if (d.techStack.detectedCMS) stackFindings.push(pass("CMS / platform", `Detected: ${d.techStack.detectedCMS}.`));
  else if (d.techStack.detectedFrameworks.length > 0)
    stackFindings.push(
      pass("CMS / platform", `No traditional CMS — custom-built with ${d.techStack.detectedFrameworks.join(", ")}, which is a legitimate and common approach.`)
    );
  else stackFindings.push(warn("CMS / platform", "No known CMS or JS framework signature detected — stack couldn't be identified."));
  if (d.techStack.detectedFrameworks.length > 0)
    stackFindings.push(pass("Frontend framework", `Detected: ${d.techStack.detectedFrameworks.join(", ")}.`));
  else stackFindings.push(warn("Frontend framework", "No known JS framework signature detected."));
  stackFindings.push(
    d.techStack.jqueryDetected
      ? warn("jQuery", "Detected — consider whether it's still needed alongside a modern framework.")
      : pass("jQuery", "Not detected.")
  );
  stackFindings.push(
    d.techStack.detectedAnalytics.length > 0
      ? pass("Analytics", `Detected: ${d.techStack.detectedAnalytics.join(", ")}.`)
      : warn("Analytics", "No analytics tool detected.")
  );
  stackFindings.push(
    d.techStack.detectedCDNs.length > 0
      ? pass("CDN-hosted libraries", `Detected: ${d.techStack.detectedCDNs.join(", ")}.`)
      : pass("CDN-hosted libraries", "None detected (may be self-hosting all assets).")
  );
  if (d.techStack.generator) stackFindings.push(pass("Generator meta tag", `"${d.techStack.generator}".`));
  modules.push(makeModule("tech-stack", "Technical Stack", "What the site is actually built and instrumented with.", stackFindings));

  /* 8. HTML structure ─────────────────────────────────────────────── */
  modules.push(
    makeModule(
      "html-structure",
      "HTML Structure",
      "Document validity and semantic markup quality.",
      [
        s.security.hasDoctype ? pass("Doctype", "<!DOCTYPE html> present.") : fail("Doctype", "Missing — triggers quirks-mode rendering."),
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
          ? fail("Crawler access", "Disallow: / blocks all crawlers site-wide.", `Parsed the fetched ${s.robotsTxt.checkedUrl}: found a "User-agent: *" block containing "Disallow: /".`)
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
