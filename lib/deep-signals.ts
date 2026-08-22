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
  hasSkipLink: boolean;
  positiveTabindexCount: number;
  ariaHiddenOnBodyOrHtml: boolean;
  imagesWithGenericAlt: number;
}

export interface TechStackSignals {
  generator: string | null;
  detectedCMS: string | null;
  detectedFrameworks: string[];
  detectedAnalytics: string[];
  detectedTagManagers: string[];
  jqueryDetected: boolean;
  detectedCDNs: string[];
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
  hasLocalBusiness: boolean;
  hasWebSite: boolean;
  hasReview: boolean;
  missingRequiredFieldsByType: Record<string, string[]>;
}

export interface ImageOptimizationSignals {
  total: number;
  missingDimensions: number;
  modernFormatCount: number; // webp / avif referenced in src
  legacyFormatCount: number; // jpg / jpeg / png / gif / bmp referenced in src
  lazyLoadedCount: number;
  srcsetUsageCount: number;
  dataUriCount: number; // inline base64 images bloating HTML
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

export interface DeepSignals {
  accessibility: AccessibilitySignals;
  techStack: TechStackSignals;
  htmlStructure: HtmlStructureSignals;
  thirdPartyScripts: ThirdPartyScriptSignals;
  socialMeta: SocialMetaSignals;
  monetization: MonetizationSignals;
  structuredData: StructuredDataSignals;
  images: ImageOptimizationSignals;
  mobile: MobileSignals;
}

function attr(tag: string, name: string): string | null {
  const m = tag.match(new RegExp(`${name}\\s*=\\s*["']([^"']*)["']`, "i"));
  return m ? m[1] : null;
}

const ANALYTICS_PATTERNS: [RegExp, string][] = [
  [/google-analytics\.com|googletagmanager\.com\/gtag|gtag\(/i, "Google Analytics"],
  [/plausible\.io/i, "Plausible"],
  [/cdn\.segment\.com/i, "Segment"],
  [/static\.hotjar\.com/i, "Hotjar"],
  [/cdn\.amplitude\.com/i, "Amplitude"],
  [/mixpanel\.com/i, "Mixpanel"],
  [/analytics\.tiktok\.com/i, "TikTok Pixel"],
  [/connect\.facebook\.net.*fbevents/i, "Meta Pixel"],
  [/clarity\.ms/i, "Microsoft Clarity"],
  [/matomo\.js|piwik\.js/i, "Matomo"],
];

const AD_NETWORK_PATTERNS: [RegExp, string][] = [
  [/pagead2\.googlesyndication\.com|adsbygoogle/i, "Google AdSense"],
  [/googletagservices\.com|doubleclick\.net/i, "Google Ad Manager / DoubleClick"],
  [/ezoic\.net|ezojs\.com/i, "Ezoic"],
  [/scripts\.mediavine\.com/i, "Mediavine"],
  [/cdn\.adthrive\.com|adthrive/i, "AdThrive / Raptive"],
  [/monetag\.com|vemtoutcheck|groleegni\.net/i, "Monetag"],
  [/propellerads\.com/i, "PropellerAds"],
  [/taboola\.com/i, "Taboola"],
  [/outbrain\.com/i, "Outbrain"],
];

const CHAT_WIDGET_PATTERNS: [RegExp, string][] = [
  [/widget\.intercom\.io/i, "Intercom"],
  [/embed\.tawk\.to/i, "Tawk.to"],
  [/js\.driftt\.com|drift\.com/i, "Drift"],
  [/widget\.crisp\.chat/i, "Crisp"],
  [/static\.zdassets\.com|zendesk/i, "Zendesk Chat"],
  [/embed\.hubspot\.com|js\.hs-scripts\.com/i, "HubSpot Chat"],
];

const FONT_PATTERNS: [RegExp, string][] = [
  [/fonts\.googleapis\.com|fonts\.gstatic\.com/i, "Google Fonts"],
  [/use\.typekit\.net/i, "Adobe Fonts (Typekit)"],
  [/fonts\.cdnfonts\.com/i, "CDN Fonts"],
];

const TAG_MANAGER_PATTERNS: [RegExp, string][] = [
  [/googletagmanager\.com\/gtm\.js/i, "Google Tag Manager"],
  [/cdn\.segment\.com\/analytics\.js/i, "Segment (tag orchestration)"],
];

const CMS_PATTERNS: [RegExp, string][] = [
  [/wp-content|wp-includes/i, "WordPress"],
  [/cdn\.shopify\.com|Shopify\.theme/i, "Shopify"],
  [/static\.wixstatic\.com|wix\.com/i, "Wix"],
  [/squarespace\.com|static1\.squarespace/i, "Squarespace"],
  [/webflow\.com|\.webflow\.io/i, "Webflow"],
  [/duda\.co/i, "Duda"],
  [/joomla/i, "Joomla"],
  [/\/sites\/default\/files/i, "Drupal"],
  [/ghost\.io|content=\"Ghost/i, "Ghost"],
];

const FRAMEWORK_PATTERNS: [RegExp, string][] = [
  [/__NEXT_DATA__|_next\/static/i, "Next.js"],
  [/data-reactroot|react-dom/i, "React"],
  [/ng-version=|angular/i, "Angular"],
  [/__NUXT__|_nuxt\//i, "Nuxt.js"],
  [/data-v-app|vue@/i, "Vue.js"],
  [/svelte-/i, "Svelte"],
  [/astro-island/i, "Astro"],
];

const CDN_PATTERNS: [RegExp, string][] = [
  [/cdn\.jsdelivr\.net/i, "jsDelivr"],
  [/cdnjs\.cloudflare\.com/i, "cdnjs"],
  [/unpkg\.com/i, "unpkg"],
  [/ajax\.googleapis\.com/i, "Google Hosted Libraries"],
  [/fastly\.net/i, "Fastly"],
  [/akamaized\.net/i, "Akamai"],
];

const DONATION_PATTERNS: [RegExp, string][] = [
  [/buymeacoffee\.com/i, "Buy Me a Coffee"],
  [/patreon\.com/i, "Patreon"],
  [/ko-fi\.com/i, "Ko-fi"],
  [/opencollective\.com/i, "Open Collective"],
  [/github\.com\/sponsors/i, "GitHub Sponsors"],
];

const PAYMENT_PATTERNS: [RegExp, string][] = [
  [/js\.stripe\.com|checkout\.stripe\.com/i, "Stripe"],
  [/paypal\.com\/sdk|paypalobjects\.com/i, "PayPal"],
  [/js\.paddle\.com/i, "Paddle"],
  [/checkout\.razorpay\.com/i, "Razorpay"],
  [/js\.lemonsqueezy\.com/i, "Lemon Squeezy"],
  [/gumroad\.com/i, "Gumroad"],
];

function matchAll(text: string, patterns: [RegExp, string][]): string[] {
  const found = new Set<string>();
  for (const [re, label] of patterns) {
    if (re.test(text)) found.add(label);
  }
  return Array.from(found);
}

export function extractDeepSignals(html: string): DeepSignals {
  const has = (re: RegExp) => re.test(html);
  const bodyMatch = html.match(/<body[\s\S]*?>([\s\S]*)<\/body>/i);
  const bodyHtml = bodyMatch ? bodyMatch[1] : html;

  /* ── Accessibility ───────────────────────────────────────── */
  const htmlLangMatch = html.match(/<html[^>]+lang\s*=\s*["']([^"']*)["']/i);
  const inputTags = [...bodyHtml.matchAll(/<input\b[^>]*>/gi)].filter(
    (m) => !/type\s*=\s*["'](hidden|submit|button|image)["']/i.test(m[0])
  );
  const labelForTargets = new Set(
    [...bodyHtml.matchAll(/<label\b[^>]*for\s*=\s*["']([^"']+)["']/gi)].map((m) => m[1])
  );
  let inputsWithoutLabel = 0;
  for (const input of inputTags) {
    const id = attr(input[0], "id");
    const hasAriaLabel = /aria-label(?:ledby)?\s*=/i.test(input[0]);
    const hasPlaceholderOnly = /placeholder\s*=/i.test(input[0]) && !id && !hasAriaLabel;
    const labeled = (id && labelForTargets.has(id)) || hasAriaLabel;
    if (!labeled) inputsWithoutLabel++;
    void hasPlaceholderOnly;
  }

  const buttonTags = [
    ...bodyHtml.matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button>/gi),
  ];
  let buttonsWithoutAccessibleName = 0;
  for (const [, attrs, inner] of buttonTags) {
    const text = inner.replace(/<[^>]+>/g, "").trim();
    const hasAriaLabel = /aria-label\s*=/i.test(attrs);
    if (!text && !hasAriaLabel) buttonsWithoutAccessibleName++;
  }

  const linkTags = [...bodyHtml.matchAll(/<a\b([^>]*href[^>]*)>([\s\S]*?)<\/a>/gi)];
  let linksWithoutAccessibleName = 0;
  for (const [, attrs, inner] of linkTags) {
    const text = inner.replace(/<[^>]+>/g, "").trim();
    const hasAriaLabel = /aria-label\s*=/i.test(attrs);
    const hasImgAlt = /<img[^>]+alt\s*=\s*["'][^"']+["']/i.test(inner);
    if (!text && !hasAriaLabel && !hasImgAlt) linksWithoutAccessibleName++;
  }

  const genericAltWords = /^(image|photo|picture|img|banner|icon|graphic)\.?$/i;
  const imgAltValues = [...html.matchAll(/<img\b[^>]*alt\s*=\s*["']([^"']*)["'][^>]*>/gi)].map((m) => m[1].trim());
  const imagesWithGenericAlt = imgAltValues.filter((v) => v && genericAltWords.test(v)).length;

  const accessibility: AccessibilitySignals = {
    htmlLangValue: htmlLangMatch ? htmlLangMatch[1] : null,
    totalFormInputs: inputTags.length,
    inputsWithoutLabel,
    totalButtons: buttonTags.length,
    buttonsWithoutAccessibleName,
    totalLinks: linkTags.length,
    linksWithoutAccessibleName,
    hasSkipLink: /href\s*=\s*["']#(main|content|skip)/i.test(bodyHtml.slice(0, 2000)),
    positiveTabindexCount: [...html.matchAll(/tabindex\s*=\s*["'](\d+)["']/gi)].filter(
      (m) => Number(m[1]) > 0
    ).length,
    ariaHiddenOnBodyOrHtml: /<(html|body)[^>]+aria-hidden\s*=\s*["']true["']/i.test(html),
    imagesWithGenericAlt,
  };

  /* ── Technical stack ─────────────────────────────────────── */
  const generatorMatch = html.match(/<meta[^>]+name=["']generator["'][^>]*content=["']([^"']*)["']/i);
  const techStack: TechStackSignals = {
    generator: generatorMatch ? generatorMatch[1] : null,
    detectedCMS: matchAll(html, CMS_PATTERNS)[0] || null,
    detectedFrameworks: matchAll(html, FRAMEWORK_PATTERNS),
    detectedAnalytics: matchAll(html, ANALYTICS_PATTERNS),
    detectedTagManagers: matchAll(html, TAG_MANAGER_PATTERNS),
    jqueryDetected: /jquery(?:[.-]\d[\w.]*)?\.js/i.test(html) || /jQuery\s*\(/i.test(html),
    detectedCDNs: matchAll(html, CDN_PATTERNS),
  };

  /* ── HTML structure ──────────────────────────────────────── */
  const idValues = [...html.matchAll(/\bid\s*=\s*["']([^"']+)["']/gi)].map((m) => m[1]);
  const idCounts = new Map<string, number>();
  for (const id of idValues) idCounts.set(id, (idCounts.get(id) || 0) + 1);
  const duplicateIdCount = Array.from(idCounts.values()).filter((c) => c > 1).length;

  const divCount = (bodyHtml.match(/<div\b/gi) || []).length;
  const totalElementCount = (bodyHtml.match(/<[a-z][a-z0-9]*\b/gi) || []).length || 1;
  const semanticTags = ["header", "nav", "main", "footer", "article", "section", "aside", "figure"];
  const semanticTagCount = semanticTags.reduce(
    (sum, tag) => sum + (bodyHtml.match(new RegExp(`<${tag}\\b`, "gi")) || []).length,
    0
  );
  const deprecatedTags = ["center", "font", "marquee", "blink", "big", "strike", "acronym"];
  const deprecatedTagsUsed = deprecatedTags.filter((tag) => new RegExp(`<${tag}\\b`, "i").test(bodyHtml));

  const htmlStructure: HtmlStructureSignals = {
    hasHeaderTag: /<header\b/i.test(bodyHtml),
    hasNavTag: /<nav\b/i.test(bodyHtml),
    hasMainTag: /<main\b/i.test(bodyHtml),
    hasFooterTag: /<footer\b/i.test(bodyHtml),
    hasArticleOrSection: /<article\b|<section\b/i.test(bodyHtml),
    semanticTagCount,
    divCount,
    totalElementCount,
    divRatio: Math.round((divCount / totalElementCount) * 100) / 100,
    totalIdCount: idValues.length,
    duplicateIdCount,
    deprecatedTagsUsed,
    commentCount: (html.match(/<!--[\s\S]*?-->/g) || []).length,
  };

  /* ── Third-party scripts ─────────────────────────────────── */
  const scriptSrcs = [...html.matchAll(/<script\b[^>]*\bsrc\s*=\s*["']([^"']+)["'][^>]*>/gi)].map((m) => m[1]);
  const externalScriptDomains = Array.from(
    new Set(
      scriptSrcs
        .filter((src) => /^https?:\/\//i.test(src) || src.startsWith("//"))
        .map((src) => {
          try {
            return new URL(src.startsWith("//") ? "https:" + src : src).hostname;
          } catch {
            return null;
          }
        })
        .filter((h): h is string => !!h)
    )
  );

  const thirdPartyScripts: ThirdPartyScriptSignals = {
    externalScriptDomains,
    analyticsScripts: matchAll(html, ANALYTICS_PATTERNS),
    adScripts: matchAll(html, AD_NETWORK_PATTERNS),
    chatWidgetScripts: matchAll(html, CHAT_WIDGET_PATTERNS),
    fontScripts: matchAll(html, FONT_PATTERNS),
    tagManagerScripts: matchAll(html, TAG_MANAGER_PATTERNS),
    otherThirdPartyScripts: externalScriptDomains.filter(
      (d) =>
        !ANALYTICS_PATTERNS.some(([re]) => re.test(d)) &&
        !AD_NETWORK_PATTERNS.some(([re]) => re.test(d)) &&
        !CHAT_WIDGET_PATTERNS.some(([re]) => re.test(d)) &&
        !FONT_PATTERNS.some(([re]) => re.test(d)) &&
        !TAG_MANAGER_PATTERNS.some(([re]) => re.test(d)) &&
        !CDN_PATTERNS.some(([re]) => re.test(d))
    ),
    totalExternalScripts: externalScriptDomains.length,
  };

  /* ── Social metadata ─────────────────────────────────────── */
  const metaProp = (prop: string) => {
    const m = html.match(new RegExp(`<meta[^>]+property=["']${prop}["'][^>]*content=["']([^"']*)["']`, "i"));
    return m ? m[1] : null;
  };
  const metaName = (name: string) => {
    const m = html.match(new RegExp(`<meta[^>]+name=["']${name}["'][^>]*content=["']([^"']*)["']`, "i"));
    return m ? m[1] : null;
  };

  const socialMeta: SocialMetaSignals = {
    ogType: metaProp("og:type"),
    ogUrl: metaProp("og:url"),
    ogSiteName: metaProp("og:site_name"),
    ogImageUrl: metaProp("og:image"),
    twitterCard: metaName("twitter:card"),
    twitterSite: metaName("twitter:site"),
    twitterCreator: metaName("twitter:creator"),
    twitterImageUrl: metaName("twitter:image"),
    facebookAppId: has(/<meta[^>]+property=["']fb:app_id["']/i),
  };

  /* ── Monetization ─────────────────────────────────────────── */
  const anchorHrefs = [...bodyHtml.matchAll(/<a\b[^>]*href\s*=\s*["']([^"']+)["']/gi)].map((m) => m[1]);
  const affiliateLinkCount = anchorHrefs.filter((h) =>
    /[?&](tag|ref|affiliate|aff_id|utm_source=affiliate)=/i.test(h) || /amzn\.to|shareasale|cj\.com|impact\.com|partnerize/i.test(h)
  ).length;

  const monetization: MonetizationSignals = {
    adSenseDetected: /pagead2\.googlesyndication\.com|adsbygoogle/i.test(html),
    otherAdNetworksDetected: matchAll(html, AD_NETWORK_PATTERNS).filter((n) => n !== "Google AdSense"),
    affiliateLinkCount,
    donationPlatformsDetected: matchAll(html, DONATION_PATTERNS),
    paymentProcessorsDetected: matchAll(html, PAYMENT_PATTERNS),
    hasPricingSignals: /\$\d|USD|pricing|price/i.test(bodyHtml.slice(0, 20000)),
    hasCartOrCheckoutSignals: /add.to.cart|checkout|shopping.cart/i.test(bodyHtml),
  };

  /* ── Structured data (JSON-LD) ───────────────────────────── */
  const ldBlocks = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  const types: string[] = [];
  let parseErrorCount = 0;
  const missingRequiredFieldsByType: Record<string, string[]> = {};

  const REQUIRED_FIELDS: Record<string, string[]> = {
    Organization: ["name", "url"],
    Product: ["name", "image"],
    Article: ["headline", "author"],
    BreadcrumbList: ["itemListElement"],
    FAQPage: ["mainEntity"],
    LocalBusiness: ["name", "address"],
    WebSite: ["name", "url"],
    Review: ["author", "reviewRating"],
  };

  function walkNode(node: unknown) {
    if (!node || typeof node !== "object") return;
    const obj = node as Record<string, unknown>;
    const rawType = obj["@type"];
    const typeList = Array.isArray(rawType) ? rawType : rawType ? [rawType] : [];
    for (const t of typeList) {
      if (typeof t !== "string") continue;
      types.push(t);
      const required = REQUIRED_FIELDS[t];
      if (required) {
        const missing = required.filter((f) => !(f in obj));
        if (missing.length > 0) missingRequiredFieldsByType[t] = missing;
      }
    }
    if (Array.isArray(obj["@graph"])) {
      for (const child of obj["@graph"] as unknown[]) walkNode(child);
    }
  }

  for (const [, raw] of ldBlocks) {
    try {
      const parsed = JSON.parse(raw.trim());
      if (Array.isArray(parsed)) parsed.forEach(walkNode);
      else walkNode(parsed);
    } catch {
      parseErrorCount++;
    }
  }

  const structuredData: StructuredDataSignals = {
    blockCount: ldBlocks.length,
    parseErrorCount,
    types: Array.from(new Set(types)),
    hasOrganization: types.includes("Organization"),
    hasBreadcrumb: types.includes("BreadcrumbList"),
    hasProduct: types.includes("Product"),
    hasArticle: types.includes("Article") || types.includes("NewsArticle") || types.includes("BlogPosting"),
    hasFaqPage: types.includes("FAQPage"),
    hasLocalBusiness: types.includes("LocalBusiness"),
    hasWebSite: types.includes("WebSite"),
    hasReview: types.includes("Review") || types.includes("AggregateRating"),
    missingRequiredFieldsByType,
  };

  /* ── Images ───────────────────────────────────────────────── */
  const imgTags = [...html.matchAll(/<img\b[^>]*>/gi)].map((m) => m[0]);
  const missingDimensions = imgTags.filter(
    (t) => !/\bwidth\s*=/i.test(t) || !/\bheight\s*=/i.test(t)
  ).length;
  const modernFormatCount = imgTags.filter((t) => /\.(webp|avif)(\?|["'])/i.test(t)).length;
  const legacyFormatCount = imgTags.filter((t) => /\.(jpe?g|png|gif|bmp)(\?|["'])/i.test(t)).length;
  const lazyLoadedCount = imgTags.filter((t) => /loading\s*=\s*["']lazy["']/i.test(t)).length;
  const srcsetUsageCount = imgTags.filter((t) => /\bsrcset\s*=/i.test(t)).length;
  const dataUriCount = imgTags.filter((t) => /src\s*=\s*["']data:image/i.test(t)).length;

  const images: ImageOptimizationSignals = {
    total: imgTags.length,
    missingDimensions,
    modernFormatCount,
    legacyFormatCount,
    lazyLoadedCount,
    srcsetUsageCount,
    dataUriCount,
  };

  /* ── Mobile responsiveness ───────────────────────────────── */
  const viewportMatch = html.match(/<meta[^>]+name=["']viewport["'][^>]*content=["']([^"']*)["']/i);
  const viewportContent = viewportMatch ? viewportMatch[1] : null;
  const inlineStyleBlocks = [...html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)].map((m) => m[1]).join("\n");
  const mediaQueryCount = (inlineStyleBlocks.match(/@media[^{]+\{/gi) || []).length;
  // Utility-class responsive frameworks (Tailwind, Bootstrap, Bulma, etc.)
  // apply their breakpoints from an external stylesheet we don't fetch —
  // but the responsive intent is still real and visible right in the
  // class names on real elements, so it's a legitimate proxy signal when
  // no inline @media rules are present to inspect directly.
  const responsiveClassHintCount = (
    html.match(/class\s*=\s*["'][^"']*\b(?:sm|md|lg|xl|2xl):[a-z-]|class\s*=\s*["'][^"']*\b(?:col-(?:sm|md|lg|xl)-\d|is-mobile|is-tablet|is-desktop)\b/gi) || []
  ).length;
  const touchIconSizes = [...html.matchAll(/<link[^>]+rel=["']apple-touch-icon["'][^>]*sizes=["']([^"']+)["']/gi)].map(
    (m) => m[1]
  );

  const mobile: MobileSignals = {
    viewportContent,
    viewportHasWidthDevice: !!viewportContent && /width\s*=\s*device-width/i.test(viewportContent),
    viewportAllowsUserScaling: !viewportContent || !/user-scalable\s*=\s*no|maximum-scale\s*=\s*1(?:\.0)?\b/i.test(viewportContent),
    mediaQueryCount,
    responsiveClassHintCount,
    appleTouchIconCount: (html.match(/<link[^>]+rel=["']apple-touch-icon["']/gi) || []).length,
    hasMaskIcon: /<link[^>]+rel=["']mask-icon["']/i.test(html),
    touchIconSizes,
  };

  return {
    accessibility,
    techStack,
    htmlStructure,
    thirdPartyScripts,
    socialMeta,
    monetization,
    structuredData,
    images,
    mobile,
  };
}
