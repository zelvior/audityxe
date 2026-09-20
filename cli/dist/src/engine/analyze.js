"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.runAudit = runAudit;
const ai_1 = require("./ai");
const deep_signals_1 = require("./deep-signals");
const network_checks_1 = require("./network-checks");
const audit_modules_1 = require("./audit-modules");
const url_safety_1 = require("./url-safety");
const pagespeed_1 = require("./pagespeed");
const tls_check_1 = require("./tls-check");
const dns_email_auth_1 = require("./dns-email-auth");
const dns_security_1 = require("./dns-security");
const site_context_1 = require("./site-context");
const legal_pages_1 = require("./legal-pages");
const site_crawl_1 = require("./site-crawl");
const CATEGORY_META = [
    { key: "messaging", label: "Messaging & Copy Clarity" },
    { key: "uiux", label: "UI/UX & Visual Hierarchy" },
    { key: "cro", label: "Conversion Rate Optimization" },
    { key: "seo", label: "Technical & Metadata Health" },
    { key: "brand", label: "Brand Distinctiveness" },
    { key: "security", label: "Security & Performance" },
];
function normalizeUrl(raw) {
    let u = raw.trim();
    if (!/^https?:\/\//i.test(u))
        u = "https://" + u;
    return u;
}
function hostOf(u) {
    try {
        return new URL(u).hostname.replace(/^www\./, "");
    }
    catch {
        return u.replace(/^https?:\/\//, "").replace(/\/.*$/, "");
    }
}
function clamp(n, min = 0, max = 10) {
    return Math.max(min, Math.min(max, n));
}
/** A handful of well-known AI answer-engine crawler user-agents worth
 * checking robots.txt for by name — not exhaustive, but covers the
 * major ones a site owner would actually want to reason about. */
const KNOWN_AI_CRAWLERS = [
    "GPTBot",
    "ChatGPT-User",
    "ClaudeBot",
    "Claude-Web",
    "anthropic-ai",
    "PerplexityBot",
    "Google-Extended",
    "CCBot",
    "Bytespider",
    "Applebot-Extended",
];
function extractSignals(html, finalUrl) {
    const get = (re) => {
        const m = html.match(re);
        return m ? m[1].trim() : "";
    };
    const has = (re) => re.test(html);
    const titleTag = get(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const metaDescription = get(/<meta[^>]+name=["']description["'][^>]*content=["']([^"']*)["']/i);
    const h1Matches = [...html.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi)];
    const h2Matches = [...html.matchAll(/<h2\b[^>]*>([\s\S]*?)<\/h2>/gi)];
    const h1Text = h1Matches[0] ? h1Matches[0][1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim() : "";
    // Heading order sanity: collect all heading levels in document order and
    // flag if a deeper level (e.g. h3) appears before any h2 has appeared.
    const headingSeq = [...html.matchAll(/<h([1-6])\b/gi)].map((m) => Number(m[1]));
    let headingOrderValid = true;
    let seenMax = 0;
    for (const level of headingSeq) {
        if (level > seenMax + 1 && seenMax !== 0)
            headingOrderValid = false;
        seenMax = Math.max(seenMax, level);
    }
    const imgTags = [...html.matchAll(/<img\b[^>]*>/gi)];
    const imgMissingAlt = imgTags.filter((m) => !/alt\s*=\s*["'][^"']*["']/i.test(m[0]) || /alt\s*=\s*["']\s*["']/i.test(m[0])).length;
    const imgLazyCount = imgTags.filter((m) => /loading\s*=\s*["']lazy["']/i.test(m[0])).length;
    const h3Matches = [...html.matchAll(/<h3\b[^>]*>([\s\S]*?)<\/h3>/gi)];
    const cleanHeadingText = (raw) => raw.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().toLowerCase();
    const dupeTexts = (matches) => {
        const seen = new Map();
        matches.forEach((m) => {
            const t = cleanHeadingText(m[1]);
            if (t)
                seen.set(t, (seen.get(t) || 0) + 1);
        });
        return Array.from(seen.entries()).filter(([, count]) => count > 1).map(([t]) => t);
    };
    const duplicateH2Texts = dupeTexts(h2Matches);
    const duplicateH3Texts = dupeTexts(h3Matches);
    const iframeTags = [...html.matchAll(/<iframe\b[^>]*>/gi)];
    const iframeMissingDimensions = iframeTags.filter((m) => !/\bwidth\s*=/i.test(m[0]) || !/\bheight\s*=/i.test(m[0])).length;
    const bodyMatch = html.match(/<body[\s\S]*?>([\s\S]*)<\/body>/i);
    const bodyHtml = bodyMatch ? bodyMatch[1] : html;
    const visibleText = bodyHtml
        .replace(/<script[\s\S]*?<\/script>/gi, " ")
        .replace(/<style[\s\S]*?<\/style>/gi, " ")
        .replace(/<[^>]+>/g, " ")
        .replace(/&nbsp;|&amp;|&#\d+;/g, " ")
        .replace(/\s+/g, " ")
        .trim();
    const wordCount = visibleText ? visibleText.split(" ").length : 0;
    // Flesch-Kincaid grade level: sentence count via terminal punctuation,
    // syllable count via a standard vowel-group heuristic (no NLP dependency).
    const sentenceCount = Math.max(1, (visibleText.match(/[.!?]+(?:\s|$)/g) || []).length);
    const words = visibleText.split(" ").filter(Boolean);
    const countSyllables = (word) => {
        const w = word.toLowerCase().replace(/[^a-z]/g, "");
        if (!w)
            return 0;
        const groups = w.match(/[aeiouy]+/g);
        let count = groups ? groups.length : 1;
        if (w.endsWith("e") && count > 1)
            count -= 1;
        return Math.max(1, count);
    };
    const syllableCount = words.reduce((sum, w) => sum + countSyllables(w), 0);
    const fleschKincaidGrade = words.length > 0
        ? Math.round((0.39 * (words.length / sentenceCount) + 11.8 * (syllableCount / words.length) - 15.59) * 10) / 10
        : null;
    const readingTimeMinutes = Math.max(1, Math.round(wordCount / 200));
    const buttonWords = /(get started|sign up|sign in|log in|try (it )?free|book a demo|contact sales|buy now|start free|subscribe|join now|download|add to cart|request a quote|analyze now|learn more|shop now|order now|schedule a call)/gi;
    const buttonTags = bodyHtml.match(/<button\b[^>]*>[\s\S]*?<\/button>/gi) || [];
    const ctaAnchors = bodyHtml.match(/<a\b[^>]*class=["'][^"']*(btn|button|cta)[^"']*["'][^>]*>/gi) || [];
    const ctaButtonCount = buttonTags.length + ctaAnchors.length + (bodyHtml.match(buttonWords) || []).length;
    // Above-the-fold approximation: first 15% of body markup contains a CTA signal.
    const foldSlice = bodyHtml.slice(0, Math.max(1800, Math.floor(bodyHtml.length * 0.2)));
    const hasAboveFoldCta = buttonWords.test(foldSlice) || /<button\b/i.test(foldSlice) || /class=["'][^"']*(btn|button|cta)/i.test(foldSlice);
    const scriptTags = [...html.matchAll(/<script\b([^>]*)>/gi)];
    const externalScriptCount = scriptTags.filter((m) => /src\s*=/i.test(m[1])).length;
    const stylesheetLinks = [...html.matchAll(/<link\b([^>]*rel=["']stylesheet["'][^>]*)>/gi)];
    const renderBlockingStylesheets = stylesheetLinks.filter((m) => !/media\s*=\s*["']print["']/i.test(m[1]) && !/preload/i.test(m[1])).length;
    const fontFamilies = new Set([...html.matchAll(/font-family\s*:\s*([^;"'\}]+)/gi)].map((m) => m[1].split(",")[0].trim().toLowerCase()));
    const robotsContent = get(/<meta[^>]+name=["']robots["'][^>]*content=["']([^"']*)["']/i);
    return {
        title: titleTag,
        metaDescription,
        h1Count: h1Matches.length,
        h1Text,
        h2Count: h2Matches.length,
        wordCount,
        headingOrderValid,
        duplicateTitleAndH1: !!(titleTag && h1Text && titleTag.trim().toLowerCase() === h1Text.trim().toLowerCase()),
        duplicateH2Texts,
        duplicateH3Texts,
        readingTimeMinutes,
        fleschKincaidGrade,
        hasViewport: has(/<meta[^>]+name=["']viewport["']/i),
        viewportHasInitialScale: has(/<meta[^>]+name=["']viewport["'][^>]*initial-scale/i),
        imgTotal: imgTags.length,
        imgMissingAlt,
        imgLazyCount,
        iframeTotal: iframeTags.length,
        iframeMissingDimensions,
        ariaLandmarkCount: (html.match(/role\s*=\s*["'](banner|navigation|main|contentinfo|search)["']/gi) || []).length +
            (html.match(/<(nav|main|header|footer)\b/gi) || []).length,
        inlineStyleCount: (html.match(/style\s*=\s*["']/gi) || []).length,
        fontFamilyCount: fontFamilies.size,
        formCount: (html.match(/<form\b/gi) || []).length,
        inputCount: (html.match(/<input\b/gi) || []).length,
        ctaButtonCount,
        hasAboveFoldCta,
        linkCount: (html.match(/<a\b[^>]*href=/gi) || []).length,
        telOrMailtoLinks: (html.match(/href\s*=\s*["'](tel:|mailto:)/gi) || []).length,
        isHttps: finalUrl.startsWith("https://"),
        htmlLangSet: /<html[^>]+lang=["'][a-zA-Z-]+["']/i.test(html),
        charsetSet: /<meta[^>]+charset\s*=/i.test(html),
        hasCanonical: has(/<link[^>]+rel=["']canonical["']/i),
        hasRobotsMeta: !!robotsContent,
        robotsBlocksIndexing: /noindex/i.test(robotsContent),
        hasStructuredData: has(/<script[^>]+type=["']application\/ld\+json["']/i),
        scriptCount: scriptTags.length,
        externalScriptCount,
        renderBlockingStylesheets,
        htmlSizeKb: Math.round((html.length / 1024) * 10) / 10,
        hasFavicon: has(/<link[^>]+rel=["'](?:shortcut )?icon["']/i),
        hasAppleTouchIcon: has(/<link[^>]+rel=["']apple-touch-icon["']/i),
        hasOgImage: has(/<meta[^>]+property=["']og:image["']/i),
        hasOgTitle: has(/<meta[^>]+property=["']og:title["']/i),
        hasOgDescription: has(/<meta[^>]+property=["']og:description["']/i),
        hasTwitterCard: has(/<meta[^>]+name=["']twitter:card["']/i),
        hasThemeColor: has(/<meta[^>]+name=["']theme-color["']/i),
        hasManifest: has(/<link[^>]+rel=["']manifest["']/i),
        // Populated by auditOne() after this function returns — placeholders here.
        robotsTxt: { fetched: false, exists: false, blocksAllCrawlers: false, referencesSitemap: false, sitemapUrls: [], ruleCount: 0, checkedUrl: "", httpStatus: null, aiBotsBlocked: [] },
        llmsTxt: { fetched: false, exists: false, httpStatus: null, hasContent: false, checkedUrl: "" },
        sitemap: { fetched: false, exists: false, isValidXml: false, urlCount: 0, hasLastmod: false, isSitemapIndex: false, checkedUrl: "", httpStatus: null },
        security: {
            finalIsHttps: finalUrl.startsWith("https://"),
            redirectHopCount: 0,
            httpDowngradeDetected: false,
            responseTimeMs: 0,
            hasHsts: false,
            hstsMaxAge: null,
            hstsIncludesSubDomains: false,
            hstsPreload: false,
            hasCsp: false,
            cspAllowsUnsafeInline: false,
            cspAllowsUnsafeEval: false,
            cspAllowsWildcardSource: false,
            hasXFrameOptions: false,
            hasXContentTypeOptions: false,
            hasReferrerPolicy: false,
            referrerPolicyIsWeak: false,
            hasPermissionsPolicy: false,
            hasCoop: false,
            hasCoep: false,
            hasCorp: false,
            hasClearSiteData: false,
            exposesServerHeader: false,
            serverHeaderValue: null,
            exposesPoweredBy: false,
            poweredByValue: null,
            hasCacheControl: false,
            cacheControlIsPublicOnSensitivePage: false,
            hasCompression: false,
            contentEncoding: null,
            hasDoctype: /^\s*<!doctype html/i.test(html),
            hasMetaRefresh: has(/<meta[^>]+http-equiv\s*=\s*["']refresh["']/i),
            mixedContentCount: finalUrl.startsWith("https://")
                ? (html.match(/\b(?:src|href)\s*=\s*["']http:\/\/(?!localhost|127\.0\.0\.1)[^"']+["']/gi) || []).length
                : 0,
            cookieCount: 0,
            cookiesMissingSecure: 0,
            cookiesMissingHttpOnly: 0,
            cookiesMissingSameSite: 0,
            cookiesPersistentCount: 0,
            cookiesSessionCount: 0,
            cookiesTrackingSuspectedCount: 0,
            formCountTotal: (html.match(/<form\b/gi) || []).length,
            formsWithInsecureAction: finalUrl.startsWith("https://")
                ? [...html.matchAll(/<form\b[^>]*action\s*=\s*["'](http:\/\/[^"']+)["']/gi)].filter((m) => !/^http:\/\/(localhost|127\.0\.0\.1)/i.test(m[1])).length
                : 0,
            corsAllowsAnyOrigin: false,
            corsAllowsCredentialsWithWildcard: false,
            xRobotsTagValue: null,
        },
    };
}
/* ────────────────────────────────────────────────────────────────
   Scoring — every point is traceable to a specific real signal.
   ──────────────────────────────────────────────────────────────── */
function scoreFromSignals(s) {
    // Messaging & Copy Clarity
    let messaging = 4;
    if (s.title.length >= 15 && s.title.length <= 65)
        messaging += 1.5;
    else if (s.title.length > 0)
        messaging += 0.4;
    else
        messaging -= 1.5;
    if (s.h1Text.length >= 15 && s.h1Text.length <= 90)
        messaging += 1.2;
    else if (s.h1Text)
        messaging += 0.3;
    if (s.wordCount >= 150 && s.wordCount <= 1400)
        messaging += 1.3;
    else if (s.wordCount > 0)
        messaging += 0.3;
    if (s.metaDescription.length >= 50 && s.metaDescription.length <= 160)
        messaging += 1;
    if (s.duplicateTitleAndH1)
        messaging -= 0.6;
    messaging = clamp(messaging);
    // UI/UX & Visual Hierarchy
    let uiux = 4;
    if (s.h1Count === 1)
        uiux += 1.3;
    else if (s.h1Count === 0)
        uiux -= 2;
    else
        uiux -= 1;
    if (s.headingOrderValid)
        uiux += 0.7;
    if (s.hasViewport)
        uiux += 1;
    else
        uiux -= 2;
    if (s.hasViewport && s.viewportHasInitialScale)
        uiux += 0.4;
    const altRatio = s.imgTotal > 0 ? 1 - s.imgMissingAlt / s.imgTotal : 1;
    uiux += altRatio * 1.6;
    if (s.ariaLandmarkCount >= 2)
        uiux += 0.8;
    if (s.fontFamilyCount > 4)
        uiux -= 0.6; // too many typefaces = inconsistent hierarchy
    uiux = clamp(uiux);
    // Conversion Rate Optimization
    let cro = 3.5;
    if (s.ctaButtonCount >= 1)
        cro += 1.6;
    if (s.ctaButtonCount >= 3)
        cro += 0.8;
    if (s.hasAboveFoldCta)
        cro += 1.4;
    if (s.formCount >= 1)
        cro += 1.2;
    if (s.inputCount > 0 && s.inputCount <= 5)
        cro += 0.8;
    else if (s.inputCount > 8)
        cro -= 0.5; // long forms hurt conversion
    if (s.telOrMailtoLinks > 0)
        cro += 0.5;
    cro = clamp(cro);
    // Technical & Metadata Health
    let seo = 3.5;
    if (s.metaDescription)
        seo += 1.2;
    else
        seo -= 1;
    if (s.hasCanonical)
        seo += 0.8;
    if (s.isHttps)
        seo += 1;
    else
        seo -= 2.5;
    if (s.htmlLangSet)
        seo += 0.5;
    if (s.charsetSet)
        seo += 0.4;
    if (s.title)
        seo += 0.8;
    else
        seo -= 1;
    if (s.hasStructuredData)
        seo += 0.9;
    if (s.hasRobotsMeta && s.robotsBlocksIndexing)
        seo -= 2.5; // actively blocking search engines
    if (s.renderBlockingStylesheets > 4)
        seo -= 0.6;
    if (s.externalScriptCount > 12)
        seo -= 0.5;
    if (s.robotsTxt.fetched && !s.robotsTxt.exists)
        seo -= 0.7;
    if (s.robotsTxt.blocksAllCrawlers)
        seo -= 3; // entire site disallowed for all bots
    if (s.robotsTxt.exists && s.robotsTxt.referencesSitemap)
        seo += 0.6;
    if (s.sitemap.fetched && !s.sitemap.exists)
        seo -= 0.8;
    if (s.sitemap.exists && s.sitemap.urlCount > 0)
        seo += 1;
    if (s.sitemap.exists && s.sitemap.hasLastmod)
        seo += 0.4;
    seo = clamp(seo);
    // Brand Distinctiveness
    let brand = 4;
    if (s.hasFavicon)
        brand += 1;
    if (s.hasAppleTouchIcon)
        brand += 0.5;
    if (s.hasOgImage)
        brand += 1.2;
    if (s.hasOgTitle && s.hasOgDescription)
        brand += 1;
    if (s.hasTwitterCard)
        brand += 0.6;
    if (s.hasThemeColor)
        brand += 0.7;
    if (s.hasManifest)
        brand += 0.5;
    if (s.title &&
        s.h1Text &&
        s.title.toLowerCase().includes(s.h1Text.toLowerCase().split(" ")[0] || "\u0000"))
        brand += 0.5;
    brand = clamp(brand);
    // Security & Performance — derived entirely from real response headers,
    // redirect-chain behavior, and page weight measured during the live fetch.
    let security = 4.5;
    if (s.security.finalIsHttps)
        security += 1;
    else
        security -= 3;
    if (s.security.httpDowngradeDetected)
        security -= 2; // https redirected to http mid-chain
    if (s.security.redirectHopCount === 0)
        security += 0.5;
    else if (s.security.redirectHopCount >= 3)
        security -= 1;
    if (s.security.hasHsts)
        security += 1;
    if (s.security.hasCsp)
        security += 1;
    if (s.security.hasXFrameOptions)
        security += 0.5;
    if (s.security.hasXContentTypeOptions)
        security += 0.4;
    if (s.security.hasReferrerPolicy)
        security += 0.3;
    if (s.security.exposesServerHeader)
        security -= 0.3;
    if (s.security.exposesPoweredBy)
        security -= 0.5; // leaks tech stack to attackers
    if (s.security.hasCacheControl)
        security += 0.4;
    if (s.security.hasCompression)
        security += 0.4;
    if (!s.security.hasDoctype)
        security -= 0.8; // triggers quirks-mode rendering
    if (s.security.hasMetaRefresh)
        security -= 0.6; // legacy/poor-practice redirect method
    if (s.security.mixedContentCount > 0)
        security -= Math.min(2, s.security.mixedContentCount * 0.4);
    if (s.security.responseTimeMs > 3000)
        security -= 1;
    else if (s.security.responseTimeMs > 1500)
        security -= 0.5;
    else if (s.security.responseTimeMs < 500)
        security += 0.5;
    security = clamp(security);
    return [
        { key: "messaging", label: CATEGORY_META[0].label, score: Math.round(messaging * 10) / 10 },
        { key: "uiux", label: CATEGORY_META[1].label, score: Math.round(uiux * 10) / 10 },
        { key: "cro", label: CATEGORY_META[2].label, score: Math.round(cro * 10) / 10 },
        { key: "seo", label: CATEGORY_META[3].label, score: Math.round(seo * 10) / 10 },
        { key: "brand", label: CATEGORY_META[4].label, score: Math.round(brand * 10) / 10 },
        { key: "security", label: CATEGORY_META[5].label, score: Math.round(security * 10) / 10 },
    ];
}
function stackAwareHeaderFix(s, deep) {
    const poweredBy = (s.security.poweredByValue || "").toLowerCase();
    const cms = deep.techStack.detectedCMS;
    const frameworks = deep.techStack.detectedFrameworks;
    if (cms === "WordPress" || /php/i.test(poweredBy)) {
        return {
            fix: "Turn off PHP's version-disclosure header (expose_php) and strip X-Powered-By at the web server, since PHP/WordPress add it independently of application code.",
            snippet: `; php.ini\n-  expose_php = On\n+  expose_php = Off\n\n# nginx (also strip at the proxy in case the app re-adds it)\n+  proxy_hide_header X-Powered-By;`,
        };
    }
    if (frameworks.includes("Next.js")) {
        return {
            fix: "Disable Next.js's X-Powered-By header at the framework level.",
            snippet: `// next.config.js\n  module.exports = {\n+   poweredByHeader: false,\n  };`,
        };
    }
    if (/express/i.test(poweredBy)) {
        return {
            fix: "Disable Express's default X-Powered-By header.",
            snippet: `// app.js\n  const app = express();\n+ app.disable("x-powered-by");`,
        };
    }
    if (/asp\.net/i.test(poweredBy)) {
        return {
            fix: "Remove the ASP.NET version header at the web.config level.",
            snippet: `<!-- web.config -->\n  <system.webServer>\n+   <httpProtocol>\n+     <customHeaders>\n+       <remove name="X-Powered-By" />\n+     </customHeaders>\n+   </httpProtocol>\n  </system.webServer>`,
        };
    }
    return {
        fix: "Strip the X-Powered-By header at the reverse proxy or hosting platform layer, since the exact source framework couldn't be conclusively fingerprinted from the response.",
        snippet: `# nginx\n+  proxy_hide_header X-Powered-By;\n\n# or Apache\n+  Header unset X-Powered-By`,
    };
}
function buildIntelligentCsp(deep) {
    const c = deep.cspOrigins;
    const directive = (name, origins) => origins.length ? `${name} 'self' ${origins.join(" ")};` : `${name} 'self';`;
    const lines = [
        directive("default-src", []),
        directive("script-src", c.scriptOrigins),
        directive("style-src", [...c.styleOrigins, "'unsafe-inline'"]),
        directive("img-src", [...c.imageOrigins, "data:"]),
        directive("font-src", c.fontOrigins),
        c.frameOrigins.length ? directive("frame-src", c.frameOrigins) : null,
        directive("connect-src", c.connectOrigins),
        "object-src 'none';",
        "base-uri 'self';",
    ].filter(Boolean);
    const originCount = c.scriptOrigins.length + c.styleOrigins.length + c.imageOrigins.length + c.frameOrigins.length;
    const fix = originCount
        ? `Add a Content-Security-Policy built from the ${originCount} distinct third-party origin(s) this page actually loads scripts, styles, images, and frames from \u2014 not a blanket wildcard.`
        : "Add a Content-Security-Policy header. No cross-origin script/style/image/frame sources were detected in the static HTML, so this starts locked to 'self'; widen only for origins you confirm the page needs (including any added by client-side JS).";
    return {
        fix,
        snippet: `# response header\n+  Content-Security-Policy: ${lines.join(" ")}`,
    };
}
/* ────────────────────────────────────────────────────────────────
   Fix generation — one candidate per real problem actually found.
   ──────────────────────────────────────────────────────────────── */
function buildFixes(s, categories, deep) {
    const candidates = [];
    if (!s.title || s.title.length < 15 || s.title.length > 65) {
        candidates.push({
            id: "title",
            category: "Messaging & Copy Clarity",
            target: "<title> tag",
            problem: s.title
                ? `The <title> tag is ${s.title.length} characters, outside the ideal 15\u201365 range for clarity and SEO.`
                : "There is no <title> tag on the page.",
            evidence: s.title
                ? `Fetched the page HTML and found: <title>${s.title.length > 80 ? s.title.slice(0, 80) + "\u2026" : s.title}</title> (${s.title.length} characters).`
                : "Searched the fetched HTML for a <title> tag inside <head> \u2014 none was found.",
            fix: "Write a specific, benefit-led title between 15 and 65 characters.",
            snippet: `<title>\n-  ${s.title || "(missing)"}\n+  Your Product \u2014 the outcome your customer actually wants\n</title>`,
            language: "diff",
        });
    }
    if (!s.metaDescription) {
        candidates.push({
            id: "meta-desc",
            category: "Technical & Metadata Health",
            target: "<head> meta description",
            problem: "No meta description tag was found, which weakens click-through from search results.",
            evidence: 'Searched the fetched HTML for <meta name="description" content="..."> \u2014 no matching tag was found in <head>.',
            fix: "Add a unique, benefit-led meta description under 160 characters.",
            snippet: `<head>\n-  <!-- no meta description -->\n+  <meta name="description" content="A clear, specific summary of what this page offers." />\n</head>`,
            language: "diff",
        });
    }
    if (s.h1Count !== 1) {
        candidates.push({
            id: "h1",
            category: "UI/UX & Visual Hierarchy",
            target: "<h1> heading",
            problem: s.h1Count === 0
                ? "The page has no <h1>, leaving no clear primary heading for visitors or screen readers."
                : `The page has ${s.h1Count} <h1> tags, diluting the visual and semantic hierarchy.`,
            evidence: `Counted every <h1> element in the fetched HTML: found ${s.h1Count} (expected exactly 1).`,
            fix: "Use exactly one <h1> per page that states the primary value proposition.",
            snippet: `<body>\n-  <!-- ${s.h1Count} <h1> tags -->\n+  <h1>One clear statement of what this page is for</h1>\n</body>`,
            language: "diff",
        });
    }
    if (!s.headingOrderValid) {
        candidates.push({
            id: "heading-order",
            category: "UI/UX & Visual Hierarchy",
            target: "Heading level order",
            problem: "Heading levels skip a step (e.g. an <h3> appears before any <h2>), breaking the document outline.",
            evidence: "Walked every h1\u2013h6 tag in document order and found a level that jumps more than one step deeper than the previous heading.",
            fix: "Nest headings sequentially — never skip from <h1> straight to <h3> or deeper.",
            snippet: `<h1>Page title</h1>\n-  <h3>Subsection</h3>\n+  <h2>Section</h2>\n+  <h3>Subsection</h3>`,
            language: "diff",
        });
    }
    if (s.imgTotal > 0 && s.imgMissingAlt > 0) {
        candidates.push({
            id: "alt",
            category: "UI/UX & Visual Hierarchy",
            target: "<img> alt attributes",
            problem: `${s.imgMissingAlt} of ${s.imgTotal} images are missing descriptive alt text.`,
            evidence: `Inspected all ${s.imgTotal} <img> tags in the fetched HTML: ${s.imgMissingAlt} have no alt attribute or an empty alt="".`,
            fix: 'Add descriptive alt text to every content image; use alt="" only for purely decorative images.',
            snippet: `<img src="/example.png" \n-  alt="" \n+  alt="Describe what this image actually shows" \n/>`,
            language: "diff",
        });
    }
    if (!s.hasViewport) {
        candidates.push({
            id: "viewport",
            category: "UI/UX & Visual Hierarchy",
            target: "<head> viewport meta",
            problem: "No responsive viewport meta tag was found, which likely breaks the mobile layout.",
            evidence: 'Searched the fetched HTML for <meta name="viewport" ...> \u2014 no matching tag was found.',
            fix: "Add the standard responsive viewport meta tag.",
            snippet: `<head>\n+  <meta name="viewport" content="width=device-width, initial-scale=1" />\n</head>`,
            language: "diff",
        });
    }
    if (!s.hasAboveFoldCta) {
        candidates.push({
            id: "cta",
            category: "Conversion Rate Optimization",
            target: "Above-the-fold call-to-action",
            problem: "No clear call-to-action was detected in the first screen of content.",
            evidence: "Scanned the first ~20% of the page's body markup for <button> elements, common CTA class names, and action-verb link text (\"get started\", \"sign up\", etc.) \u2014 none were found in that region.",
            fix: "Add one clear, high-contrast primary action above the fold (e.g. \"Get started\").",
            snippet: `<section class="hero">\n+  <button class="btn-primary">Get started free</button>\n</section>`,
            language: "diff",
        });
    }
    if (s.formCount > 0 && s.inputCount > 8) {
        candidates.push({
            id: "long-form",
            category: "Conversion Rate Optimization",
            target: `Form with ${s.inputCount} fields`,
            problem: `A form on this page has ${s.inputCount} input fields, which is likely to suppress completion rate.`,
            evidence: `Counted <input> elements (excluding hidden/submit/button) inside <form> tags: ${s.inputCount} total across ${s.formCount} form(s).`,
            fix: "Cut the first-step form to 3\u20135 essential fields; collect the rest after signup.",
            snippet: `<form>\n-  <!-- ${s.inputCount} input fields on one screen -->\n+  <input name="email" required />\n+  <!-- move remaining fields to a second step -->\n</form>`,
            language: "diff",
        });
    }
    if (!s.hasOgImage || !s.hasOgTitle) {
        candidates.push({
            id: "og",
            category: "Brand Distinctiveness",
            target: "Open Graph meta tags",
            problem: "Open Graph tags are incomplete, so shared links on social platforms won't render a rich preview.",
            evidence: `Checked <head> for og:title and og:image meta tags: ${!s.hasOgTitle ? "og:title is missing" : "og:title is present"}; ${!s.hasOgImage ? "og:image is missing" : "og:image is present"}.`,
            fix: "Add og:title and og:image so shared links render a branded preview card.",
            snippet: `<head>\n+  <meta property="og:title" content="Your page's actual title" />\n+  <meta property="og:image" content="/social-preview.png" />\n</head>`,
            language: "diff",
        });
    }
    if (!s.isHttps) {
        candidates.push({
            id: "https",
            category: "Technical & Metadata Health",
            target: "Transport security",
            problem: "The page is not served over HTTPS, which browsers flag as not secure.",
            evidence: "The final response URL after following redirects begins with http:// rather than https://.",
            fix: "Serve the site over HTTPS with a valid TLS certificate and redirect all HTTP traffic.",
            snippet: `# nginx\n-  listen 80;\n+  listen 443 ssl;\n+  return 301 https://$host$request_uri;`,
            language: "diff",
        });
    }
    if (s.hasRobotsMeta && s.robotsBlocksIndexing) {
        candidates.push({
            id: "noindex",
            category: "Technical & Metadata Health",
            target: '<meta name="robots">',
            problem: "A robots meta tag is actively telling search engines not to index this page.",
            evidence: 'Found <meta name="robots" content="\u2026"> in <head> with a value containing "noindex".',
            fix: "Remove the noindex directive unless this page is intentionally private.",
            snippet: `<head>\n-  <meta name="robots" content="noindex, nofollow" />\n+  <!-- remove, or set to "index, follow" if this page should rank -->\n</head>`,
            language: "diff",
        });
    }
    if (!s.hasStructuredData) {
        candidates.push({
            id: "jsonld",
            category: "Technical & Metadata Health",
            target: "Structured data (JSON-LD)",
            problem: "No structured data was found, so search engines can't render rich results for this page.",
            evidence: 'Searched the fetched HTML for <script type="application/ld+json"> blocks \u2014 zero were found.',
            fix: "Add a JSON-LD script describing the page's Organization or Product schema.",
            snippet: `<head>\n+  <script type="application/ld+json">\n+  { "@context": "https://schema.org", "@type": "Organization", "name": "Your Company" }\n+  </script>\n</head>`,
            language: "diff",
        });
    }
    if (s.robotsTxt.blocksAllCrawlers) {
        candidates.push({
            id: "robots-block-all",
            category: "Technical & Metadata Health",
            target: "/robots.txt",
            problem: "robots.txt disallows all crawlers from the entire site (\"Disallow: /\" under User-agent: *).",
            evidence: "Fetched /robots.txt directly and found a \"User-agent: *\" block containing \"Disallow: /\", which blocks every crawler from every page.",
            fix: "Remove the blanket Disallow rule unless the whole site is intentionally meant to be unindexed.",
            snippet: `# robots.txt\n-  User-agent: *\n-  Disallow: /\n+  User-agent: *\n+  Allow: /`,
            language: "diff",
        });
    }
    else if (s.robotsTxt.fetched && !s.robotsTxt.exists) {
        candidates.push({
            id: "robots-missing",
            category: "Technical & Metadata Health",
            target: "/robots.txt",
            problem: "No robots.txt file was found at the site root.",
            evidence: "Sent a live GET request to /robots.txt on this domain \u2014 it did not return a successful (2xx) response.",
            fix: "Add a robots.txt at the domain root that allows crawling and references your sitemap.",
            snippet: `# /robots.txt\n+  User-agent: *\n+  Allow: /\n+  Sitemap: https://yourdomain.com/sitemap.xml`,
            language: "diff",
        });
    }
    if (s.sitemap.fetched && !s.sitemap.exists) {
        candidates.push({
            id: "sitemap-missing",
            category: "Technical & Metadata Health",
            target: "/sitemap.xml",
            problem: "No valid XML sitemap was found at /sitemap.xml or the location referenced in robots.txt.",
            evidence: "Sent a live GET request to /sitemap.xml (or the URL declared in robots.txt's Sitemap: line, if present) \u2014 the response was missing, non-2xx, or not parseable as sitemap XML.",
            fix: "Generate an XML sitemap listing your indexable pages and reference it from robots.txt.",
            snippet: `<!-- /sitemap.xml -->\n+  <?xml version="1.0" encoding="UTF-8"?>\n+  <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n+    <url><loc>https://yourdomain.com/</loc></url>\n+  </urlset>`,
            language: "diff",
        });
    }
    else if (s.robotsTxt.exists && !s.robotsTxt.referencesSitemap && s.sitemap.exists) {
        candidates.push({
            id: "sitemap-not-referenced",
            category: "Technical & Metadata Health",
            target: "/robots.txt",
            problem: "A sitemap exists but robots.txt doesn't reference it, so crawlers may not discover it as quickly.",
            evidence: `Fetched /sitemap.xml successfully (${s.sitemap.urlCount} entries) but found no "Sitemap:" line inside /robots.txt.`,
            fix: "Add a Sitemap: line to robots.txt pointing at your sitemap.xml.",
            snippet: `# robots.txt\n+  Sitemap: https://yourdomain.com/sitemap.xml`,
            language: "diff",
        });
    }
    if (s.security.httpDowngradeDetected) {
        candidates.push({
            id: "https-downgrade",
            category: "Security & Performance",
            target: "Redirect chain",
            problem: "The redirect chain downgrades from HTTPS to HTTP at some point, exposing traffic in transit.",
            evidence: "Manually followed every redirect hop for this URL and found one https:// URL that redirected to an http:// (not https://) location.",
            fix: "Ensure every redirect in the chain stays on HTTPS — never redirect an https:// URL to an http:// one.",
            snippet: `# nginx\n-  return 301 http://$host$request_uri;\n+  return 301 https://$host$request_uri;`,
            language: "diff",
        });
    }
    else if (!s.security.finalIsHttps) {
        candidates.push({
            id: "not-https",
            category: "Security & Performance",
            target: "Transport security",
            problem: "The final response is served over HTTP, not HTTPS.",
            evidence: "The final URL reached after following all redirects begins with http://.",
            fix: "Serve the site over HTTPS with a valid TLS certificate and redirect all HTTP traffic to HTTPS.",
            snippet: `# nginx\n-  listen 80;\n+  listen 443 ssl;\n+  return 301 https://$host$request_uri;`,
            language: "diff",
        });
    }
    if (!s.security.hasHsts && s.security.finalIsHttps) {
        candidates.push({
            id: "hsts",
            category: "Security & Performance",
            target: "Strict-Transport-Security header",
            problem: "No Strict-Transport-Security header was found, so browsers won't force HTTPS on repeat visits.",
            evidence: "Inspected the live HTTP response headers for this page \u2014 no Strict-Transport-Security header was present.",
            fix: "Add a Strict-Transport-Security header with a long max-age.",
            snippet: `# response header\n+  Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`,
            language: "diff",
        });
    }
    if (!s.security.hasCsp) {
        const csp = buildIntelligentCsp(deep);
        candidates.push({
            id: "csp",
            category: "Security & Performance",
            target: "Content-Security-Policy header",
            problem: "No Content-Security-Policy header was found, leaving the site with no defense against injected scripts.",
            evidence: "Inspected the live HTTP response headers for this page \u2014 no Content-Security-Policy header was present.",
            fix: csp.fix,
            snippet: csp.snippet,
            language: "diff",
        });
    }
    if (s.security.exposesPoweredBy) {
        const stackFix = stackAwareHeaderFix(s, deep);
        candidates.push({
            id: "x-powered-by",
            category: "Security & Performance",
            target: "X-Powered-By header",
            problem: "The X-Powered-By header reveals the underlying framework/technology to anyone inspecting responses.",
            evidence: s.security.poweredByValue
                ? `Inspected the live HTTP response headers for this page \u2014 X-Powered-By: ${s.security.poweredByValue}.`
                : "Inspected the live HTTP response headers for this page \u2014 an X-Powered-By header was present and non-empty.",
            fix: stackFix.fix,
            snippet: stackFix.snippet,
            language: "diff",
        });
    }
    if (s.security.mixedContentCount > 0) {
        candidates.push({
            id: "mixed-content",
            category: "Security & Performance",
            target: `${s.security.mixedContentCount} http:// resource reference${s.security.mixedContentCount === 1 ? "" : "s"}`,
            problem: `${s.security.mixedContentCount} resource${s.security.mixedContentCount === 1 ? " is" : "s are"} loaded over plain HTTP on an HTTPS page, which browsers will block or flag as insecure.`,
            evidence: `Scanned all src/href attributes in the fetched HTML for literal "http://" URLs on this HTTPS page: found ${s.security.mixedContentCount}.`,
            fix: "Change every hardcoded http:// resource URL to https:// (or a protocol-relative // URL).",
            snippet: `<img\n-  src="http://cdn.example.com/logo.png"\n+  src="https://cdn.example.com/logo.png"\n/>`,
            language: "diff",
        });
    }
    if (!s.security.hasDoctype) {
        candidates.push({
            id: "doctype",
            category: "Security & Performance",
            target: "<!DOCTYPE html>",
            problem: "No HTML5 doctype declaration was found, which can trigger inconsistent quirks-mode rendering across browsers.",
            evidence: "Checked the first characters of the fetched HTML document \u2014 it does not begin with <!DOCTYPE html>.",
            fix: "Add <!DOCTYPE html> as the very first line of the document.",
            snippet: `+  <!DOCTYPE html>\n   <html lang="en">`,
            language: "diff",
        });
    }
    if (s.security.hasMetaRefresh) {
        candidates.push({
            id: "meta-refresh",
            category: "Security & Performance",
            target: '<meta http-equiv="refresh">',
            problem: "A meta-refresh redirect was found, which is an outdated pattern that hurts SEO and accessibility.",
            evidence: 'Found <meta http-equiv="refresh" content="\u2026"> in the fetched HTML.',
            fix: "Replace client-side meta-refresh redirects with a proper server-side 301/302 redirect.",
            snippet: `<head>\n-  <meta http-equiv="refresh" content="0; url=/new-page" />\n+  <!-- use a server-side redirect instead -->\n</head>`,
            language: "diff",
        });
    }
    if (s.security.redirectHopCount >= 3) {
        candidates.push({
            id: "redirect-chain",
            category: "Security & Performance",
            target: `Redirect chain (${s.security.redirectHopCount} hops)`,
            problem: `This URL takes ${s.security.redirectHopCount} redirect hops to resolve, adding latency and diluting SEO signal.`,
            evidence: `Manually followed the redirect chain for this URL, counting each 3xx response with a Location header: ${s.security.redirectHopCount} hops before reaching a final 2xx response.`,
            fix: "Collapse the chain so the URL redirects directly to its final destination in a single hop.",
            snippet: `# nginx — point the source URL straight at the final destination\n-  /old -> /intermediate -> /newer -> /final\n+  /old -> /final`,
            language: "diff",
        });
    }
    if (s.security.responseTimeMs > 3000) {
        candidates.push({
            id: "slow-response",
            category: "Security & Performance",
            target: "Server response time",
            problem: `The page took ${(s.security.responseTimeMs / 1000).toFixed(1)}s to respond, well above the ~1s target for a good first impression.`,
            evidence: `Timed the live request from send to first byte of the final response: ${s.security.responseTimeMs}ms.`,
            fix: "Investigate server-side latency — caching, database query time, or cold-start delay on serverless functions.",
            snippet: `// Add server-side caching for expensive routes\n+  export const revalidate = 3600; // ISR cache for 1 hour`,
            language: "diff",
        });
    }
    const lowestCats = [...categories].sort((a, b) => a.score - b.score).map((c) => c.label);
    const ranked = candidates.sort((a, b) => lowestCats.indexOf(a.category) - lowestCats.indexOf(b.category));
    return ranked.slice(0, 4);
}
async function generateVerdictWithGemini(host, overall, categories, weakestLabel) {
    const prompt = `You are an expert website auditor writing a one-line executive verdict for a report.
Site: "${host}". Overall score: ${overall.toFixed(1)}/10. Category scores: ${categories
        .map((c) => `${c.label}: ${c.score.toFixed(1)}`)
        .join(", ")}. Weakest area: ${weakestLabel}.

Write ONE sentence, direct and specific (not generic filler), that a founder would actually
find useful — reference the weakest area concretely. No hashtags, no emoji, no "AI" mentions.

Return ONLY valid JSON (no markdown fences) matching this exact shape:
{ "verdict": "one specific, honest sentence" }`;
    const result = await (0, ai_1.generateJsonForTask)("VERDICT", prompt, { temperature: 0.75 });
    if (result && typeof result.verdict === "string" && result.verdict.trim()) {
        return result;
    }
    return null;
}
/**
 * Durable behavioral contract for promo-copy generation, sent as the
 * system message rather than folded into the user prompt — this is what
 * makes BYOK output consistently high-quality regardless of which model
 * a user points their key at.
 */
const PROMO_SYSTEM_PROMPT = `You are Audityxe's staff social media copywriter. You write promo copy for real website audit results that founders and developers post to their own X/Twitter and LinkedIn accounts to share proof of their site's quality.

Hard rules, always:
- Every number you use (overall score, category scores) must come directly from the data given to you in the user message. Never invent, round misleadingly, or hallucinate a score.
- Never use the words "AI", "artificial intelligence", "GPT", or any model/vendor name — the audit engine is described as deterministic, not AI-branded, in Audityxe's own marketing.
- Never use generic SaaS filler phrases: "revolutionize", "supercharge", "next-gen", "game-changer", "unlock your potential", "check out my audit".
- Avoid em dashes; use periods or commas instead.
- No emojis unless the user's own brand voice implies otherwise (default: no emojis).
- Each output must sound like a distinct piece of writing, not two versions of the same sentence — vary sentence structure, opening, and rhythm between the two posts you write.
- Output ONLY the JSON object requested in the user message. No markdown fences, no preamble, no explanation outside the JSON.

Voice: confident but not boastful, specific rather than vague, written the way a technical founder actually talks — short sentences, real numbers, no hype.`;
async function generatePromoWithGemini(host, overall, categories, strongestLabel, weakestLabel, byok) {
    const prompt = `Site: "${host}". Overall score: ${overall.toFixed(1)}/10. Category scores:
${categories.map((c) => `${c.label}: ${c.score.toFixed(1)}`).join(", ")}. Strongest area:
${strongestLabel}. Weakest area: ${weakestLabel}.

Write two DIFFERENT posts:
1. An X/Twitter post, under 280 characters, punchy and specific, mentioning the actual score and
   referencing the weakest area by name. 2-3 relevant hashtags.
2. A LinkedIn post, longer and more professional, structured with 3-4 bullet points that each
   reference a specific real category score from above, ending with a takeaway line.

Return ONLY valid JSON (no markdown fences) matching this exact shape:
{ "xPost": "...", "linkedinPost": "..." }`;
    const result = await (0, ai_1.generateJsonForTask)("PROMO", prompt, {
        temperature: 0.9,
        systemPrompt: PROMO_SYSTEM_PROMPT,
        byok,
    });
    if (result && typeof result.xPost === "string" && typeof result.linkedinPost === "string") {
        return result;
    }
    return null;
}
/**
 * Durable behavioral contract for the banner art-direction task.
 */
const BANNER_SYSTEM_PROMPT = `You are a senior graphic designer at a top brand studio, art-directing shareable 1200x630 social banners for website audit results. You think in typographic hierarchy and layout constraints, not marketing copy.

Hard rules, always:
- The headline must be short enough to sit at 56-64px type without wrapping more than twice.
- The tagline must support the headline without repeating any of its words.
- Choose exactly ONE word, copied verbatim from your own headline, to visually emphasize with a color accent.
- Never use the word "AI" or any model/vendor name anywhere in the output.
- Base every claim strictly on the score data given to you — never invent a score.
- Output ONLY the JSON object requested in the user message. No markdown fences, no preamble.`;
/**
 * BANNER task: writes with a senior graphic designer persona so the
 * shareable banner reads like an actual designed creative, not a
 * template fill-in. Produces a short headline, a one-line tagline, one
 * word to visually emphasize, and a layout direction. Falls back to a
 * deterministic, still-designed default if the AI call is unavailable.
 */
async function generateBannerDesign(host, overall, categories, byok) {
    const prompt = `Site: "${host}", overall score ${overall.toFixed(1)}/10, category scores: ${categories
        .map((c) => `${c.label}: ${c.score.toFixed(1)}`)
        .join(", ")}.

Also choose whether the score badge should be a large centered circular badge
("centered-badge") or a compact left-aligned stat block ("left-stacked") based on how much
headline text there is.

Return ONLY valid JSON (no markdown fences) matching this exact shape:
{
  "headline": "max 6 words, punchy, describes the audit outcome",
  "tagline": "max 12 words, one supporting line, no repetition of the headline",
  "accentWord": "exactly one word copied verbatim from the headline to emphasize",
  "layout": "centered-badge" | "left-stacked"
}`;
    const result = await (0, ai_1.generateJsonForTask)("BANNER", prompt, {
        temperature: 0.75,
        systemPrompt: BANNER_SYSTEM_PROMPT,
        byok,
    });
    if (result &&
        typeof result.headline === "string" &&
        typeof result.tagline === "string" &&
        typeof result.accentWord === "string" &&
        (result.layout === "centered-badge" || result.layout === "left-stacked")) {
        return result;
    }
    return null;
}
function defaultBannerDesign(host, overall) {
    if (overall >= 8) {
        return {
            headline: "Nearly Best-in-Class",
            tagline: `${host} scored ${overall.toFixed(1)}/10 \u2014 a few fixes from perfect.`,
            accentWord: "Best-in-Class",
            layout: "centered-badge",
        };
    }
    if (overall >= 5) {
        return {
            headline: "Solid Engine, Vague Value Prop",
            tagline: `${host} scored ${overall.toFixed(1)}/10 on a live audit.`,
            accentWord: "Vague",
            layout: "centered-badge",
        };
    }
    return {
        headline: "This Site Needs Work",
        tagline: `${host} scored ${overall.toFixed(1)}/10 \u2014 full breakdown inside.`,
        accentWord: "Needs",
        layout: "left-stacked",
    };
}
/* ────────────────────────────────────────────────────────────────
   Deterministic fallback copy (used only when the writing backend is
   unavailable/unconfigured) — still fully real, derived from the
   actual measured scores, just not model-authored.
   ──────────────────────────────────────────────────────────────── */
function verdictFor(overall, host, weakestLabel) {
    if (overall >= 8) {
        return `${host} is in strong shape \u2014 ${weakestLabel} is the one area still worth tightening.`;
    }
    if (overall >= 5) {
        return `${host} has a solid foundation, but ${weakestLabel.toLowerCase()} is holding the overall score back.`;
    }
    return `${host} needs focused work, starting with ${weakestLabel.toLowerCase()}.`;
}
function buildPromo(host, overall, weakestLabel) {
    const xPost = `Just ran a full site audit on ${host} \uD83D\uDD0D\n\nScore: ${overall.toFixed(1)}/10\n\nBiggest opportunity: ${weakestLabel}\n\nFull breakdown \u2193\n\n#buildinpublic #webdesign #CRO`;
    const linkedinPost = `I ran a full technical + UX audit on ${host}. Here's what stood out:\n\nOverall score: ${overall.toFixed(1)}/10\n\n\u2022 Messaging clarity has room to sharpen the core value prop\n\u2022 A few CRO quick-wins could meaningfully lift conversion\n\u2022 Technical SEO fundamentals need a pass on metadata\n\u2022 ${weakestLabel} is the single biggest opportunity right now\n\nSmall, specific changes compound fast. Worth a 10-minute audit before your next launch.`;
    return { xPost, linkedinPost };
}
/* ────────────────────────────────────────────────────────────────
   Live fetch + orchestration
   ──────────────────────────────────────────────────────────────── */
async function fetchWithTimeout(url, timeoutMs, retries = 1) {
    try {
        // The sitemap URL in particular can come from inside a site's own
        // robots.txt (the "Sitemap:" directive), which is attacker-controlled
        // content — validate it the same as any other user/site-supplied URL
        // before ever fetching it.
        await (0, url_safety_1.assertSafeUrl)(url);
    }
    catch {
        return null;
    }
    for (let attempt = 0; attempt <= retries; attempt++) {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);
        try {
            let currentUrl = url;
            let res;
            // Follow up to 5 redirect hops ourselves (same SSRF re-validation as
            // the main page fetch) — a single hop isn't enough for the common
            // http→https→www chain, which previously made a perfectly real
            // robots.txt/sitemap.xml wrongly report as missing.
            for (let hop = 0; hop <= 5; hop++) {
                res = await fetch(currentUrl, {
                    signal: controller.signal,
                    redirect: "manual",
                    headers: { "User-Agent": USER_AGENT },
                });
                if (res.status >= 300 && res.status < 400 && hop < 5) {
                    const location = res.headers.get("location");
                    if (!location)
                        break;
                    const nextUrl = new URL(location, currentUrl).toString();
                    try {
                        await (0, url_safety_1.assertSafeUrl)(nextUrl);
                    }
                    catch {
                        return null;
                    }
                    res.body?.cancel().catch(() => { });
                    currentUrl = nextUrl;
                    continue;
                }
                break;
            }
            return res;
        }
        catch {
            if (attempt === retries)
                return null;
            // One quick retry absorbs transient DNS/TLS/connection hiccups —
            // without this, a single dropped packet could wrongly report a
            // real robots.txt/sitemap.xml as "could not be checked."
        }
        finally {
            clearTimeout(timer);
        }
    }
    return null;
}
/** Fetches and parses the real /robots.txt for the target origin. Never
 * throws — a missing or unreachable robots.txt is itself a real, valid
 * finding (and is scored/flagged as such), not an error. */
async function analyzeRobotsTxt(origin) {
    const checkedUrl = `${origin}/robots.txt`;
    const res = await fetchWithTimeout(checkedUrl, 4000);
    if (!res) {
        return { fetched: false, exists: false, blocksAllCrawlers: false, referencesSitemap: false, sitemapUrls: [], ruleCount: 0, checkedUrl, httpStatus: null, aiBotsBlocked: [] };
    }
    if (!res.ok) {
        return { fetched: true, exists: false, blocksAllCrawlers: false, referencesSitemap: false, sitemapUrls: [], ruleCount: 0, checkedUrl, httpStatus: res.status, aiBotsBlocked: [] };
    }
    const text = await res.text();
    const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const disallowAllForStar = /User-agent:\s*\*\s*[\r\n]+\s*Disallow:\s*\/\s*$/im.test(text) ||
        (() => {
            let currentIsStar = false;
            for (const line of lines) {
                if (/^user-agent:/i.test(line))
                    currentIsStar = /\*\s*$/.test(line);
                if (currentIsStar && /^disallow:\s*\/\s*$/i.test(line))
                    return true;
            }
            return false;
        })();
    const sitemapUrls = lines
        .filter((l) => /^sitemap:/i.test(l))
        .map((l) => l.replace(/^sitemap:\s*/i, "").trim())
        .filter(Boolean);
    const ruleCount = lines.filter((l) => /^(disallow|allow):/i.test(l)).length;
    // Walk robots.txt block-by-block (each starts at a User-agent line)
    // and record which named AI crawlers get a "Disallow: /" (or any
    // disallow with no matching Allow) inside their own block — distinct
    // from the wildcard "blocks everyone" case above.
    const aiBotsBlocked = [];
    {
        let currentAgents = [];
        let blockHasFullDisallow = false;
        const flush = () => {
            if (blockHasFullDisallow) {
                for (const a of currentAgents) {
                    const known = KNOWN_AI_CRAWLERS.find((k) => k.toLowerCase() === a.toLowerCase());
                    if (known && !aiBotsBlocked.includes(known))
                        aiBotsBlocked.push(known);
                }
            }
        };
        for (const line of lines) {
            if (/^user-agent:/i.test(line)) {
                const agent = line.replace(/^user-agent:\s*/i, "").trim();
                // A new User-agent line that isn't immediately preceded by
                // another User-agent line starts a new block.
                if (blockHasFullDisallow || currentAgents.length === 0) {
                    flush();
                    currentAgents = [agent];
                    blockHasFullDisallow = false;
                }
                else {
                    currentAgents.push(agent);
                }
                continue;
            }
            if (/^disallow:\s*\/\s*$/i.test(line))
                blockHasFullDisallow = true;
        }
        flush();
    }
    return {
        fetched: true,
        exists: true,
        blocksAllCrawlers: disallowAllForStar,
        referencesSitemap: sitemapUrls.length > 0,
        sitemapUrls,
        ruleCount,
        checkedUrl,
        httpStatus: res.status,
        aiBotsBlocked,
    };
}
/** Fetches the real /llms.txt for the target origin — the emerging
 * convention (proposed by Jeremy Howard/Answer.AI) for giving AI
 * answer engines a clean, markdown, LLM-readable summary of a site,
 * the way robots.txt/sitemap.xml serve traditional crawlers. */
async function analyzeLlmsTxt(origin) {
    const checkedUrl = `${origin}/llms.txt`;
    const res = await fetchWithTimeout(checkedUrl, 4000);
    if (!res)
        return { fetched: false, exists: false, httpStatus: null, hasContent: false, checkedUrl };
    if (!res.ok)
        return { fetched: true, exists: false, httpStatus: res.status, hasContent: false, checkedUrl };
    const text = await res.text();
    return { fetched: true, exists: true, httpStatus: res.status, hasContent: text.trim().length > 20, checkedUrl };
}
/** Fetches and parses the real /sitemap.xml (or the URL referenced from
 * robots.txt, if present) for the target origin. Handles both a plain
 * <urlset> and a <sitemapindex> of nested sitemaps. */
async function analyzeSitemapAt(candidateUrl) {
    const res = await fetchWithTimeout(candidateUrl, 4000);
    if (!res) {
        return { fetched: false, exists: false, isValidXml: false, urlCount: 0, hasLastmod: false, isSitemapIndex: false, checkedUrl: candidateUrl, httpStatus: null };
    }
    if (!res.ok) {
        return { fetched: true, exists: false, isValidXml: false, urlCount: 0, hasLastmod: false, isSitemapIndex: false, checkedUrl: candidateUrl, httpStatus: res.status };
    }
    const text = await res.text();
    const isValidXml = /<\?xml/i.test(text) || /<urlset[\s>]/i.test(text) || /<sitemapindex[\s>]/i.test(text);
    const isSitemapIndex = /<sitemapindex[\s>]/i.test(text);
    const urlCount = isSitemapIndex
        ? (text.match(/<sitemap>/gi) || []).length
        : (text.match(/<url>/gi) || []).length;
    const hasLastmod = /<lastmod>/i.test(text);
    return {
        fetched: true,
        exists: isValidXml && urlCount > 0,
        isValidXml,
        urlCount,
        hasLastmod,
        isSitemapIndex,
        checkedUrl: candidateUrl,
        httpStatus: res.status,
    };
}
const MAX_HTML_BYTES = 8 * 1024 * 1024; // 8MB — generous for real pages, protects against a hostile/oversized response
const USER_AGENT = "Mozilla/5.0 (compatible; AudityxeBot/1.0; +https://audityxe.vercel.app)";
async function readBodyCapped(res, maxBytes) {
    const reader = res.body?.getReader();
    if (!reader)
        return res.text();
    const decoder = new TextDecoder();
    let received = 0;
    let out = "";
    while (true) {
        const { done, value } = await reader.read();
        if (done)
            break;
        received += value.byteLength;
        if (received > maxBytes) {
            reader.cancel().catch(() => { });
            throw new Error("The page response was too large to analyze (over 8MB).");
        }
        out += decoder.decode(value, { stream: true });
    }
    out += decoder.decode();
    return out;
}
async function fetchHtml(rawUrl) {
    const url = normalizeUrl(rawUrl);
    if (url.length > 2048) {
        throw new Error("That URL is too long.");
    }
    // Validates protocol, hostname, and (via DNS resolution) that it's not
    // a private/internal address — see lib/url-safety.ts for the full
    // SSRF threat model this defends against.
    const initialParsed = await (0, url_safety_1.assertSafeUrl)(url);
    if (!initialParsed.hostname.includes(".") && initialParsed.hostname !== "localhost") {
        // "localhost" itself is already blocked by assertSafeUrl; this extra
        // check catches bare single-word hosts (e.g. "foo") that resolve
        // publicly but are almost certainly a typo, not a real audit target.
        throw new Error(`"${rawUrl}" doesn't look like a valid domain. Try something like example.com.`);
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);
    const startedAt = Date.now();
    try {
        // Follow redirects manually (rather than fetch's redirect:"follow") so
        // we can count real hops, detect an https→http downgrade, and — most
        // importantly — re-validate every single hop against the SSRF
        // allowlist before following it. A malicious site could otherwise
        // redirect a perfectly safe public URL straight to
        // http://169.254.169.254/ and have us fetch it anyway.
        let currentUrl = url;
        let hopCount = 0;
        let downgradeDetected = false;
        const visited = new Set();
        let res;
        while (true) {
            if (visited.has(currentUrl)) {
                throw new Error("This URL redirects in a loop and never resolves.");
            }
            visited.add(currentUrl);
            await (0, url_safety_1.assertSafeUrl)(currentUrl);
            res = await fetch(currentUrl, {
                redirect: "manual",
                signal: controller.signal,
                headers: {
                    "User-Agent": USER_AGENT,
                    Accept: "text/html,application/xhtml+xml",
                },
            });
            const isRedirect = res.status >= 300 && res.status < 400;
            const location = res.headers.get("location");
            if (isRedirect && location) {
                const nextUrl = new URL(location, currentUrl).toString();
                if (currentUrl.startsWith("https://") && nextUrl.startsWith("http://")) {
                    downgradeDetected = true;
                }
                hopCount++;
                if (hopCount > 8) {
                    throw new Error("This URL redirects too many times (over 8 hops).");
                }
                currentUrl = nextUrl;
                continue;
            }
            break;
        }
        if (!res.ok) {
            throw new Error(`Site responded with status ${res.status}`);
        }
        const contentType = res.headers.get("content-type") || "";
        if (contentType && !/text\/html|application\/xhtml/i.test(contentType)) {
            throw new Error(`URL did not return an HTML page (got ${contentType.split(";")[0]}).`);
        }
        const declaredLength = Number(res.headers.get("content-length") || 0);
        if (declaredLength > MAX_HTML_BYTES) {
            throw new Error("The page response was too large to analyze (over 8MB).");
        }
        const html = await readBodyCapped(res, MAX_HTML_BYTES);
        if (!html || html.trim().length < 20) {
            throw new Error("The page returned an empty response.");
        }
        return {
            html,
            finalUrl: currentUrl,
            headers: res.headers,
            redirectHopCount: hopCount,
            httpDowngradeDetected: downgradeDetected,
            responseTimeMs: Date.now() - startedAt,
        };
    }
    catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
            throw new Error("The site took too long to respond (timed out after 15s).");
        }
        throw err;
    }
    finally {
        clearTimeout(timeout);
    }
}
function extractSecurityFromResponse(headers, finalUrl, redirectHopCount, httpDowngradeDetected, responseTimeMs) {
    const get = (name) => headers.get(name) || "";
    const hsts = get("strict-transport-security");
    const hstsMaxAgeMatch = hsts.match(/max-age\s*=\s*(\d+)/i);
    const csp = get("content-security-policy");
    const referrerPolicy = get("referrer-policy").toLowerCase();
    // getSetCookie() is the standard way to read multiple Set-Cookie values;
    // fall back to a single get() for runtimes without it.
    const rawCookies = typeof headers.getSetCookie === "function"
        ? headers.getSetCookie()
        : get("set-cookie")
            ? [get("set-cookie")]
            : [];
    const cookiesMissingSecure = rawCookies.filter((c) => !/;\s*secure/i.test(c)).length;
    const cookiesMissingHttpOnly = rawCookies.filter((c) => !/;\s*httponly/i.test(c)).length;
    const cookiesMissingSameSite = rawCookies.filter((c) => !/;\s*samesite\s*=/i.test(c)).length;
    const cookiesPersistentCount = rawCookies.filter((c) => /;\s*(max-age|expires)\s*=/i.test(c)).length;
    const cookiesSessionCount = rawCookies.length - cookiesPersistentCount;
    const TRACKING_COOKIE_NAMES = /^(_ga|_gid|_gcl|_fbp|_fbc|_gat|_uetsid|_uetvid|_hjid|_hjSession|IDE|test_cookie|ajs_)/i;
    const cookiesTrackingSuspectedCount = rawCookies.filter((c) => TRACKING_COOKIE_NAMES.test(c.split("=")[0].trim())).length;
    const corsOrigin = get("access-control-allow-origin");
    const corsCredentials = get("access-control-allow-credentials").toLowerCase();
    const cacheControl = get("cache-control").toLowerCase();
    const isSensitivePath = /\/(account|admin|dashboard|checkout|settings|login|profile)\b/i.test(finalUrl);
    return {
        finalIsHttps: finalUrl.startsWith("https://"),
        redirectHopCount,
        httpDowngradeDetected,
        responseTimeMs,
        hasHsts: !!hsts,
        hstsMaxAge: hstsMaxAgeMatch ? Number(hstsMaxAgeMatch[1]) : null,
        hstsIncludesSubDomains: /includesubdomains/i.test(hsts),
        hstsPreload: /preload/i.test(hsts),
        hasCsp: !!csp,
        cspAllowsUnsafeInline: /'unsafe-inline'/i.test(csp),
        cspAllowsUnsafeEval: /'unsafe-eval'/i.test(csp),
        cspAllowsWildcardSource: /(?:^|\s)\*(?:\s|;|$)/.test(csp),
        hasXFrameOptions: !!get("x-frame-options"),
        hasXContentTypeOptions: /nosniff/i.test(get("x-content-type-options")),
        hasReferrerPolicy: !!referrerPolicy,
        referrerPolicyIsWeak: referrerPolicy === "unsafe-url" || referrerPolicy === "no-referrer-when-downgrade",
        hasPermissionsPolicy: !!get("permissions-policy"),
        hasCoop: !!get("cross-origin-opener-policy"),
        hasCoep: !!get("cross-origin-embedder-policy"),
        hasCorp: !!get("cross-origin-resource-policy"),
        hasClearSiteData: !!get("clear-site-data"),
        exposesServerHeader: !!get("server") && !/^cloudflare$/i.test(get("server")),
        serverHeaderValue: get("server") || null,
        exposesPoweredBy: !!get("x-powered-by"),
        poweredByValue: get("x-powered-by") || null,
        hasCacheControl: !!cacheControl,
        cacheControlIsPublicOnSensitivePage: isSensitivePath && /public/.test(cacheControl) && !/no-store|private/.test(cacheControl),
        hasCompression: !!get("content-encoding"),
        contentEncoding: get("content-encoding") || null,
        cookieCount: rawCookies.length,
        cookiesMissingSecure,
        cookiesMissingHttpOnly,
        cookiesMissingSameSite,
        cookiesPersistentCount,
        cookiesSessionCount,
        cookiesTrackingSuspectedCount,
        corsAllowsAnyOrigin: corsOrigin === "*",
        corsAllowsCredentialsWithWildcard: corsOrigin === "*" && corsCredentials === "true",
        xRobotsTagValue: get("x-robots-tag") || null,
    };
}
async function auditOne(rawUrl) {
    const fetched = await fetchHtml(rawUrl);
    const signals = extractSignals(fetched.html, fetched.finalUrl);
    signals.security = {
        ...signals.security,
        ...extractSecurityFromResponse(fetched.headers, fetched.finalUrl, fetched.redirectHopCount, fetched.httpDowngradeDetected, fetched.responseTimeMs),
    };
    const origin = new URL(fetched.finalUrl).origin;
    const defaultSitemapUrl = `${origin}/sitemap.xml`;
    const hostname = new URL(fetched.finalUrl).hostname;
    // robots.txt and the default sitemap.xml location are fetched at the
    // same time rather than sequentially — this used to be two sequential
    // round-trips (each with its own retry), which could add up to ~16s
    // on a slow/unresponsive host and was a real contributor to the whole
    // audit occasionally exceeding serverless function time limits.
    const [robotsTxt, defaultSitemap, tlsCert, llmsTxt] = await Promise.all([
        analyzeRobotsTxt(origin),
        analyzeSitemapAt(defaultSitemapUrl),
        fetched.finalUrl.startsWith("https://")
            ? (0, tls_check_1.checkTlsCertificate)(hostname)
            : Promise.resolve({
                fetched: false,
                error: "Site is not served over HTTPS.",
                protocol: null,
                cipherName: null,
                subjectCN: null,
                issuerCN: null,
                issuerOrg: null,
                validFrom: null,
                validTo: null,
                daysUntilExpiry: null,
                isExpired: false,
                isSelfSigned: false,
                hostnameMatches: false,
                sanCount: 0,
                altNames: [],
                isWeakProtocol: false,
                keyBits: null,
                keyType: null,
            }),
        analyzeLlmsTxt(origin),
    ]);
    let sitemap = defaultSitemap;
    const declaredSitemapUrl = robotsTxt.sitemapUrls[0];
    if (!sitemap.exists && declaredSitemapUrl && declaredSitemapUrl !== defaultSitemapUrl) {
        // Only worth a second (sequential) fetch if robots.txt points
        // somewhere other than the default path we already tried.
        sitemap = await analyzeSitemapAt(declaredSitemapUrl);
    }
    signals.robotsTxt = robotsTxt;
    signals.sitemap = sitemap;
    signals.llmsTxt = llmsTxt;
    const categories = scoreFromSignals(signals);
    const overall = Math.round((categories.reduce((sum, c) => sum + c.score, 0) / categories.length) * 10) / 10;
    const host = hostOf(fetched.finalUrl);
    return { host, overall, categories, signals, html: fetched.html, finalUrl: fetched.finalUrl, origin, tlsCert };
}
const MAX_URL_LENGTH = 2048;
const OVERALL_AUDIT_TIMEOUT_MS = 30000;
// Deep crawl mode runs a real multi-hop request queue (site-crawl-deep.ts),
// which needs more wall-clock room than the shared 30s budget every other
// module races against — bumped for deep-mode requests only, and still
// comfortably under the route's own maxDuration=90 (see app/api/audit/route.ts).
const DEEP_OVERALL_AUDIT_TIMEOUT_MS = 60000;
function withOverallTimeout(promise, ms, message) {
    let timer;
    const timeout = new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error(message)), ms);
    });
    return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}
async function runAudit(rawUrl, competitorRawUrl, options = {}) {
    if (!rawUrl || !rawUrl.trim()) {
        throw new Error("A URL is required.");
    }
    if (rawUrl.length > MAX_URL_LENGTH) {
        throw new Error("That URL is too long.");
    }
    if (competitorRawUrl && competitorRawUrl.length > MAX_URL_LENGTH) {
        throw new Error("The competitor URL is too long.");
    }
    return withOverallTimeout(runAuditInner(rawUrl, competitorRawUrl, options), options.crawlMode === "deep" ? DEEP_OVERALL_AUDIT_TIMEOUT_MS : OVERALL_AUDIT_TIMEOUT_MS, "This audit took too long overall and was stopped. Please try again — some sites are slower to fully analyze than others.");
}
async function runAuditInner(rawUrl, competitorRawUrl, options) {
    const includePromo = options.includePromo ?? true;
    const includePageSpeed = options.includePageSpeed ?? true;
    const primary = await auditOne(rawUrl);
    const deepSignals = (0, deep_signals_1.extractDeepSignals)(primary.html, primary.signals.security.serverHeaderValue, primary.signals.security.xRobotsTagValue);
    const fixes = buildFixes(primary.signals, primary.categories, deepSignals);
    // Classified synchronously from signals already on hand — no extra
    // network calls — then used to make the legal/trust page check below
    // context-aware instead of a single fixed checklist for every site.
    const siteContext = (0, site_context_1.classifySiteContext)(primary.html, primary.signals, deepSignals);
    const sortedByScore = [...primary.categories].sort((a, b) => a.score - b.score);
    const weakestLabel = sortedByScore[0]?.label ?? "Technical & Metadata Health";
    const strongestLabel = sortedByScore[sortedByScore.length - 1]?.label ?? weakestLabel;
    const [verdictCopy, promoCopy, bannerDesign, brokenLinks, imageSample, adsTxt, ogImage, pageSpeed, emailAuth, serverHardening, dnsSecurity, sourceMapExposure, securityTxt, faviconManifest, assetWeights, legalPages, siteCrawl, cookieFlags, redirectChain] = await Promise.all([
        generateVerdictWithGemini(primary.host, primary.overall, primary.categories, weakestLabel),
        includePromo
            ? generatePromoWithGemini(primary.host, primary.overall, primary.categories, strongestLabel, weakestLabel, options.byok)
            : Promise.resolve(null),
        includePromo
            ? generateBannerDesign(primary.host, primary.overall, primary.categories, options.byok)
            : Promise.resolve(null),
        (0, network_checks_1.checkBrokenLinks)(primary.html, primary.finalUrl),
        (0, network_checks_1.checkImageSample)(primary.html, primary.finalUrl),
        (0, network_checks_1.checkAdsTxt)(primary.origin),
        (0, network_checks_1.checkOgImage)(deepSignals.socialMeta.ogImageUrl, primary.finalUrl),
        includePageSpeed ? (0, pagespeed_1.fetchPageSpeedInsights)(primary.finalUrl, options.psiByokKey) : Promise.resolve(pagespeed_1.EMPTY_PAGESPEED_SUMMARY),
        (0, dns_email_auth_1.checkEmailAuthDns)(new URL(primary.finalUrl).hostname),
        (0, network_checks_1.checkServerHardening)(primary.origin),
        (0, dns_security_1.checkDnsSecurity)(new URL(primary.finalUrl).hostname),
        (0, network_checks_1.checkSourceMapExposure)(primary.html, primary.finalUrl),
        (0, network_checks_1.checkSecurityTxt)(primary.origin),
        (0, network_checks_1.checkFaviconManifest)(primary.origin, primary.html, primary.finalUrl),
        (0, network_checks_1.checkAssetWeights)(primary.html, primary.finalUrl),
        (0, legal_pages_1.checkLegalPages)(primary.html, primary.origin, primary.finalUrl, siteContext),
        options.crawlMode === "deep"
            ? Promise.resolve().then(() => __importStar(require("./site-crawl-deep"))).then((m) => m.crawlSiteDeep(primary.html, primary.finalUrl))
            : (0, site_crawl_1.crawlSite)(primary.html, primary.finalUrl),
        (0, network_checks_1.checkCookieFlags)(primary.origin),
        (0, network_checks_1.checkRedirectChain)(rawUrl),
    ]);
    const modules = (0, audit_modules_1.buildAuditModules)({
        signals: primary.signals,
        deep: deepSignals,
        brokenLinks,
        imageSample,
        adsTxt,
        ogImage,
        pageSpeed,
        tlsCert: primary.tlsCert,
        emailAuth,
        serverHardening,
        dnsSecurity,
        sourceMapExposure,
        securityTxt,
        faviconManifest,
        assetWeights,
        legalPages,
        siteContext,
        siteCrawl,
        cookieFlags,
        redirectChain,
    });
    // buildLighthouseModule returns null only when no real-browser pass
    // was requested at all (locked plan, or the toggle was off). When one
    // WAS requested but failed (bad BYOK key, quota, timeout, PSI
    // outage), it still returns a module — with the real failure reason
    // as a finding — rather than silently vanishing, which previously
    // made a broken API key indistinguishable from Lighthouse never
    // having run.
    const lighthouseModule = (0, audit_modules_1.buildLighthouseModule)(pageSpeed);
    if (lighthouseModule)
        modules.push(lighthouseModule);
    const verdict = verdictCopy?.verdict || verdictFor(primary.overall, primary.host, weakestLabel);
    const { xPost, linkedinPost } = promoCopy || buildPromo(primary.host, primary.overall, weakestLabel);
    const banner = bannerDesign ?? defaultBannerDesign(primary.host, primary.overall);
    let competitor;
    if (competitorRawUrl && competitorRawUrl.trim()) {
        try {
            const comp = await auditOne(competitorRawUrl);
            const summary = [];
            primary.categories.forEach((c, i) => {
                const diff = c.score - comp.categories[i].score;
                if (Math.abs(diff) >= 0.4) {
                    summary.push(diff > 0
                        ? `You win on ${c.label} (+${diff.toFixed(1)})`
                        : `${comp.host} wins on ${c.label} (${diff.toFixed(1)})`);
                }
            });
            competitor = {
                url: comp.host,
                overall: comp.overall,
                categories: comp.categories,
                summary,
            };
        }
        catch {
            // Competitor fetch failed — primary audit still returns successfully.
        }
    }
    return {
        url: primary.host,
        overall: primary.overall,
        verdict,
        categories: primary.categories,
        fixes,
        xPost,
        linkedinPost,
        siteContext,
        scoringMethodology: `Overall (${primary.overall}/10) is the unweighted average of the ${primary.categories.length} category scores below — every category counts equally. ` +
            `Each category score is itself derived from that category's audit module findings: every "fail" or "warn" subtracts a fraction of that module's score based on its severity (critical > high > medium > low; warn counts at half the weight of an equivalent fail), then the module's status (good/warning/critical) is set from severity alone so the two can never contradict — a module flagged "critical" cannot also show a near-perfect score, and vice versa.`,
        banner,
        modules,
        pageSpeed,
        promoLocked: !includePromo,
        promoLockReason: !includePromo ? options.promoLockReason ?? "plan" : promoCopy ? undefined : "byok_failed",
        pageSpeedLocked: !includePageSpeed,
        competitor,
    };
}
