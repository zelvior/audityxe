/**
 * Multi-page crawl, internal link graph, and a JS-rendering heuristic.
 *
 * This is intentionally NOT a headless-browser crawl (no Puppeteer/
 * Playwright here — same reasoning as pagespeed.ts: a bundled Chromium
 * in a serverless function is fragile and slow to cold-start). It's a
 * bounded, same-origin, plain-fetch BFS crawl of a handful of pages
 * beyond the homepage, used to build an internal link graph and extend
 * a few checks (broken links, thin content, orphan pages) past the
 * single page the rest of the audit is scoped to. Failure is always
 * soft: if crawling errors out entirely, `crawled: false` is returned
 * and the caller treats this as an enhancement layer, never a hard
 * dependency, exactly like pageSpeed.
 */

import { assertSafeUrl } from "./url-safety";
import { probe } from "./network-checks";

const CRAWL_TIMEOUT_MS = 6000;
const MAX_PAGES = 6; // homepage + up to 5 more
const MAX_LINKS_SAMPLED_PER_PAGE = 40;
const UA = "Mozilla/5.0 (compatible; AudityxeBot/1.0; +https://audityxe.vercel.app)";

export interface CrawledPage {
  url: string;
  status: number;
  ok: boolean;
  title: string | null;
  wordCount: number;
  internalLinkCount: number;
  /** Heuristic signal that a meaningful share of this page's real
   * content may only exist after client-side JS runs — e.g. a near-
   * empty SPA root div paired with heavy script weight. A static fetch
   * (this crawl, and the rest of the audit) cannot see that content, so
   * this is surfaced as a caveat rather than silently under-reporting
   * word count / SEO text as if it were the whole page. */
  possibleJsRenderedContent: boolean;
  jsRenderReasons: string[];
}

export interface LinkGraphNode {
  url: string;
  inDegree: number;
  outDegree: number;
  /** Reachable from the homepage by following links, but not linked FROM
   * any other crawled page — a common orphan-page symptom, though with
   * only a handful of pages crawled this is a sample, not a full-site
   * guarantee. */
  isOrphanCandidate: boolean;
}

export interface SiteCrawlResult {
  crawled: boolean;
  error: string | null;
  pagesCrawled: number;
  pagesRequested: number;
  pages: CrawledPage[];
  brokenInternalLinks: { from: string; to: string; status: number }[];
  linkGraph: LinkGraphNode[];
  /** Internal links found on the homepage but never fetched (crawl depth
   * capped at MAX_PAGES) — reported so "we only checked N pages" is
   * explicit, not silently implied. */
  uncrawledInternalLinkCount: number;
}

function resolveInternal(href: string, base: string, origin: string): string | null {
  if (!href || href.startsWith("#") || /^(mailto:|tel:|javascript:)/i.test(href)) return null;
  try {
    const u = new URL(href, base);
    u.hash = "";
    if (u.origin !== origin) return null;
    return u.toString();
  } catch {
    return null;
  }
}

function extractInternalLinks(html: string, pageUrl: string, origin: string): string[] {
  const hrefs = [...html.matchAll(/<a\b[^>]*href\s*=\s*["']([^"']+)["']/gi)].map((m) => m[1]);
  const resolved = hrefs.map((h) => resolveInternal(h, pageUrl, origin)).filter((u): u is string => !!u);
  return Array.from(new Set(resolved));
}

function detectJsRenderedContent(html: string): { flag: boolean; reasons: string[] } {
  const reasons: string[] = [];

  const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  const bodyHtml = bodyMatch ? bodyMatch[1] : html;
  const visibleText = bodyHtml
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const scriptCount = (html.match(/<script\b/gi) || []).length;
  const scriptBytes = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].reduce((sum, m) => sum + m[1].length, 0);

  // A common SPA-shell fingerprint: a near-empty mount point the
  // framework hydrates client-side (#root, #app, #__next, etc.) with
  // little else in the static body.
  const hasEmptyMountPoint = /<div\b[^>]*\bid\s*=\s*["'](root|app|__next|___gatsby)["'][^>]*>\s*<\/div>/i.test(bodyHtml);

  if (hasEmptyMountPoint) reasons.push("an empty SPA mount point (#root/#app/#__next) was found in the static HTML");
  if (visibleText.length < 200 && scriptBytes > 20_000) {
    reasons.push(`only ${visibleText.length} characters of visible text alongside ~${Math.round(scriptBytes / 1024)}KB of inline script`);
  }
  if (scriptCount >= 8 && visibleText.length < 500) {
    reasons.push(`${scriptCount} <script> tags but under 500 characters of static visible text`);
  }

  return { flag: reasons.length > 0, reasons };
}

async function fetchPage(url: string): Promise<{ html: string; status: number; ok: boolean } | null> {
  try {
    await assertSafeUrl(url);
  } catch {
    return null;
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CRAWL_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      redirect: "follow",
      signal: controller.signal,
      headers: { "User-Agent": UA, Accept: "text/html,application/xhtml+xml,*/*;q=0.8" },
    });
    const contentType = res.headers.get("content-type") || "";
    if (!/text\/html/i.test(contentType)) {
      res.body?.cancel().catch(() => {});
      return { html: "", status: res.status, ok: false };
    }
    const html = await res.text();
    return { html, status: res.status, ok: res.ok };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Bounded breadth-first crawl starting from the already-fetched
 * homepage HTML, following same-origin links only.
 */
export async function crawlSite(homepageHtml: string, homepageUrl: string): Promise<SiteCrawlResult> {
  const empty = (error: string | null): SiteCrawlResult => ({
    crawled: false,
    error,
    pagesCrawled: 0,
    pagesRequested: 0,
    pages: [],
    brokenInternalLinks: [],
    linkGraph: [],
    uncrawledInternalLinkCount: 0,
  });

  let origin: string;
  try {
    origin = new URL(homepageUrl).origin;
  } catch {
    return empty("Homepage URL could not be parsed.");
  }

  const homepageLinks = extractInternalLinks(homepageHtml, homepageUrl, origin).slice(0, MAX_LINKS_SAMPLED_PER_PAGE);
  const toVisit = Array.from(new Set([homepageUrl, ...homepageLinks])).slice(0, MAX_PAGES);
  const uncrawledInternalLinkCount = Math.max(0, new Set([homepageUrl, ...homepageLinks]).size - toVisit.length);

  const pages: CrawledPage[] = [];
  const outLinksByPage = new Map<string, string[]>();
  const brokenInternalLinks: { from: string; to: string; status: number }[] = [];

  for (const url of toVisit) {
    const isHomepage = url === homepageUrl;
    const fetched = isHomepage ? { html: homepageHtml, status: 200, ok: true } : await fetchPage(url);

    if (!fetched) {
      const r = await probe(url, "HEAD");
      pages.push({
        url,
        status: r.status,
        ok: r.ok,
        title: null,
        wordCount: 0,
        internalLinkCount: 0,
        possibleJsRenderedContent: false,
        jsRenderReasons: [],
      });
      outLinksByPage.set(url, []);
      continue;
    }

    const titleMatch = fetched.html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const title = titleMatch ? titleMatch[1].replace(/\s+/g, " ").trim().slice(0, 200) : null;
    const bodyText = fetched.html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    const wordCount = bodyText ? bodyText.split(" ").filter(Boolean).length : 0;

    const links = extractInternalLinks(fetched.html, url, origin).slice(0, MAX_LINKS_SAMPLED_PER_PAGE);
    outLinksByPage.set(url, links);

    const jsRender = detectJsRenderedContent(fetched.html);

    pages.push({
      url,
      status: fetched.status,
      ok: fetched.ok,
      title,
      wordCount,
      internalLinkCount: links.length,
      possibleJsRenderedContent: jsRender.flag,
      jsRenderReasons: jsRender.reasons,
    });
  }

  // Cross-check every internal link found on any crawled page against
  // the set of pages we actually fetched: links to pages outside the
  // crawled sample are probed live (bounded, concurrent) so "broken
  // internal link" isn't limited to just the homepage's own links.
  const crawledUrls = new Set(pages.map((p) => p.url));
  const allTargets = new Set<string>();
  for (const targets of outLinksByPage.values()) targets.forEach((t) => allTargets.add(t));
  const targetsToProbe = Array.from(allTargets).slice(0, 30);

  const probeResults = await Promise.all(
    targetsToProbe.map(async (t) => ({ t, r: crawledUrls.has(t) ? null : await probe(t, "HEAD") }))
  );
  const externalProbeStatus = new Map(probeResults.filter((p) => p.r).map((p) => [p.t, p.r!] as const));
  const crawledStatus = new Map(pages.map((p) => [p.url, { ok: p.ok, status: p.status }] as const));

  for (const [from, targets] of outLinksByPage) {
    for (const to of targets) {
      const known = crawledStatus.get(to) || externalProbeStatus.get(to);
      if (known && !known.ok && known.status !== 0) {
        brokenInternalLinks.push({ from, to, status: known.status });
      }
    }
  }

  // Link graph: in-degree from every crawled page's out-links (capped to
  // the crawled+probed set, not the whole site), out-degree from each
  // page's own link count.
  const inDegree = new Map<string, number>();
  for (const targets of outLinksByPage.values()) {
    for (const t of targets) inDegree.set(t, (inDegree.get(t) || 0) + 1);
  }
  const linkGraph: LinkGraphNode[] = pages.map((p) => {
    const inDeg = p.url === homepageUrl ? Math.max(1, inDegree.get(p.url) || 0) : inDegree.get(p.url) || 0;
    return {
      url: p.url,
      inDegree: inDeg,
      outDegree: p.internalLinkCount,
      isOrphanCandidate: p.url !== homepageUrl && inDeg === 0,
    };
  });

  return {
    crawled: true,
    error: null,
    pagesCrawled: pages.length,
    pagesRequested: toVisit.length,
    pages,
    brokenInternalLinks,
    linkGraph,
    uncrawledInternalLinkCount,
  };
}
