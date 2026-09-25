"use strict";
/**
 * Deep, synchronous, regex-based signal extraction from already-fetched
 * HTML. No network calls here — everything is derived from the single
 * HTML response Audityxe already has in memory. Real async probes
 * (broken links, image HEAD checks, ads.txt) live in network-checks.ts.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractDeepSignals = extractDeepSignals;
function attr(tag, name) {
    const m = tag.match(new RegExp(`${name}\\s*=\\s*["']([^"']*)["']`, "i"));
    return m ? m[1] : null;
}
const ANALYTICS_PATTERNS = [
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
const AD_NETWORK_PATTERNS = [
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
const CHAT_WIDGET_PATTERNS = [
    [/widget\.intercom\.io/i, "Intercom"],
    [/embed\.tawk\.to/i, "Tawk.to"],
    [/js\.driftt\.com|drift\.com/i, "Drift"],
    [/widget\.crisp\.chat/i, "Crisp"],
    [/static\.zdassets\.com|zendesk/i, "Zendesk Chat"],
    [/embed\.hubspot\.com|js\.hs-scripts\.com/i, "HubSpot Chat"],
];
const FONT_PATTERNS = [
    [/fonts\.googleapis\.com|fonts\.gstatic\.com/i, "Google Fonts"],
    [/use\.typekit\.net/i, "Adobe Fonts (Typekit)"],
    [/fonts\.cdnfonts\.com/i, "CDN Fonts"],
];
const TAG_MANAGER_PATTERNS = [
    [/googletagmanager\.com\/gtm\.js/i, "Google Tag Manager"],
    [/cdn\.segment\.com\/analytics\.js/i, "Segment (tag orchestration)"],
];
const CMS_PATTERNS = [
    [/wp-content|wp-includes/i, "WordPress"],
    [/cdn\.shopify\.com|Shopify\.theme/i, "Shopify"],
    [/static\.wixstatic\.com|wix\.com/i, "Wix"],
    [/squarespace\.com|static1\.squarespace/i, "Squarespace"],
    [/webflow\.com|\.webflow\.io/i, "Webflow"],
    [/duda\.co/i, "Duda"],
    [/joomla/i, "Joomla"],
    [/\/sites\/default\/files/i, "Drupal"],
    [/ghost\.io|content="Ghost/i, "Ghost"],
    [/typo3conf|typo3temp/i, "TYPO3"],
    [/umbraco/i, "Umbraco"],
    [/craftcms|craft-cms/i, "Craft CMS"],
    [/sitecore/i, "Sitecore"],
    [/contentful/i, "Contentful"],
    [/sanity\.io|sanity-cdn/i, "Sanity"],
    [/prismic\.io/i, "Prismic"],
    [/hubspot\.net|hs-sites\.com/i, "HubSpot CMS"],
    [/bigcommerce\.com/i, "BigCommerce"],
    [/magento|Mage\.Cookies/i, "Magento"],
    [/prestashop/i, "PrestaShop"],
    [/opencart/i, "OpenCart"],
    [/weebly\.com/i, "Weebly"],
    [/jimdo\.com/i, "Jimdo"],
    [/carrd\.co/i, "Carrd"],
    [/framer\.com\/(?:s|images)|framerusercontent/i, "Framer"],
    [/notion\.so|notion-static/i, "Notion (site builder)"],
];
const ECOMMERCE_PATTERNS = [
    [/cdn\.shopify\.com|Shopify\.theme/i, "Shopify"],
    [/bigcommerce\.com/i, "BigCommerce"],
    [/magento|Mage\.Cookies/i, "Magento"],
    [/prestashop/i, "PrestaShop"],
    [/opencart/i, "OpenCart"],
    [/woocommerce/i, "WooCommerce"],
    [/squarespace-commerce/i, "Squarespace Commerce"],
    [/snipcart/i, "Snipcart"],
    [/ecwid/i, "Ecwid"],
];
const CSS_FRAMEWORK_PATTERNS = [
    [/tailwindcss|class="[^"]*\b(?:flex|grid)\b[^"]*\btext-\w+-\d{3}\b/i, "Tailwind CSS"],
    [/bootstrap(?:\.min)?\.css|class="[^"]*\bcontainer-fluid\b/i, "Bootstrap"],
    [/bulma(?:\.min)?\.css/i, "Bulma"],
    [/foundation(?:\.min)?\.css/i, "Foundation"],
    [/materializecss|materialize\.min\.css/i, "Materialize"],
    [/chakra-ui|css-\w{6,8}-\w+/i, "Chakra UI"],
    [/mui-\w+|@mui\//i, "MUI (Material UI)"],
    [/antd\.min\.css|ant-design/i, "Ant Design"],
];
const PAGE_BUILDER_PATTERNS = [
    [/elementor/i, "Elementor"],
    [/wp-content\/plugins\/divi|et_pb_/i, "Divi Builder"],
    [/fusion-builder|avada/i, "Avada / Fusion Builder"],
    [/beaver-builder|fl-builder/i, "Beaver Builder"],
    [/wpbakery|js_composer/i, "WPBakery Page Builder"],
];
const AB_TESTING_PATTERNS = [
    [/optimizely/i, "Optimizely"],
    [/vwo\.com|visualwebsiteoptimizer/i, "VWO"],
    [/googleoptimize\.com/i, "Google Optimize"],
    [/split\.io/i, "Split.io"],
    [/launchdarkly/i, "LaunchDarkly"],
];
const COOKIE_CONSENT_PATTERNS = [
    [/cookieyes/i, "CookieYes"],
    [/cookiebot/i, "Cookiebot"],
    [/onetrust/i, "OneTrust"],
    [/termly\.io/i, "Termly"],
    [/cookieconsent|cc-window/i, "Generic Cookie Consent"],
    [/usercentrics/i, "Usercentrics"],
    [/quantcast\.mgr\.consensu\.org|quantcast choice/i, "Quantcast Choice"],
];
const HOSTING_HEADER_PATTERNS = [
    [/^vercel$/i, "Vercel"],
    [/^cloudflare$/i, "Cloudflare"],
    [/^netlify$/i, "Netlify"],
    [/^amazons3$|^awselb/i, "AWS"],
    [/^github\.com$/i, "GitHub Pages"],
    [/^fastly$/i, "Fastly"],
];
const FRAMEWORK_PATTERNS = [
    [/__NEXT_DATA__|_next\/static/i, "Next.js"],
    [/data-reactroot|react-dom/i, "React"],
    [/ng-version=|angular/i, "Angular"],
    [/__NUXT__|_nuxt\//i, "Nuxt.js"],
    [/data-v-app|vue@/i, "Vue.js"],
    [/svelte-/i, "Svelte"],
    [/astro-island/i, "Astro"],
    [/data-remix-run|__remixManifest/i, "Remix"],
    [/gatsby-image|___gatsby/i, "Gatsby"],
    [/data-sveltekit/i, "SvelteKit"],
    [/qwik-city|q:container/i, "Qwik"],
    [/data-solid-hk|solid-js/i, "SolidJS"],
];
const CDN_PATTERNS = [
    [/cdn\.jsdelivr\.net/i, "jsDelivr"],
    [/cdnjs\.cloudflare\.com/i, "cdnjs"],
    [/unpkg\.com/i, "unpkg"],
    [/ajax\.googleapis\.com/i, "Google Hosted Libraries"],
    [/fastly\.net/i, "Fastly"],
    [/akamaized\.net/i, "Akamai"],
];
const DONATION_PATTERNS = [
    [/buymeacoffee\.com/i, "Buy Me a Coffee"],
    [/patreon\.com/i, "Patreon"],
    [/ko-fi\.com/i, "Ko-fi"],
    [/opencollective\.com/i, "Open Collective"],
    [/github\.com\/sponsors/i, "GitHub Sponsors"],
];
const PAYMENT_PATTERNS = [
    [/js\.stripe\.com|checkout\.stripe\.com/i, "Stripe"],
    [/paypal\.com\/sdk|paypalobjects\.com/i, "PayPal"],
    [/js\.paddle\.com/i, "Paddle"],
    [/checkout\.razorpay\.com/i, "Razorpay"],
    [/js\.lemonsqueezy\.com/i, "Lemon Squeezy"],
    [/gumroad\.com/i, "Gumroad"],
];
function matchAll(text, patterns) {
    const found = new Set();
    for (const [re, label] of patterns) {
        if (re.test(text))
            found.add(label);
    }
    return Array.from(found);
}
function extractDeepSignals(html, serverHeaderValue, xRobotsTagValue) {
    const has = (re) => re.test(html);
    const bodyMatch = html.match(/<body[\s\S]*?>([\s\S]*)<\/body>/i);
    const bodyHtml = bodyMatch ? bodyMatch[1] : html;
    /* ── Accessibility ───────────────────────────────────────── */
    const htmlLangMatch = html.match(/<html[^>]+lang\s*=\s*["']([^"']*)["']/i);
    const inputTags = [...bodyHtml.matchAll(/<input\b[^>]*>/gi)].filter((m) => !/type\s*=\s*["'](hidden|submit|button|image)["']/i.test(m[0]));
    const labelForTargets = new Set([...bodyHtml.matchAll(/<label\b[^>]*for\s*=\s*["']([^"']+)["']/gi)].map((m) => m[1]));
    let inputsWithoutLabel = 0;
    for (const input of inputTags) {
        const id = attr(input[0], "id");
        const hasAriaLabel = /aria-label(?:ledby)?\s*=/i.test(input[0]);
        const hasPlaceholderOnly = /placeholder\s*=/i.test(input[0]) && !id && !hasAriaLabel;
        const labeled = (id && labelForTargets.has(id)) || hasAriaLabel;
        if (!labeled)
            inputsWithoutLabel++;
        void hasPlaceholderOnly;
    }
    const buttonTags = [
        ...bodyHtml.matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button>/gi),
    ];
    let buttonsWithoutAccessibleName = 0;
    for (const [, attrs, inner] of buttonTags) {
        const text = inner.replace(/<[^>]+>/g, "").trim();
        const hasAriaLabel = /aria-label\s*=/i.test(attrs);
        if (!text && !hasAriaLabel)
            buttonsWithoutAccessibleName++;
    }
    const linkTags = [...bodyHtml.matchAll(/<a\b([^>]*href[^>]*)>([\s\S]*?)<\/a>/gi)];
    let linksWithoutAccessibleName = 0;
    let genericLinkTextCount = 0;
    const genericLinkWords = /^(click here|here|read more|learn more|more|this link|link|click|more info|details)\.?$/i;
    for (const [, attrs, inner] of linkTags) {
        const text = inner.replace(/<[^>]+>/g, "").trim();
        const hasAriaLabel = /aria-label\s*=/i.test(attrs);
        const hasImgAlt = /<img[^>]+alt\s*=\s*["'][^"']+["']/i.test(inner);
        if (!text && !hasAriaLabel && !hasImgAlt)
            linksWithoutAccessibleName++;
        if (text && !hasAriaLabel && genericLinkWords.test(text))
            genericLinkTextCount++;
    }
    const genericAltWords = /^(image|photo|picture|img|banner|icon|graphic)\.?$/i;
    const imgAltValues = [...html.matchAll(/<img\b[^>]*alt\s*=\s*["']([^"']*)["'][^>]*>/gi)].map((m) => m[1].trim());
    const imagesWithGenericAlt = imgAltValues.filter((v) => v && genericAltWords.test(v)).length;
    const iframeTags = [...html.matchAll(/<iframe\b[^>]*>/gi)];
    const iframesWithoutTitle = iframeTags.filter((m) => !/title\s*=\s*["'][^"']+["']/i.test(m[0])).length;
    const accessibility = {
        htmlLangValue: htmlLangMatch ? htmlLangMatch[1] : null,
        totalFormInputs: inputTags.length,
        inputsWithoutLabel,
        totalButtons: buttonTags.length,
        buttonsWithoutAccessibleName,
        totalLinks: linkTags.length,
        linksWithoutAccessibleName,
        genericLinkTextCount,
        hasSkipLink: /href\s*=\s*["']#(main|content|skip)/i.test(bodyHtml.slice(0, 2000)),
        positiveTabindexCount: [...html.matchAll(/tabindex\s*=\s*["'](\d+)["']/gi)].filter((m) => Number(m[1]) > 0).length,
        ariaHiddenOnBodyOrHtml: /<(html|body)[^>]+aria-hidden\s*=\s*["']true["']/i.test(html),
        imagesWithGenericAlt,
        iframesWithoutTitle,
        suppressesFocusOutlineWithoutReplacement: (() => {
            const styleBlocks = [...html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)].map((m) => m[1]).join("\n");
            const inlineStyleAttrs = [...html.matchAll(/style\s*=\s*"([^"]*)"/gi)].map((m) => m[1]).join("\n");
            const css = styleBlocks + "\n" + inlineStyleAttrs;
            const suppresses = /outline\s*:\s*(none|0)\b/i.test(css);
            if (!suppresses)
                return false;
            const hasReplacement = /:focus(-visible)?\s*\{[^}]*(box-shadow|border|outline)\s*:/i.test(styleBlocks);
            return !hasReplacement;
        })(),
    };
    /* ── Technical stack ─────────────────────────────────────── */
    const generatorMatch = html.match(/<meta[^>]+name=["']generator["'][^>]*content=["']([^"']*)["']/i);
    const generator = generatorMatch ? generatorMatch[1] : null;
    const generatorVersionMatch = generator ? generator.match(/(\d+(?:\.\d+){1,3})/) : null;
    const detectedCMS = matchAll(html, CMS_PATTERNS)[0] || null;
    let detectedCMSVersion = null;
    if (detectedCMS === "WordPress") {
        detectedCMSVersion =
            generatorVersionMatch?.[1] ||
                html.match(/wp-content\/themes\/[^"'?]+\?ver=([\d.]+)/i)?.[1] ||
                null;
    }
    else if (generator && detectedCMS && generator.toLowerCase().includes(detectedCMS.toLowerCase())) {
        detectedCMSVersion = generatorVersionMatch?.[1] || null;
    }
    const detectedFrameworks = matchAll(html, FRAMEWORK_PATTERNS);
    const detectedCssFrameworks = matchAll(html, CSS_FRAMEWORK_PATTERNS);
    const detectedEcommercePlatforms = matchAll(html, ECOMMERCE_PATTERNS);
    const detectedPageBuilders = matchAll(html, PAGE_BUILDER_PATTERNS);
    const detectedAbTestingTools = matchAll(html, AB_TESTING_PATTERNS);
    const detectedCookieConsentTools = matchAll(html, COOKIE_CONSENT_PATTERNS);
    let hostingProvider = null;
    if (serverHeaderValue) {
        for (const [re, label] of HOSTING_HEADER_PATTERNS) {
            if (re.test(serverHeaderValue.trim())) {
                hostingProvider = label;
                break;
            }
        }
    }
    if (!hostingProvider) {
        if (/\.vercel\.app|_vercel\//i.test(html))
            hostingProvider = "Vercel";
        else if (/netlify\.app|__netlify/i.test(html))
            hostingProvider = "Netlify";
        else if (/\.pages\.dev\b/i.test(html))
            hostingProvider = "Cloudflare Pages";
    }
    // Confidence: independent corroborating signals for the primary
    // CMS/framework identification, not just "a regex fired somewhere".
    let corroboratingSignals = 0;
    if (detectedCMS)
        corroboratingSignals++;
    if (generator)
        corroboratingSignals++;
    if (detectedCMSVersion)
        corroboratingSignals++;
    if (detectedFrameworks.length && detectedCMS)
        corroboratingSignals++; // e.g. headless CMS + framework
    const confidence = corroboratingSignals >= 2 ? "high" : corroboratingSignals === 1 ? "medium" : "low";
    const techStack = {
        generator,
        generatorVersion: generatorVersionMatch ? generatorVersionMatch[1] : null,
        detectedCMS,
        detectedCMSVersion,
        detectedFrameworks,
        detectedCssFrameworks,
        detectedEcommercePlatforms,
        detectedPageBuilders,
        detectedAnalytics: matchAll(html, ANALYTICS_PATTERNS),
        detectedTagManagers: matchAll(html, TAG_MANAGER_PATTERNS),
        detectedAbTestingTools,
        detectedCookieConsentTools,
        jqueryDetected: /jquery(?:[.-]\d[\w.]*)?\.js/i.test(html) || /jQuery\s*\(/i.test(html),
        detectedCDNs: matchAll(html, CDN_PATTERNS),
        hostingProvider,
        confidence,
    };
    /* ── HTML structure ──────────────────────────────────────── */
    const idValues = [...html.matchAll(/\bid\s*=\s*["']([^"']+)["']/gi)].map((m) => m[1]);
    const idCounts = new Map();
    for (const id of idValues)
        idCounts.set(id, (idCounts.get(id) || 0) + 1);
    const duplicateIdCount = Array.from(idCounts.values()).filter((c) => c > 1).length;
    const divCount = (bodyHtml.match(/<div\b/gi) || []).length;
    const totalElementCount = (bodyHtml.match(/<[a-z][a-z0-9]*\b/gi) || []).length || 1;
    const semanticTags = ["header", "nav", "main", "footer", "article", "section", "aside", "figure"];
    const semanticTagCount = semanticTags.reduce((sum, tag) => sum + (bodyHtml.match(new RegExp(`<${tag}\\b`, "gi")) || []).length, 0);
    const deprecatedTags = ["center", "font", "marquee", "blink", "big", "strike", "acronym"];
    const deprecatedTagsUsed = deprecatedTags.filter((tag) => new RegExp(`<${tag}\\b`, "i").test(bodyHtml));
    const duplicateTitleTagCount = Math.max(0, (html.match(/<title\b[^>]*>/gi) || []).length - 1);
    const duplicateCanonicalTagCount = Math.max(0, [...html.matchAll(/<link\b[^>]*rel\s*=\s*["']canonical["'][^>]*>/gi)].length - 1);
    const htmlStructure = {
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
        duplicateTitleTagCount,
        duplicateCanonicalTagCount,
    };
    /* ── Third-party scripts ─────────────────────────────────── */
    const scriptSrcs = [...html.matchAll(/<script\b[^>]*\bsrc\s*=\s*["']([^"']+)["'][^>]*>/gi)].map((m) => m[1]);
    const externalScriptDomains = Array.from(new Set(scriptSrcs
        .filter((src) => /^https?:\/\//i.test(src) || src.startsWith("//"))
        .map((src) => {
        try {
            return new URL(src.startsWith("//") ? "https:" + src : src).hostname;
        }
        catch {
            return null;
        }
    })
        .filter((h) => !!h)));
    const thirdPartyScripts = {
        externalScriptDomains,
        analyticsScripts: matchAll(html, ANALYTICS_PATTERNS),
        adScripts: matchAll(html, AD_NETWORK_PATTERNS),
        chatWidgetScripts: matchAll(html, CHAT_WIDGET_PATTERNS),
        fontScripts: matchAll(html, FONT_PATTERNS),
        tagManagerScripts: matchAll(html, TAG_MANAGER_PATTERNS),
        otherThirdPartyScripts: externalScriptDomains.filter((d) => !ANALYTICS_PATTERNS.some(([re]) => re.test(d)) &&
            !AD_NETWORK_PATTERNS.some(([re]) => re.test(d)) &&
            !CHAT_WIDGET_PATTERNS.some(([re]) => re.test(d)) &&
            !FONT_PATTERNS.some(([re]) => re.test(d)) &&
            !TAG_MANAGER_PATTERNS.some(([re]) => re.test(d)) &&
            !CDN_PATTERNS.some(([re]) => re.test(d))),
        totalExternalScripts: externalScriptDomains.length,
    };
    /* ── Social metadata ─────────────────────────────────────── */
    const metaProp = (prop) => {
        const m = html.match(new RegExp(`<meta[^>]+property=["']${prop}["'][^>]*content=["']([^"']*)["']`, "i"));
        return m ? m[1] : null;
    };
    const metaName = (name) => {
        const m = html.match(new RegExp(`<meta[^>]+name=["']${name}["'][^>]*content=["']([^"']*)["']`, "i"));
        return m ? m[1] : null;
    };
    const socialMeta = {
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
    const affiliateLinkCount = anchorHrefs.filter((h) => /[?&](tag|ref|affiliate|aff_id|utm_source=affiliate)=/i.test(h) || /amzn\.to|shareasale|cj\.com|impact\.com|partnerize/i.test(h)).length;
    const monetization = {
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
    const types = [];
    let parseErrorCount = 0;
    const missingRequiredFieldsByType = {};
    const REQUIRED_FIELDS = {
        Organization: ["name", "url"],
        Product: ["name", "image"],
        Article: ["headline", "author"],
        BreadcrumbList: ["itemListElement"],
        FAQPage: ["mainEntity"],
        LocalBusiness: ["name", "address"],
        WebSite: ["name", "url"],
        Review: ["author", "reviewRating"],
    };
    function walkNode(node) {
        if (!node || typeof node !== "object")
            return;
        const obj = node;
        const rawType = obj["@type"];
        const typeList = Array.isArray(rawType) ? rawType : rawType ? [rawType] : [];
        for (const t of typeList) {
            if (typeof t !== "string")
                continue;
            types.push(t);
            const required = REQUIRED_FIELDS[t];
            if (required) {
                const missing = required.filter((f) => !(f in obj));
                if (missing.length > 0)
                    missingRequiredFieldsByType[t] = missing;
            }
        }
        if (Array.isArray(obj["@graph"])) {
            for (const child of obj["@graph"])
                walkNode(child);
        }
    }
    for (const [, raw] of ldBlocks) {
        try {
            const parsed = JSON.parse(raw.trim());
            if (Array.isArray(parsed))
                parsed.forEach(walkNode);
            else
                walkNode(parsed);
        }
        catch {
            parseErrorCount++;
        }
    }
    const rawLdText = ldBlocks.map(([, raw]) => raw).join("\n");
    const structuredData = {
        blockCount: ldBlocks.length,
        parseErrorCount,
        types: Array.from(new Set(types)),
        hasOrganization: types.includes("Organization"),
        hasBreadcrumb: types.includes("BreadcrumbList"),
        hasProduct: types.includes("Product"),
        hasArticle: types.includes("Article") || types.includes("NewsArticle") || types.includes("BlogPosting"),
        hasFaqPage: types.includes("FAQPage"),
        hasHowTo: types.includes("HowTo"),
        hasSpeakable: /"speakable"\s*:/.test(rawLdText),
        hasLocalBusiness: types.includes("LocalBusiness"),
        hasWebSite: types.includes("WebSite"),
        hasReview: types.includes("Review") || types.includes("AggregateRating"),
        missingRequiredFieldsByType,
    };
    /* ── Answer readiness (AEO) ───────────────────────────────── */
    const stripTags = (s) => s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    const h2h3Texts = [...bodyHtml.matchAll(/<(h2|h3)\b[^>]*>([\s\S]*?)<\/\1>/gi)].map((m) => stripTags(m[2]));
    const questionHeadings = h2h3Texts.filter((t) => t.endsWith("?") && t.length > 5);
    let hasDirectAnswerLead = false;
    const firstHeadingMatch = bodyHtml.match(/<h[12]\b[^>]*>[\s\S]*?<\/h[12]>/i);
    if (firstHeadingMatch) {
        const afterHeading = bodyHtml.slice(bodyHtml.indexOf(firstHeadingMatch[0]) + firstHeadingMatch[0].length);
        const nextParagraph = afterHeading.match(/^\s*(?:<(?!h[1-6]\b)[^>]+>\s*)*?<p\b[^>]*>([\s\S]*?)<\/p>/i);
        if (nextParagraph) {
            const leadLength = stripTags(nextParagraph[1]).length;
            hasDirectAnswerLead = leadLength >= 40 && leadLength <= 320;
        }
    }
    const answerReadiness = {
        questionHeadingCount: questionHeadings.length,
        questionHeadingSamples: questionHeadings.slice(0, 3),
        hasDirectAnswerLead,
    };
    /* ── Images ───────────────────────────────────────────────── */
    const imgTags = [...html.matchAll(/<img\b[^>]*>/gi)].map((m) => m[0]);
    const missingDimensions = imgTags.filter((t) => !/\bwidth\s*=/i.test(t) || !/\bheight\s*=/i.test(t)).length;
    const modernFormatCount = imgTags.filter((t) => /\.(webp|avif)(\?|["'])/i.test(t)).length;
    const legacyFormatCount = imgTags.filter((t) => /\.(jpe?g|png|gif|bmp)(\?|["'])/i.test(t)).length;
    const lazyLoadedCount = imgTags.filter((t) => /loading\s*=\s*["']lazy["']/i.test(t)).length;
    const srcsetUsageCount = imgTags.filter((t) => /\bsrcset\s*=/i.test(t)).length;
    const dataUriCount = imgTags.filter((t) => /src\s*=\s*["']data:image/i.test(t)).length;
    const images = {
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
    const responsiveClassHintCount = (html.match(/class\s*=\s*["'][^"']*\b(?:sm|md|lg|xl|2xl):[a-z-]|class\s*=\s*["'][^"']*\b(?:col-(?:sm|md|lg|xl)-\d|is-mobile|is-tablet|is-desktop)\b/gi) || []).length;
    const touchIconSizes = [...html.matchAll(/<link[^>]+rel=["']apple-touch-icon["'][^>]*sizes=["']([^"']+)["']/gi)].map((m) => m[1]);
    const mobile = {
        viewportContent,
        viewportHasWidthDevice: !!viewportContent && /width\s*=\s*device-width/i.test(viewportContent),
        viewportAllowsUserScaling: !viewportContent || !/user-scalable\s*=\s*no|maximum-scale\s*=\s*1(?:\.0)?\b/i.test(viewportContent),
        mediaQueryCount,
        responsiveClassHintCount,
        appleTouchIconCount: (html.match(/<link[^>]+rel=["']apple-touch-icon["']/gi) || []).length,
        hasMaskIcon: /<link[^>]+rel=["']mask-icon["']/i.test(html),
        touchIconSizes,
    };
    /* ── AI-generated / "vibe-coded" pattern signals ─────────────────
       Heuristic, contextual signals only — never automatic failures.
       Judged in combination and severity by the calling module. ── */
    const styleBlocks = inlineStyleBlocks;
    const BUZZWORDS = [
        "revolutionize", "supercharge", "next-gen", "next gen", "game-changer",
        "game changer", "unlock your potential", "cutting-edge", "seamlessly",
        "unleash", "elevate your", "empower your", "transform your business",
        "state-of-the-art", "world-class", "best-in-class",
    ];
    const lowerHtml = html.toLowerCase();
    const buzzwordsFound = BUZZWORDS.filter((b) => lowerHtml.includes(b));
    const headingAndButtonText = [
        ...bodyHtml.matchAll(/<(h1|h2|h3|button)\b[^>]*>([\s\S]*?)<\/\1>/gi),
    ].map((m) => m[2]);
    const emojiRe = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu;
    const emojiInHeadingOrButtonCount = headingAndButtonText.reduce((sum, t) => sum + (t.match(emojiRe) || []).length, 0);
    const gradientDeclarationCount = (styleBlocks.match(/linear-gradient|radial-gradient|conic-gradient/gi) || []).length;
    const purpleBlueGradientHints = (styleBlocks.match(/linear-gradient\([^)]*(?:purple|violet|indigo|#7[0-9a-f]{5}|#8[0-9a-f]{5}|#9[0-9a-f]{5})[^)]*(?:blue|cyan|#[0-3][0-9a-f]{5}|#4[0-9a-f]{5})[^)]*\)/gi) || []).length;
    const gradientTextHints = (styleBlocks.match(/background-clip\s*:\s*text|-webkit-background-clip\s*:\s*text/gi) || []).length;
    const glassmorphismHints = (styleBlocks.match(/backdrop-filter\s*:\s*blur/gi) || []).length;
    const grainyTextureHints = (lowerHtml.match(/noise\.png|grain\.png|texture-overlay|feturbulence/gi) || []).length;
    const largeRadiusHints = [...styleBlocks.matchAll(/border-radius\s*:\s*(\d+(?:\.\d+)?)px/gi)].filter((m) => Number(m[1]) >= 20 && Number(m[1]) <= 32).length;
    const scrollFadeInAnimationHints = (lowerHtml.match(/data-aos=|intersectionobserver|animate-on-scroll|scroll-reveal/gi) || []).length;
    const cursorGlowOrParticleHints = (lowerHtml.match(/mousemove.*glow|cursor-glow|particle(?:s)?\.js|tsparticles/gi) || []).length;
    const hoverOpacityFadeHints = (styleBlocks.match(/:hover\s*\{[^}]*opacity\s*:\s*0?\.[0-9]+/gi) || []).length;
    const pillBadgeAboveHeadingHints = [...bodyHtml.matchAll(/<(?:span|div)\b[^>]*class\s*=\s*["'][^"']*(?:rounded-full|pill|badge)[^"']*["'][^>]*>[\s\S]{0,80}?<\/(?:span|div)>\s*(?:<[^>]+>\s*)*<h1\b/gi) || []].length;
    const genericIconRowHints = [...bodyHtml.matchAll(/(?:<(?:svg|i)\b[^>]*>[\s\S]{0,200}?<\/(?:svg|i)>\s*){3,}/gi) || []].length;
    const fontFamilies = new Set([...styleBlocks.matchAll(/font-family\s*:\s*([^;]+);/gi)].map((m) => m[1].split(",")[0].replace(/["']/g, "").trim().toLowerCase()));
    const distinctFontFamilyCount = fontFamilies.size;
    const interFontOnlyHint = fontFamilies.size === 1 && fontFamilies.has("inter");
    const spaceGroteskInstrumentSerifPairHint = fontFamilies.has("space grotesk") && fontFamilies.has("instrument serif");
    const emDashCount = (html.match(/—/g) || []).length;
    const loremIpsumHint = /lorem ipsum/i.test(html);
    const vibeCoded = {
        purpleBlueGradientHints,
        gradientDeclarationCount,
        gradientTextHints,
        glassmorphismHints,
        emojiInHeadingOrButtonCount,
        pillBadgeAboveHeadingHints,
        genericIconRowHints,
        scrollFadeInAnimationHints,
        cursorGlowOrParticleHints,
        hoverOpacityFadeHints,
        grainyTextureHints,
        largeRadiusHints,
        interFontOnlyHint,
        spaceGroteskInstrumentSerifPairHint,
        emDashCount,
        buzzwordCount: buzzwordsFound.length,
        buzzwordsFound,
        loremIpsumHint,
        distinctFontFamilyCount,
        totalSignalCount: (purpleBlueGradientHints > 0 ? 1 : 0) +
            (gradientTextHints > 0 ? 1 : 0) +
            (glassmorphismHints > 0 ? 1 : 0) +
            (emojiInHeadingOrButtonCount > 0 ? 1 : 0) +
            (pillBadgeAboveHeadingHints > 0 ? 1 : 0) +
            (genericIconRowHints > 0 ? 1 : 0) +
            (scrollFadeInAnimationHints > 0 ? 1 : 0) +
            (cursorGlowOrParticleHints > 0 ? 1 : 0) +
            (hoverOpacityFadeHints > 0 ? 1 : 0) +
            (grainyTextureHints > 0 ? 1 : 0) +
            (largeRadiusHints > 0 ? 1 : 0) +
            (interFontOnlyHint ? 1 : 0) +
            (spaceGroteskInstrumentSerifPairHint ? 1 : 0) +
            (emDashCount >= 3 ? 1 : 0) +
            (buzzwordsFound.length > 0 ? 1 : 0) +
            (loremIpsumHint ? 1 : 0),
    };
    /* ── Subresource Integrity (SRI) on cross-origin assets ─────────── */
    const scriptTagsForSri = [...html.matchAll(/<script\b[^>]*\bsrc\s*=\s*["']([^"']+)["'][^>]*>/gi)];
    const crossOriginScriptTags = scriptTagsForSri.filter((m) => /^https?:\/\//i.test(m[1]) || m[1].startsWith("//"));
    const crossOriginScriptsMissingIntegrity = crossOriginScriptTags.filter((m) => !/\bintegrity\s*=\s*["']/i.test(m[0])).length;
    const linkTagsForSri = [...html.matchAll(/<link\b[^>]*\brel\s*=\s*["']stylesheet["'][^>]*>/gi)];
    const crossOriginStylesheetTags = linkTagsForSri.filter((m) => /href\s*=\s*["'](https?:)?\/\//i.test(m[0]));
    const crossOriginStylesheetsMissingIntegrity = crossOriginStylesheetTags.filter((m) => !/\bintegrity\s*=\s*["']/i.test(m[0])).length;
    const sri = {
        crossOriginScriptCount: crossOriginScriptTags.length,
        crossOriginScriptsMissingIntegrity,
        crossOriginStylesheetCount: crossOriginStylesheetTags.length,
        crossOriginStylesheetsMissingIntegrity,
    };
    /* ── target="_blank" tabnabbing risk ─────────────────────────────
     * A link that opens in a new tab without rel="noopener" (or
     * "noreferrer", which implies it) gives the opened page a live
     * `window.opener` reference back to the original tab — a known
     * phishing/tabnabbing vector. Purely an HTML-level check, no new
     * network request needed. */
    const blankTargetLinks = [...html.matchAll(/<a\b[^>]*\btarget\s*=\s*["']_blank["'][^>]*>/gi)];
    const blankTargetMissingNoopener = blankTargetLinks.filter((m) => !/\brel\s*=\s*["'][^"']*\b(noopener|noreferrer)\b/i.test(m[0])).length;
    /* ── AI-training opt-out & header-level indexing block ───────────
     * Two things a check that only reads the visible page would miss:
     * (1) an X-Robots-Tag HTTP header can block indexing even when the
     * HTML <meta name="robots"> looks fine — sites sometimes set one and
     * forget the other; (2) "noai"/"noimageai" is an emerging opt-out
     * signal (used by some AI-training crawlers) distinct from classic
     * noindex — worth surfacing since it's part of the same "what can
     * crawl this site" question as the GEO module. */
    const metaRobotsMatch = html.match(/<meta[^>]+name\s*=\s*["']robots["'][^>]*content\s*=\s*["']([^"']*)["'][^>]*>/i);
    const metaRobotsContent = (metaRobotsMatch ? metaRobotsMatch[1] : "").toLowerCase();
    const xRobotsTagLower = (xRobotsTagValue || "").toLowerCase();
    const linkSafety = {
        blankTargetLinkCount: blankTargetLinks.length,
        blankTargetMissingNoopener,
        xRobotsTagValue: xRobotsTagValue || null,
        xRobotsTagBlocksIndexing: /\b(noindex)\b/.test(xRobotsTagLower),
        metaRobotsVsHeaderConflict: /\b(noindex)\b/.test(xRobotsTagLower) !== /\b(noindex)\b/.test(metaRobotsContent) &&
            (xRobotsTagLower.length > 0 || metaRobotsContent.length > 0),
        aiTrainingOptOut: /\b(noai|noimageai)\b/.test(metaRobotsContent) || /\b(noai|noimageai)\b/.test(xRobotsTagLower),
    };
    /* ── CSP-relevant origins, bucketed by resource type ─────────── */
    const originOf = (url) => {
        try {
            const abs = url.startsWith("//") ? "https:" + url : url;
            if (!/^https?:\/\//i.test(abs))
                return null;
            return new URL(abs).origin;
        }
        catch {
            return null;
        }
    };
    const collectOrigins = (re) => {
        const set = new Set();
        for (const m of html.matchAll(re)) {
            const o = originOf(m[1]);
            if (o)
                set.add(o);
        }
        return Array.from(set);
    };
    const FONT_HOSTS = /fonts\.gstatic\.com|use\.typekit\.net|fonts\.cdnfonts\.com/i;
    const rawScriptOrigins = collectOrigins(/<script\b[^>]*\bsrc\s*=\s*["']([^"']+)["']/gi);
    const rawStyleOrigins = collectOrigins(/<link\b[^>]*\brel\s*=\s*["']stylesheet["'][^>]*\bhref\s*=\s*["']([^"']+)["']/gi);
    const imageOrigins = collectOrigins(/<img\b[^>]*\bsrc\s*=\s*["']([^"']+)["']/gi);
    const frameOrigins = collectOrigins(/<iframe\b[^>]*\bsrc\s*=\s*["']([^"']+)["']/gi);
    const preconnectOrigins = collectOrigins(/<link\b[^>]*\brel\s*=\s*["']preconnect["'][^>]*\bhref\s*=\s*["']([^"']+)["']/gi);
    const fontOrigins = Array.from(new Set([...rawStyleOrigins.filter((o) => FONT_HOSTS.test(o)), ...preconnectOrigins.filter((o) => FONT_HOSTS.test(o))]));
    const styleOrigins = rawStyleOrigins.filter((o) => !FONT_HOSTS.test(o));
    // connect-src can't be fully derived from static HTML (XHR/fetch calls are
    // invisible pre-execution) — best-effort from known analytics/beacon
    // script origins, which is a defensible floor rather than a guess.
    const connectOrigins = rawScriptOrigins.filter((o) => /google-analytics\.com|analytics\.google\.com|googletagmanager\.com|segment\.(io|com)|sentry\.io|mixpanel\.com|amplitude\.com/i.test(o));
    const cspOrigins = {
        scriptOrigins: rawScriptOrigins,
        styleOrigins,
        imageOrigins,
        frameOrigins,
        fontOrigins,
        connectOrigins,
    };
    return {
        accessibility,
        techStack,
        htmlStructure,
        thirdPartyScripts,
        socialMeta,
        monetization,
        structuredData,
        answerReadiness,
        images,
        mobile,
        vibeCoded,
        sri,
        cspOrigins,
        linkSafety,
    };
}
