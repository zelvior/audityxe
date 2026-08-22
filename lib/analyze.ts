import { AuditResult, BannerDesign, CategoryKey, CategoryScore, FixItem } from "./types";
import { generateJsonForTask } from "./gemini";
import { extractDeepSignals } from "./deep-signals";
import { checkBrokenLinks, checkImageSample, checkAdsTxt, checkOgImage } from "./network-checks";
import { buildAuditModules } from "./audit-modules";

const CATEGORY_META: { key: CategoryKey; label: string }[] = [
  { key: "messaging", label: "Messaging & Copy Clarity" },
  { key: "uiux", label: "UI/UX & Visual Hierarchy" },
  { key: "cro", label: "Conversion Rate Optimization" },
  { key: "seo", label: "Technical & Metadata Health" },
  { key: "brand", label: "Brand Distinctiveness" },
  { key: "security", label: "Security & Performance" },
];

function normalizeUrl(raw: string): string {
  let u = raw.trim();
  if (!/^https?:\/\//i.test(u)) u = "https://" + u;
  return u;
}

function hostOf(u: string): string {
  try {
    return new URL(u).hostname.replace(/^www\./, "");
  } catch {
    return u.replace(/^https?:\/\//, "").replace(/\/.*$/, "");
  }
}

function clamp(n: number, min = 0, max = 10): number {
  return Math.max(min, Math.min(max, n));
}

/* ────────────────────────────────────────────────────────────────
   Deep real-signal extraction from live HTML — no mocked values.
   Every field below is parsed directly from the fetched response.
   ──────────────────────────────────────────────────────────────── */
export interface Signals {
  // Messaging
  title: string;
  metaDescription: string;
  h1Count: number;
  h1Text: string;
  h2Count: number;
  wordCount: number;
  headingOrderValid: boolean; // no h3 before h2, etc.
  duplicateTitleAndH1: boolean;

  // UI/UX
  hasViewport: boolean;
  viewportHasInitialScale: boolean;
  imgTotal: number;
  imgMissingAlt: number;
  imgLazyCount: number;
  ariaLandmarkCount: number;
  inlineStyleCount: number;
  fontFamilyCount: number;

  // CRO
  formCount: number;
  inputCount: number;
  ctaButtonCount: number;
  hasAboveFoldCta: boolean;
  linkCount: number;
  telOrMailtoLinks: number;

  // Technical / SEO
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

  // Brand
  hasFavicon: boolean;
  hasAppleTouchIcon: boolean;
  hasOgImage: boolean;
  hasOgTitle: boolean;
  hasOgDescription: boolean;
  hasTwitterCard: boolean;
  hasThemeColor: boolean;
  hasManifest: boolean;

  // Site-wide (fetched separately from /robots.txt and /sitemap.xml)
  robotsTxt: RobotsSignals;
  sitemap: SitemapSignals;

  // Security & performance (from the real HTTP response itself)
  security: SecuritySignals;
}

export interface SecuritySignals {
  finalIsHttps: boolean;
  redirectHopCount: number;
  httpDowngradeDetected: boolean; // https -> http anywhere in the chain
  responseTimeMs: number;
  hasHsts: boolean;
  hasCsp: boolean;
  hasXFrameOptions: boolean;
  hasXContentTypeOptions: boolean;
  hasReferrerPolicy: boolean;
  hasPermissionsPolicy: boolean;
  exposesServerHeader: boolean;
  exposesPoweredBy: boolean;
  hasCacheControl: boolean;
  hasCompression: boolean;
  hasDoctype: boolean;
  hasMetaRefresh: boolean;
  mixedContentCount: number;
}

export interface RobotsSignals {
  fetched: boolean;
  exists: boolean;
  blocksAllCrawlers: boolean;
  referencesSitemap: boolean;
  sitemapUrls: string[];
  ruleCount: number;
}

export interface SitemapSignals {
  fetched: boolean;
  exists: boolean;
  isValidXml: boolean;
  urlCount: number;
  hasLastmod: boolean;
  isSitemapIndex: boolean;
}

function extractSignals(html: string, finalUrl: string): Signals {
  const get = (re: RegExp) => {
    const m = html.match(re);
    return m ? m[1].trim() : "";
  };
  const has = (re: RegExp) => re.test(html);

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
    if (level > seenMax + 1 && seenMax !== 0) headingOrderValid = false;
    seenMax = Math.max(seenMax, level);
  }

  const imgTags = [...html.matchAll(/<img\b[^>]*>/gi)];
  const imgMissingAlt = imgTags.filter(
    (m) => !/alt\s*=\s*["'][^"']*["']/i.test(m[0]) || /alt\s*=\s*["']\s*["']/i.test(m[0])
  ).length;
  const imgLazyCount = imgTags.filter((m) => /loading\s*=\s*["']lazy["']/i.test(m[0])).length;

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

  const buttonWords =
    /(get started|sign up|sign in|log in|try (it )?free|book a demo|contact sales|buy now|start free|subscribe|join now|download|add to cart|request a quote|analyze now|learn more|shop now|order now|schedule a call)/gi;
  const buttonTags = bodyHtml.match(/<button\b[^>]*>[\s\S]*?<\/button>/gi) || [];
  const ctaAnchors = bodyHtml.match(/<a\b[^>]*class=["'][^"']*(btn|button|cta)[^"']*["'][^>]*>/gi) || [];
  const ctaButtonCount = buttonTags.length + ctaAnchors.length + (bodyHtml.match(buttonWords) || []).length;

  // Above-the-fold approximation: first 15% of body markup contains a CTA signal.
  const foldSlice = bodyHtml.slice(0, Math.max(1800, Math.floor(bodyHtml.length * 0.2)));
  const hasAboveFoldCta = buttonWords.test(foldSlice) || /<button\b/i.test(foldSlice) || /class=["'][^"']*(btn|button|cta)/i.test(foldSlice);

  const scriptTags = [...html.matchAll(/<script\b([^>]*)>/gi)];
  const externalScriptCount = scriptTags.filter((m) => /src\s*=/i.test(m[1])).length;

  const stylesheetLinks = [...html.matchAll(/<link\b([^>]*rel=["']stylesheet["'][^>]*)>/gi)];
  const renderBlockingStylesheets = stylesheetLinks.filter(
    (m) => !/media\s*=\s*["']print["']/i.test(m[1]) && !/preload/i.test(m[1])
  ).length;

  const fontFamilies = new Set(
    [...html.matchAll(/font-family\s*:\s*([^;"'\}]+)/gi)].map((m) => m[1].split(",")[0].trim().toLowerCase())
  );

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

    hasViewport: has(/<meta[^>]+name=["']viewport["']/i),
    viewportHasInitialScale: has(/<meta[^>]+name=["']viewport["'][^>]*initial-scale/i),
    imgTotal: imgTags.length,
    imgMissingAlt,
    imgLazyCount,
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
    robotsTxt: { fetched: false, exists: false, blocksAllCrawlers: false, referencesSitemap: false, sitemapUrls: [], ruleCount: 0 },
    sitemap: { fetched: false, exists: false, isValidXml: false, urlCount: 0, hasLastmod: false, isSitemapIndex: false },
    security: {
      finalIsHttps: finalUrl.startsWith("https://"),
      redirectHopCount: 0,
      httpDowngradeDetected: false,
      responseTimeMs: 0,
      hasHsts: false,
      hasCsp: false,
      hasXFrameOptions: false,
      hasXContentTypeOptions: false,
      hasReferrerPolicy: false,
      hasPermissionsPolicy: false,
      exposesServerHeader: false,
      exposesPoweredBy: false,
      hasCacheControl: false,
      hasCompression: false,
      hasDoctype: /^\s*<!doctype html/i.test(html),
      hasMetaRefresh: has(/<meta[^>]+http-equiv\s*=\s*["']refresh["']/i),
      mixedContentCount: finalUrl.startsWith("https://")
        ? (html.match(/\b(?:src|href)\s*=\s*["']http:\/\/(?!localhost|127\.0\.0\.1)[^"']+["']/gi) || []).length
        : 0,
    },
  };
}

/* ────────────────────────────────────────────────────────────────
   Scoring — every point is traceable to a specific real signal.
   ──────────────────────────────────────────────────────────────── */
function scoreFromSignals(s: Signals): CategoryScore[] {
  // Messaging & Copy Clarity
  let messaging = 4;
  if (s.title.length >= 15 && s.title.length <= 65) messaging += 1.5;
  else if (s.title.length > 0) messaging += 0.4;
  else messaging -= 1.5;
  if (s.h1Text.length >= 15 && s.h1Text.length <= 90) messaging += 1.2;
  else if (s.h1Text) messaging += 0.3;
  if (s.wordCount >= 150 && s.wordCount <= 1400) messaging += 1.3;
  else if (s.wordCount > 0) messaging += 0.3;
  if (s.metaDescription.length >= 50 && s.metaDescription.length <= 160) messaging += 1;
  if (s.duplicateTitleAndH1) messaging -= 0.6;
  messaging = clamp(messaging);

  // UI/UX & Visual Hierarchy
  let uiux = 4;
  if (s.h1Count === 1) uiux += 1.3;
  else if (s.h1Count === 0) uiux -= 2;
  else uiux -= 1;
  if (s.headingOrderValid) uiux += 0.7;
  if (s.hasViewport) uiux += 1;
  else uiux -= 2;
  if (s.hasViewport && s.viewportHasInitialScale) uiux += 0.4;
  const altRatio = s.imgTotal > 0 ? 1 - s.imgMissingAlt / s.imgTotal : 1;
  uiux += altRatio * 1.6;
  if (s.ariaLandmarkCount >= 2) uiux += 0.8;
  if (s.fontFamilyCount > 4) uiux -= 0.6; // too many typefaces = inconsistent hierarchy
  uiux = clamp(uiux);

  // Conversion Rate Optimization
  let cro = 3.5;
  if (s.ctaButtonCount >= 1) cro += 1.6;
  if (s.ctaButtonCount >= 3) cro += 0.8;
  if (s.hasAboveFoldCta) cro += 1.4;
  if (s.formCount >= 1) cro += 1.2;
  if (s.inputCount > 0 && s.inputCount <= 5) cro += 0.8;
  else if (s.inputCount > 8) cro -= 0.5; // long forms hurt conversion
  if (s.telOrMailtoLinks > 0) cro += 0.5;
  cro = clamp(cro);

  // Technical & Metadata Health
  let seo = 3.5;
  if (s.metaDescription) seo += 1.2;
  else seo -= 1;
  if (s.hasCanonical) seo += 0.8;
  if (s.isHttps) seo += 1;
  else seo -= 2.5;
  if (s.htmlLangSet) seo += 0.5;
  if (s.charsetSet) seo += 0.4;
  if (s.title) seo += 0.8;
  else seo -= 1;
  if (s.hasStructuredData) seo += 0.9;
  if (s.hasRobotsMeta && s.robotsBlocksIndexing) seo -= 2.5; // actively blocking search engines
  if (s.renderBlockingStylesheets > 4) seo -= 0.6;
  if (s.externalScriptCount > 12) seo -= 0.5;
  if (s.robotsTxt.fetched && !s.robotsTxt.exists) seo -= 0.7;
  if (s.robotsTxt.blocksAllCrawlers) seo -= 3; // entire site disallowed for all bots
  if (s.robotsTxt.exists && s.robotsTxt.referencesSitemap) seo += 0.6;
  if (s.sitemap.fetched && !s.sitemap.exists) seo -= 0.8;
  if (s.sitemap.exists && s.sitemap.urlCount > 0) seo += 1;
  if (s.sitemap.exists && s.sitemap.hasLastmod) seo += 0.4;
  seo = clamp(seo);

  // Brand Distinctiveness
  let brand = 4;
  if (s.hasFavicon) brand += 1;
  if (s.hasAppleTouchIcon) brand += 0.5;
  if (s.hasOgImage) brand += 1.2;
  if (s.hasOgTitle && s.hasOgDescription) brand += 1;
  if (s.hasTwitterCard) brand += 0.6;
  if (s.hasThemeColor) brand += 0.7;
  if (s.hasManifest) brand += 0.5;
  if (
    s.title &&
    s.h1Text &&
    s.title.toLowerCase().includes(s.h1Text.toLowerCase().split(" ")[0] || "\u0000")
  )
    brand += 0.5;
  brand = clamp(brand);

  // Security & Performance — derived entirely from real response headers,
  // redirect-chain behavior, and page weight measured during the live fetch.
  let security = 4.5;
  if (s.security.finalIsHttps) security += 1;
  else security -= 3;
  if (s.security.httpDowngradeDetected) security -= 2; // https redirected to http mid-chain
  if (s.security.redirectHopCount === 0) security += 0.5;
  else if (s.security.redirectHopCount >= 3) security -= 1;
  if (s.security.hasHsts) security += 1;
  if (s.security.hasCsp) security += 1;
  if (s.security.hasXFrameOptions) security += 0.5;
  if (s.security.hasXContentTypeOptions) security += 0.4;
  if (s.security.hasReferrerPolicy) security += 0.3;
  if (s.security.exposesServerHeader) security -= 0.3;
  if (s.security.exposesPoweredBy) security -= 0.5; // leaks tech stack to attackers
  if (s.security.hasCacheControl) security += 0.4;
  if (s.security.hasCompression) security += 0.4;
  if (!s.security.hasDoctype) security -= 0.8; // triggers quirks-mode rendering
  if (s.security.hasMetaRefresh) security -= 0.6; // legacy/poor-practice redirect method
  if (s.security.mixedContentCount > 0) security -= Math.min(2, s.security.mixedContentCount * 0.4);
  if (s.security.responseTimeMs > 3000) security -= 1;
  else if (s.security.responseTimeMs > 1500) security -= 0.5;
  else if (s.security.responseTimeMs < 500) security += 0.5;
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

/* ────────────────────────────────────────────────────────────────
   Fix generation — one candidate per real problem actually found.
   ──────────────────────────────────────────────────────────────── */
function buildFixes(s: Signals, categories: CategoryScore[]): FixItem[] {
  const candidates: FixItem[] = [];

  if (!s.title || s.title.length < 15 || s.title.length > 65) {
    candidates.push({
      id: "title",
      category: "Messaging & Copy Clarity",
      target: "<title> tag",
      problem: {
        constructive: s.title
          ? `The <title> tag is ${s.title.length} characters, outside the ideal 15\u201365 range for clarity and SEO.`
          : "There is no <title> tag on the page.",
        brutal: s.title
          ? `Your title tag is ${s.title.length} characters. Either you're padding it or you gave up halfway through.`
          : "You shipped a page with no <title> tag. That's the first thing anyone sees in a browser tab, and it's blank.",
      },
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
      problem: {
        constructive: "No meta description tag was found, which weakens click-through from search results.",
        brutal: "There's no meta description. Google is just guessing what your page says, and it's guessing badly.",
      },
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
      problem: {
        constructive:
          s.h1Count === 0
            ? "The page has no <h1>, leaving no clear primary heading for visitors or screen readers."
            : `The page has ${s.h1Count} <h1> tags, diluting the visual and semantic hierarchy.`,
        brutal:
          s.h1Count === 0
            ? "There's no <h1> anywhere on this page. Nobody, human or crawler, knows what this page is about."
            : `You've got ${s.h1Count} <h1> tags fighting each other. Pick one main headline and commit.`,
      },
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
      problem: {
        constructive: "Heading levels skip a step (e.g. an <h3> appears before any <h2>), breaking the document outline.",
        brutal: "Your headings jump around like a ransom note. Screen readers and SEO crawlers both get lost.",
      },
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
      problem: {
        constructive: `${s.imgMissingAlt} of ${s.imgTotal} images are missing descriptive alt text.`,
        brutal: `${s.imgMissingAlt} of your ${s.imgTotal} images are invisible to screen readers and search crawlers. That's two audiences ignored at once.`,
      },
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
      problem: {
        constructive: "No responsive viewport meta tag was found, which likely breaks the mobile layout.",
        brutal: "No viewport meta tag. On mobile this site is probably a tiny, unreadable postage stamp.",
      },
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
      problem: {
        constructive: "No clear call-to-action was detected in the first screen of content.",
        brutal: "I read the top of your page and I still don't know what you want me to do next. There's no CTA up front.",
      },
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
      problem: {
        constructive: `A form on this page has ${s.inputCount} input fields, which is likely to suppress completion rate.`,
        brutal: `A ${s.inputCount}-field form? You're not onboarding a user, you're conducting an interrogation.`,
      },
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
      problem: {
        constructive: "Open Graph tags are incomplete, so shared links on social platforms won't render a rich preview.",
        brutal: "Share this link on X or LinkedIn and it shows up as a bare gray box. That's a missed impression every single time.",
      },
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
      problem: {
        constructive: "The page is not served over HTTPS, which browsers flag as not secure.",
        brutal: "This site isn't even on HTTPS in 2026. Browsers are actively warning people away from it.",
      },
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
      problem: {
        constructive: "A robots meta tag is actively telling search engines not to index this page.",
        brutal: "You're telling Google \u201cplease don't show anyone this page.\u201d It's listening.",
      },
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
      problem: {
        constructive: "No structured data was found, so search engines can't render rich results for this page.",
        brutal: "Zero structured data. You're leaving rich snippets, star ratings, and sitelinks on the table for free.",
      },
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
      problem: {
        constructive: "robots.txt disallows all crawlers from the entire site (\"Disallow: /\" under User-agent: *).",
        brutal: "Your robots.txt tells every search engine to stay out. Congratulations, you're invisible on purpose.",
      },
      fix: "Remove the blanket Disallow rule unless the whole site is intentionally meant to be unindexed.",
      snippet: `# robots.txt\n-  User-agent: *\n-  Disallow: /\n+  User-agent: *\n+  Allow: /`,
      language: "diff",
    });
  } else if (s.robotsTxt.fetched && !s.robotsTxt.exists) {
    candidates.push({
      id: "robots-missing",
      category: "Technical & Metadata Health",
      target: "/robots.txt",
      problem: {
        constructive: "No robots.txt file was found at the site root.",
        brutal: "There's no robots.txt. Crawlers are just guessing what they're allowed to touch.",
      },
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
      problem: {
        constructive: "No valid XML sitemap was found at /sitemap.xml or the location referenced in robots.txt.",
        brutal: "No sitemap. You're hoping Google finds every page by accident. It won't.",
      },
      fix: "Generate an XML sitemap listing your indexable pages and reference it from robots.txt.",
      snippet: `<!-- /sitemap.xml -->\n+  <?xml version="1.0" encoding="UTF-8"?>\n+  <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n+    <url><loc>https://yourdomain.com/</loc></url>\n+  </urlset>`,
      language: "diff",
    });
  } else if (s.robotsTxt.exists && !s.robotsTxt.referencesSitemap && s.sitemap.exists) {
    candidates.push({
      id: "sitemap-not-referenced",
      category: "Technical & Metadata Health",
      target: "/robots.txt",
      problem: {
        constructive: "A sitemap exists but robots.txt doesn't reference it, so crawlers may not discover it as quickly.",
        brutal: "You built a sitemap and then didn't tell anyone where it is. It's basically a secret map.",
      },
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
      problem: {
        constructive: "The redirect chain downgrades from HTTPS to HTTP at some point, exposing traffic in transit.",
        brutal: "You're bouncing visitors from HTTPS back down to HTTP mid-redirect. That's not a typo, that's a security hole.",
      },
      fix: "Ensure every redirect in the chain stays on HTTPS — never redirect an https:// URL to an http:// one.",
      snippet: `# nginx\n-  return 301 http://$host$request_uri;\n+  return 301 https://$host$request_uri;`,
      language: "diff",
    });
  } else if (!s.security.finalIsHttps) {
    candidates.push({
      id: "not-https",
      category: "Security & Performance",
      target: "Transport security",
      problem: {
        constructive: "The final response is served over HTTP, not HTTPS.",
        brutal: "This site isn't even on HTTPS in 2026. Browsers are actively warning people away from it.",
      },
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
      problem: {
        constructive: "No Strict-Transport-Security header was found, so browsers won't force HTTPS on repeat visits.",
        brutal: "No HSTS header. The first request from every visitor is still gambling on plain HTTP.",
      },
      fix: "Add a Strict-Transport-Security header with a long max-age.",
      snippet: `# response header\n+  Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`,
      language: "diff",
    });
  }

  if (!s.security.hasCsp) {
    candidates.push({
      id: "csp",
      category: "Security & Performance",
      target: "Content-Security-Policy header",
      problem: {
        constructive: "No Content-Security-Policy header was found, leaving the site with no defense against injected scripts.",
        brutal: "Zero CSP header. If someone finds an XSS hole, there's nothing here to stop it running.",
      },
      fix: "Add a Content-Security-Policy header scoped to the scripts, styles, and origins the page actually needs.",
      snippet: `# response header\n+  Content-Security-Policy: default-src 'self'; script-src 'self'`,
      language: "diff",
    });
  }

  if (s.security.exposesPoweredBy) {
    candidates.push({
      id: "x-powered-by",
      category: "Security & Performance",
      target: "X-Powered-By header",
      problem: {
        constructive: "The X-Powered-By header reveals the underlying framework/technology to anyone inspecting responses.",
        brutal: "You're broadcasting your tech stack in a response header. That's a free hint for anyone looking for known exploits.",
      },
      fix: "Disable or strip the X-Powered-By header at the framework or reverse-proxy level.",
      snippet: `// next.config.js\n  module.exports = {\n+   poweredByHeader: false,\n  };`,
      language: "diff",
    });
  }

  if (s.security.mixedContentCount > 0) {
    candidates.push({
      id: "mixed-content",
      category: "Security & Performance",
      target: `${s.security.mixedContentCount} http:// resource reference${s.security.mixedContentCount === 1 ? "" : "s"}`,
      problem: {
        constructive: `${s.security.mixedContentCount} resource${s.security.mixedContentCount === 1 ? " is" : "s are"} loaded over plain HTTP on an HTTPS page, which browsers will block or flag as insecure.`,
        brutal: `Found ${s.security.mixedContentCount} plain-HTTP resource${s.security.mixedContentCount === 1 ? "" : "s"} on a supposedly secure page. Half-secure isn't secure.`,
      },
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
      problem: {
        constructive: "No HTML5 doctype declaration was found, which can trigger inconsistent quirks-mode rendering across browsers.",
        brutal: "No doctype. You're letting every browser guess how to render this page, and they don't all guess the same way.",
      },
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
      problem: {
        constructive: "A meta-refresh redirect was found, which is an outdated pattern that hurts SEO and accessibility.",
        brutal: "You're using meta-refresh redirects like it's 2005. Screen readers and search engines both handle this badly.",
      },
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
      problem: {
        constructive: `This URL takes ${s.security.redirectHopCount} redirect hops to resolve, adding latency and diluting SEO signal.`,
        brutal: `${s.security.redirectHopCount} redirects just to load the page. That's not a redirect, that's a scavenger hunt.`,
      },
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
      problem: {
        constructive: `The page took ${(s.security.responseTimeMs / 1000).toFixed(1)}s to respond, well above the ~1s target for a good first impression.`,
        brutal: `${(s.security.responseTimeMs / 1000).toFixed(1)} seconds just to get bytes back. Visitors are gone before your server wakes up.`,
      },
      fix: "Investigate server-side latency — caching, database query time, or cold-start delay on serverless functions.",
      snippet: `// Add server-side caching for expensive routes\n+  export const revalidate = 3600; // ISR cache for 1 hour`,
      language: "diff",
    });
  }

  const lowestCats = [...categories].sort((a, b) => a.score - b.score).map((c) => c.label);
  const ranked = candidates.sort(
    (a, b) => lowestCats.indexOf(a.category) - lowestCats.indexOf(b.category)
  );
  return ranked.slice(0, 4);
}

/* ────────────────────────────────────────────────────────────────
   Gemini-assisted copy generation — one task per concern, each with
   independent per-task API keys and failover (see lib/gemini.ts).
   ──────────────────────────────────────────────────────────────── */
interface VerdictCopy {
  verdictConstructive: string;
  verdictBrutal: string;
}

interface PromoCopy {
  xPost: string;
  linkedinPost: string;
}

async function generateVerdictWithGemini(
  host: string,
  overall: number,
  categories: CategoryScore[]
): Promise<VerdictCopy | null> {
  const prompt = `You are an expert website auditor. Given a site "${host}" with an overall score of ${overall.toFixed(
    1
  )}/10 and these category scores: ${categories.map((c) => `${c.label}: ${c.score.toFixed(1)}`).join(", ")}.

Return ONLY valid JSON (no markdown fences) matching this exact shape:
{
  "verdictConstructive": "one encouraging but honest sentence verdict",
  "verdictBrutal": "one savage but fair roast-style sentence verdict"
}`;

  const result = await generateJsonForTask<VerdictCopy>("VERDICT", prompt, { temperature: 0.8 });
  if (result && typeof result.verdictConstructive === "string" && typeof result.verdictBrutal === "string") {
    return result;
  }
  return null;
}

async function generatePromoWithGemini(
  host: string,
  overall: number,
  categories: CategoryScore[]
): Promise<PromoCopy | null> {
  const prompt = `You are a social media copywriter. Given a site "${host}" with an overall audit score of ${overall.toFixed(
    1
  )}/10 and these category scores: ${categories.map((c) => `${c.label}: ${c.score.toFixed(1)}`).join(", ")}.

Return ONLY valid JSON (no markdown fences) matching this exact shape:
{
  "xPost": "a short punchy X/Twitter post under 280 chars announcing this audit result, include the score and 2-3 hashtags",
  "linkedinPost": "a longer structured LinkedIn post with 3-4 bullet points summarizing the audit, professional tone"
}`;

  const result = await generateJsonForTask<PromoCopy>("PROMO", prompt, { temperature: 0.85 });
  if (result && typeof result.xPost === "string" && typeof result.linkedinPost === "string") {
    return result;
  }
  return null;
}

/**
 * BANNER task: writes with a senior graphic designer persona so the
 * shareable banner reads like an actual designed creative, not a
 * template fill-in. Produces a short headline, a one-line tagline, one
 * word to visually emphasize, and a layout direction. Falls back to a
 * deterministic, still-designed default if Gemini is unavailable.
 */
async function generateBannerDesign(
  host: string,
  overall: number,
  categories: CategoryScore[]
): Promise<BannerDesign | null> {
  const prompt = `You are a senior graphic designer at a top brand studio, art-directing a shareable
1200x630 social banner for a website audit result. The site is "${host}", overall score
${overall.toFixed(1)}/10, with category scores: ${categories
    .map((c) => `${c.label}: ${c.score.toFixed(1)}`)
    .join(", ")}.

Think like a designer, not a copywriter: the headline must be short enough to sit at 56-64px
type without wrapping more than twice, the tagline must support it without repeating it, and
you must choose ONE word from the headline to visually emphasize with a color accent for
hierarchy. Also choose whether the score badge should be a large centered circular badge
("centered-badge") or a compact left-aligned stat block ("left-stacked") based on how much
headline text there is.

Return ONLY valid JSON (no markdown fences) matching this exact shape:
{
  "headline": "max 6 words, punchy, describes the audit outcome",
  "tagline": "max 12 words, one supporting line, no repetition of the headline",
  "accentWord": "exactly one word copied verbatim from the headline to emphasize",
  "layout": "centered-badge" | "left-stacked"
}`;

  const result = await generateJsonForTask<BannerDesign>("BANNER", prompt, { temperature: 0.75 });
  if (
    result &&
    typeof result.headline === "string" &&
    typeof result.tagline === "string" &&
    typeof result.accentWord === "string" &&
    (result.layout === "centered-badge" || result.layout === "left-stacked")
  ) {
    return result;
  }
  return null;
}

function defaultBannerDesign(host: string, overall: number): BannerDesign {
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
      tagline: `${host} scored ${overall.toFixed(1)}/10 on a live AI audit.`,
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
   Heuristic fallback copy (used when Gemini is unavailable/failed).
   ──────────────────────────────────────────────────────────────── */
function verdictFor(overall: number, host: string) {
  if (overall >= 8) {
    return {
      constructive: `${host} is in strong shape \u2014 a few targeted fixes away from best-in-class.`,
      brutal: `${host} is annoyingly good. Fine, you win. For now.`,
    };
  }
  if (overall >= 5) {
    return {
      constructive: `${host} has a solid foundation but is leaving conversions on the table.`,
      brutal: `${host}: solid engine, vague value prop. You built the car and forgot to tell anyone where it drives.`,
    };
  }
  return {
    constructive: `${host} needs focused work across messaging and conversion fundamentals.`,
    brutal: `${host} is the digital equivalent of a store with no sign, no prices, and a locked door.`,
  };
}

function buildPromo(host: string, overall: number) {
  const xPost = `Just ran ${host} through an AI audit \uD83D\uDD0D\n\nScore: ${overall.toFixed(1)}/10\n\nFull breakdown of what's working and what's not \u2193\n\n#buildinpublic #webdesign #CRO`;
  const linkedinPost = `I audited ${host} with an AI-powered site review tool. Here's what stood out:\n\nOverall score: ${overall.toFixed(1)}/10\n\n\u2022 Messaging clarity has room to sharpen the core value prop\n\u2022 A few CRO quick-wins could meaningfully lift conversion\n\u2022 Technical SEO fundamentals need a pass on metadata\n\u2022 Brand consistency needs attention across sections\n\nSmall, specific changes compound fast. Worth a 10-minute audit before your next launch.`;
  return { xPost, linkedinPost };
}

/* ────────────────────────────────────────────────────────────────
   Live fetch + orchestration
   ──────────────────────────────────────────────────────────────── */
async function fetchWithTimeout(url: string, timeoutMs: number): Promise<Response | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; AudityxeBot/1.0; +https://audityxe.app)",
      },
    });
    return res;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Fetches and parses the real /robots.txt for the target origin. Never
 * throws — a missing or unreachable robots.txt is itself a real, valid
 * finding (and is scored/flagged as such), not an error. */
async function analyzeRobotsTxt(origin: string): Promise<RobotsSignals> {
  const res = await fetchWithTimeout(`${origin}/robots.txt`, 8000);
  if (!res) {
    return { fetched: false, exists: false, blocksAllCrawlers: false, referencesSitemap: false, sitemapUrls: [], ruleCount: 0 };
  }
  if (!res.ok) {
    return { fetched: true, exists: false, blocksAllCrawlers: false, referencesSitemap: false, sitemapUrls: [], ruleCount: 0 };
  }

  const text = await res.text();
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  const disallowAllForStar = /User-agent:\s*\*\s*[\r\n]+\s*Disallow:\s*\/\s*$/im.test(text) ||
    (() => {
      let currentIsStar = false;
      for (const line of lines) {
        if (/^user-agent:/i.test(line)) currentIsStar = /\*\s*$/.test(line);
        if (currentIsStar && /^disallow:\s*\/\s*$/i.test(line)) return true;
      }
      return false;
    })();

  const sitemapUrls = lines
    .filter((l) => /^sitemap:/i.test(l))
    .map((l) => l.replace(/^sitemap:\s*/i, "").trim())
    .filter(Boolean);

  const ruleCount = lines.filter((l) => /^(disallow|allow):/i.test(l)).length;

  return {
    fetched: true,
    exists: true,
    blocksAllCrawlers: disallowAllForStar,
    referencesSitemap: sitemapUrls.length > 0,
    sitemapUrls,
    ruleCount,
  };
}

/** Fetches and parses the real /sitemap.xml (or the URL referenced from
 * robots.txt, if present) for the target origin. Handles both a plain
 * <urlset> and a <sitemapindex> of nested sitemaps. */
async function analyzeSitemap(origin: string, robotsSitemapUrls: string[]): Promise<SitemapSignals> {
  const candidateUrl = robotsSitemapUrls[0] || `${origin}/sitemap.xml`;
  const res = await fetchWithTimeout(candidateUrl, 8000);

  if (!res) {
    return { fetched: false, exists: false, isValidXml: false, urlCount: 0, hasLastmod: false, isSitemapIndex: false };
  }
  if (!res.ok) {
    return { fetched: true, exists: false, isValidXml: false, urlCount: 0, hasLastmod: false, isSitemapIndex: false };
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
  };
}

interface FetchOutcome {
  html: string;
  finalUrl: string;
  headers: Headers;
  redirectHopCount: number;
  httpDowngradeDetected: boolean;
  responseTimeMs: number;
}

async function fetchHtml(rawUrl: string): Promise<FetchOutcome> {
  const url = normalizeUrl(rawUrl);

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error(`"${rawUrl}" doesn't look like a valid URL. Try something like example.com.`);
  }
  if (!/^https?:$/.test(parsed.protocol)) {
    throw new Error("Only http:// and https:// URLs can be audited.");
  }
  if (!parsed.hostname || !parsed.hostname.includes(".")) {
    throw new Error(`"${rawUrl}" doesn't look like a valid domain. Try something like example.com.`);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  const startedAt = Date.now();

  try {
    // Follow redirects manually (rather than fetch's redirect:"follow") so
    // we can count real hops and detect an https→http downgrade anywhere
    // in the chain — both genuine, free signals no third-party tool is
    // needed for.
    let currentUrl = url;
    let hopCount = 0;
    let downgradeDetected = false;
    const visited = new Set<string>();
    let res: Response;

    while (true) {
      if (visited.has(currentUrl)) {
        throw new Error("This URL redirects in a loop and never resolves.");
      }
      visited.add(currentUrl);

      res = await fetch(currentUrl, {
        redirect: "manual",
        signal: controller.signal,
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; AudityxeBot/1.0; +https://audityxe.app)",
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

    if (!res!.ok) {
      throw new Error(`Site responded with status ${res!.status}`);
    }
    const contentType = res!.headers.get("content-type") || "";
    if (contentType && !/text\/html|application\/xhtml/i.test(contentType)) {
      throw new Error(`URL did not return an HTML page (got ${contentType.split(";")[0]}).`);
    }
    const html = await res!.text();
    if (!html || html.trim().length < 20) {
      throw new Error("The page returned an empty response.");
    }

    return {
      html,
      finalUrl: currentUrl,
      headers: res!.headers,
      redirectHopCount: hopCount,
      httpDowngradeDetected: downgradeDetected,
      responseTimeMs: Date.now() - startedAt,
    };
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error("The site took too long to respond (timed out after 15s).");
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

function extractSecurityFromResponse(
  headers: Headers,
  finalUrl: string,
  redirectHopCount: number,
  httpDowngradeDetected: boolean,
  responseTimeMs: number
): Partial<SecuritySignals> {
  const get = (name: string) => headers.get(name) || "";
  return {
    finalIsHttps: finalUrl.startsWith("https://"),
    redirectHopCount,
    httpDowngradeDetected,
    responseTimeMs,
    hasHsts: !!get("strict-transport-security"),
    hasCsp: !!get("content-security-policy"),
    hasXFrameOptions: !!get("x-frame-options"),
    hasXContentTypeOptions: /nosniff/i.test(get("x-content-type-options")),
    hasReferrerPolicy: !!get("referrer-policy"),
    hasPermissionsPolicy: !!get("permissions-policy"),
    exposesServerHeader: !!get("server") && !/^cloudflare$/i.test(get("server")),
    exposesPoweredBy: !!get("x-powered-by"),
    hasCacheControl: !!get("cache-control"),
    hasCompression: !!get("content-encoding"),
  };
}

async function auditOne(rawUrl: string) {
  const fetched = await fetchHtml(rawUrl);
  const signals = extractSignals(fetched.html, fetched.finalUrl);

  signals.security = {
    ...signals.security,
    ...extractSecurityFromResponse(
      fetched.headers,
      fetched.finalUrl,
      fetched.redirectHopCount,
      fetched.httpDowngradeDetected,
      fetched.responseTimeMs
    ),
  };

  const origin = new URL(fetched.finalUrl).origin;
  const robotsTxt = await analyzeRobotsTxt(origin);
  const sitemap = await analyzeSitemap(origin, robotsTxt.sitemapUrls);
  signals.robotsTxt = robotsTxt;
  signals.sitemap = sitemap;

  const categories = scoreFromSignals(signals);
  const overall = Math.round((categories.reduce((sum, c) => sum + c.score, 0) / categories.length) * 10) / 10;
  const host = hostOf(fetched.finalUrl);
  return { host, overall, categories, signals, html: fetched.html, finalUrl: fetched.finalUrl, origin };
}

export async function runAudit(rawUrl: string, competitorRawUrl?: string): Promise<AuditResult> {
  if (!rawUrl || !rawUrl.trim()) {
    throw new Error("A URL is required.");
  }

  const primary = await auditOne(rawUrl);
  const fixes = buildFixes(primary.signals, primary.categories);
  const deepSignals = extractDeepSignals(primary.html);

  const [verdictCopy, promoCopy, bannerDesign, brokenLinks, imageSample, adsTxt, ogImage] = await Promise.all([
    generateVerdictWithGemini(primary.host, primary.overall, primary.categories),
    generatePromoWithGemini(primary.host, primary.overall, primary.categories),
    generateBannerDesign(primary.host, primary.overall, primary.categories),
    checkBrokenLinks(primary.html, primary.finalUrl),
    checkImageSample(primary.html, primary.finalUrl),
    checkAdsTxt(primary.origin),
    checkOgImage(deepSignals.socialMeta.ogImageUrl, primary.finalUrl),
  ]);

  const modules = buildAuditModules({
    signals: primary.signals,
    deep: deepSignals,
    brokenLinks,
    imageSample,
    adsTxt,
    ogImage,
  });

  const verdict = verdictCopy
    ? { constructive: verdictCopy.verdictConstructive, brutal: verdictCopy.verdictBrutal }
    : verdictFor(primary.overall, primary.host);
  const { xPost, linkedinPost } = promoCopy
    ? { xPost: promoCopy.xPost, linkedinPost: promoCopy.linkedinPost }
    : buildPromo(primary.host, primary.overall);
  const banner = bannerDesign ?? defaultBannerDesign(primary.host, primary.overall);

  let competitor;
  if (competitorRawUrl && competitorRawUrl.trim()) {
    try {
      const comp = await auditOne(competitorRawUrl);
      const summary: string[] = [];
      primary.categories.forEach((c, i) => {
        const diff = c.score - comp.categories[i].score;
        if (Math.abs(diff) >= 0.4) {
          summary.push(
            diff > 0
              ? `You win on ${c.label} (+${diff.toFixed(1)})`
              : `${comp.host} wins on ${c.label} (${diff.toFixed(1)})`
          );
        }
      });
      competitor = {
        url: comp.host,
        overall: comp.overall,
        categories: comp.categories,
        summary,
      };
    } catch {
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
    banner,
    modules,
    competitor,
  };
}
