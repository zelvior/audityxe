import { AuditResult, CategoryKey, CategoryScore, FixItem } from "./types";

const CATEGORY_META: { key: CategoryKey; label: string }[] = [
  { key: "messaging", label: "Messaging & Copy Clarity" },
  { key: "uiux", label: "UI/UX & Visual Hierarchy" },
  { key: "cro", label: "Conversion Rate Optimization" },
  { key: "seo", label: "Technical & Metadata Health" },
  { key: "brand", label: "Brand Distinctiveness" },
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
    return u;
  }
}

function clamp(n: number, min = 0, max = 10): number {
  return Math.max(min, Math.min(max, n));
}

interface Signals {
  title: string;
  metaDescription: string;
  h1Count: number;
  h1Text: string;
  imgTotal: number;
  imgMissingAlt: number;
  wordCount: number;
  hasViewport: boolean;
  hasCanonical: boolean;
  hasOgImage: boolean;
  hasOgTitle: boolean;
  hasFavicon: boolean;
  hasThemeColor: boolean;
  formCount: number;
  inputCount: number;
  ctaButtonCount: number;
  linkCount: number;
  isHttps: boolean;
  htmlLangSet: boolean;
  scriptCount: number;
  inlineStyleCount: number;
}

function extractSignals(html: string, finalUrl: string): Signals {
  const get = (re: RegExp) => {
    const m = html.match(re);
    return m ? m[1].trim() : "";
  };
  const titleTag = get(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const metaDescription = get(
    /<meta[^>]+name=["']description["'][^>]*content=["']([^"']*)["']/i
  );
  const h1Matches = [...html.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/gi)];
  const imgTags = [...html.matchAll(/<img\b[^>]*>/gi)];
  const imgMissingAlt = imgTags.filter(
    (m) => !/alt\s*=\s*["'][^"']*["']/i.test(m[0]) || /alt\s*=\s*["']\s*["']/i.test(m[0])
  ).length;

  const bodyMatch = html.match(/<body[\s\S]*?>([\s\S]*)<\/body>/i);
  const bodyHtml = bodyMatch ? bodyMatch[1] : html;
  const text = bodyHtml
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;|&amp;|&#\d+;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const wordCount = text ? text.split(" ").length : 0;

  const buttonWords = /(get started|sign up|try (it )?free|book a demo|contact sales|buy now|start free|subscribe|join now|learn more)/gi;
  const ctaButtonCount =
    (bodyHtml.match(/<button\b[^>]*>[\s\S]*?<\/button>/gi) || []).length +
    (bodyHtml.match(buttonWords) || []).length;

  return {
    title: titleTag,
    metaDescription,
    h1Count: h1Matches.length,
    h1Text: h1Matches[0] ? h1Matches[0][1].replace(/<[^>]+>/g, " ").trim() : "",
    imgTotal: imgTags.length,
    imgMissingAlt,
    wordCount,
    hasViewport: /<meta[^>]+name=["']viewport["']/i.test(html),
    hasCanonical: /<link[^>]+rel=["']canonical["']/i.test(html),
    hasOgImage: /<meta[^>]+property=["']og:image["']/i.test(html),
    hasOgTitle: /<meta[^>]+property=["']og:title["']/i.test(html),
    hasFavicon: /<link[^>]+rel=["'](?:shortcut )?icon["']/i.test(html),
    hasThemeColor: /<meta[^>]+name=["']theme-color["']/i.test(html),
    formCount: (html.match(/<form\b/gi) || []).length,
    inputCount: (html.match(/<input\b/gi) || []).length,
    ctaButtonCount,
    linkCount: (html.match(/<a\b[^>]*href=/gi) || []).length,
    isHttps: finalUrl.startsWith("https://"),
    htmlLangSet: /<html[^>]+lang=["'][a-z-]+["']/i.test(html),
    scriptCount: (html.match(/<script\b/gi) || []).length,
    inlineStyleCount: (html.match(/style\s*=\s*["']/gi) || []).length,
  };
}

function scoreFromSignals(s: Signals): CategoryScore[] {
  // Messaging & Copy Clarity
  let messaging = 5;
  if (s.title.length >= 15 && s.title.length <= 65) messaging += 1.5;
  else if (s.title.length > 0) messaging += 0.3;
  else messaging -= 2;
  if (s.h1Text.length >= 15) messaging += 1;
  if (s.wordCount >= 150 && s.wordCount <= 1200) messaging += 1.5;
  else if (s.wordCount > 0) messaging += 0.3;
  if (s.metaDescription.length >= 50 && s.metaDescription.length <= 160) messaging += 1;
  messaging = clamp(messaging);

  // UI/UX & Visual Hierarchy
  let uiux = 5;
  if (s.h1Count === 1) uiux += 1.5;
  else if (s.h1Count === 0) uiux -= 2;
  else uiux -= 1;
  if (s.hasViewport) uiux += 1.5;
  else uiux -= 2;
  const altRatio = s.imgTotal > 0 ? 1 - s.imgMissingAlt / s.imgTotal : 1;
  uiux += altRatio * 2;
  uiux = clamp(uiux);

  // Conversion Rate Optimization
  let cro = 4;
  if (s.ctaButtonCount >= 1) cro += 2;
  if (s.ctaButtonCount >= 3) cro += 1;
  if (s.formCount >= 1) cro += 1.5;
  if (s.inputCount > 0 && s.inputCount <= 5) cro += 1;
  else if (s.inputCount > 5) cro += 0.2;
  cro = clamp(cro);

  // Technical & Metadata Health
  let seo = 4;
  if (s.metaDescription) seo += 1.5;
  else seo -= 1;
  if (s.hasCanonical) seo += 1;
  if (s.isHttps) seo += 1;
  else seo -= 2;
  if (s.htmlLangSet) seo += 0.5;
  if (s.hasOgTitle) seo += 1;
  if (s.title) seo += 1;
  else seo -= 1;
  seo = clamp(seo);

  // Brand Distinctiveness
  let brand = 5;
  if (s.hasFavicon) brand += 1.2;
  if (s.hasOgImage) brand += 1.5;
  if (s.hasThemeColor) brand += 1;
  if (s.title && s.h1Text && s.title.toLowerCase().includes(s.h1Text.toLowerCase().split(" ")[0] || "~~")) brand += 0.8;
  brand = clamp(brand);

  return [
    { key: "messaging", label: CATEGORY_META[0].label, score: Math.round(messaging * 10) / 10 },
    { key: "uiux", label: CATEGORY_META[1].label, score: Math.round(uiux * 10) / 10 },
    { key: "cro", label: CATEGORY_META[2].label, score: Math.round(cro * 10) / 10 },
    { key: "seo", label: CATEGORY_META[3].label, score: Math.round(seo * 10) / 10 },
    { key: "brand", label: CATEGORY_META[4].label, score: Math.round(brand * 10) / 10 },
  ];
}

function buildFixes(s: Signals, categories: CategoryScore[]): FixItem[] {
  const candidates: FixItem[] = [];

  if (!s.title || s.title.length < 15 || s.title.length > 65) {
    candidates.push({
      id: "title",
      category: "Messaging & Copy Clarity",
      target: "<title> tag",
      problem: {
        constructive: s.title
          ? `The <title> tag is ${s.title.length} characters, outside the ideal 15–65 range for clarity and SEO.`
          : "There is no <title> tag on the page.",
        brutal: s.title
          ? `Your title tag is ${s.title.length} characters. Either you're padding it or you gave up halfway through.`
          : "You shipped a page with no <title> tag. That's the first thing anyone sees in a browser tab, and it's blank.",
      },
      fix: "Write a specific, benefit-led title between 15 and 65 characters.",
      snippet: `<title>\n-  ${s.title || "(missing)"}\n+  ${hostOf("").length ? "" : ""}Your Product — the outcome your customer actually wants\n</title>`,
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

  if (s.imgTotal > 0 && s.imgMissingAlt > 0) {
    candidates.push({
      id: "alt",
      category: "UI/UX & Visual Hierarchy",
      target: "<img> alt attributes",
      problem: {
        constructive: `${s.imgMissingAlt} of ${s.imgTotal} images are missing descriptive alt text.`,
        brutal: `${s.imgMissingAlt} of your ${s.imgTotal} images are invisible to screen readers and search crawlers. That's two audiences ignored at once.`,
      },
      fix: "Add descriptive alt text to every content image; use alt=\"\" only for purely decorative images.",
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

  if (s.ctaButtonCount === 0) {
    candidates.push({
      id: "cta",
      category: "Conversion Rate Optimization",
      target: "Primary call-to-action",
      problem: {
        constructive: "No clear call-to-action button or conversion-oriented link text was detected on the page.",
        brutal: "I read your whole page and I still don't know what you want me to do next. There's no CTA.",
      },
      fix: "Add one clear, high-contrast primary action above the fold (e.g. \"Get started\").",
      snippet: `<section class="hero">\n+  <button class="btn-primary">Get started free</button>\n</section>`,
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

  const lowestCats = [...categories].sort((a, b) => a.score - b.score).map((c) => c.label);
  const ranked = candidates.sort(
    (a, b) => lowestCats.indexOf(a.category) - lowestCats.indexOf(b.category)
  );
  return ranked.slice(0, 4);
}

import { generateJsonForTask } from "./gemini";

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
  )}/10 and these category scores: ${categories
    .map((c) => `${c.label}: ${c.score.toFixed(1)}`)
    .join(", ")}.

Return ONLY valid JSON (no markdown fences) matching this exact shape:
{
  "verdictConstructive": "one encouraging but honest sentence verdict",
  "verdictBrutal": "one savage but fair roast-style sentence verdict"
}`;

  const result = await generateJsonForTask<VerdictCopy>("VERDICT", prompt, { temperature: 0.8 });
  if (
    result &&
    typeof result.verdictConstructive === "string" &&
    typeof result.verdictBrutal === "string"
  ) {
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
  )}/10 and these category scores: ${categories
    .map((c) => `${c.label}: ${c.score.toFixed(1)}`)
    .join(", ")}.

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

function verdictFor(overall: number, host: string) {
  if (overall >= 8) {
    return {
      constructive: `${host} is in strong shape — a few targeted fixes away from best-in-class.`,
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

async function fetchHtml(rawUrl: string): Promise<{ html: string; finalUrl: string }> {
  const url = normalizeUrl(rawUrl);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    const res = await fetch(url, {
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; AudityxeBot/1.0; +https://audityxe.app)",
        Accept: "text/html,application/xhtml+xml",
      },
    });
    if (!res.ok) {
      throw new Error(`Site responded with status ${res.status}`);
    }
    const html = await res.text();
    return { html, finalUrl: res.url || url };
  } finally {
    clearTimeout(timeout);
  }
}

async function auditOne(rawUrl: string) {
  const { html, finalUrl } = await fetchHtml(rawUrl);
  const signals = extractSignals(html, finalUrl);
  const categories = scoreFromSignals(signals);
  const overall =
    Math.round((categories.reduce((sum, c) => sum + c.score, 0) / categories.length) * 10) / 10;
  const host = hostOf(finalUrl);
  return { host, overall, categories, signals };
}

export async function runAudit(rawUrl: string, competitorRawUrl?: string): Promise<AuditResult> {
  const primary = await auditOne(rawUrl);
  const fixes = buildFixes(primary.signals, primary.categories);

  const [verdictCopy, promoCopy] = await Promise.all([
    generateVerdictWithGemini(primary.host, primary.overall, primary.categories),
    generatePromoWithGemini(primary.host, primary.overall, primary.categories),
  ]);

  const verdict = verdictCopy
    ? { constructive: verdictCopy.verdictConstructive, brutal: verdictCopy.verdictBrutal }
    : verdictFor(primary.overall, primary.host);
  const { xPost, linkedinPost } = promoCopy
    ? { xPost: promoCopy.xPost, linkedinPost: promoCopy.linkedinPost }
    : buildPromo(primary.host, primary.overall);

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
      // competitor fetch failed silently; primary audit still returned
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
    competitor,
  };
}
