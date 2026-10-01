"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.crawlSite = crawlSite;
const url_safety_1 = require("./url-safety");
const network_checks_1 = require("./network-checks");
const CRAWL_TIMEOUT_MS = 6000;
const MAX_PAGES = 6; // homepage + up to 5 more
const MAX_LINKS_SAMPLED_PER_PAGE = 40;
const MAX_CONCURRENT_FETCHES = 3; // bounded request pool, same idea as a Crawlee RequestQueue's concurrency cap, without the dependency
const UA = "Mozilla/5.0 (compatible; AudityxeBot/1.0; +https://audityxe.vercel.app)";
/**
 * Best-effort extra seed URLs pulled from /sitemap.xml, merged in
 * alongside the homepage's own <a> links before the BFS queue is capped
 * at MAX_PAGES. Mirrors Crawlee's sitemap-seeded RequestList pattern:
 * a sitemap often surfaces pages that aren't linked from the homepage
 * at all (exactly the orphan-page case this module already flags), so
 * sampling from it improves the odds of catching one. Never fatal —
 * an unreachable or malformed sitemap just yields no extra seeds.
 */
async function seedUrlsFromSitemap(origin) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), CRAWL_TIMEOUT_MS);
    try {
        const res = await fetch(`${origin}/sitemap.xml`, {
            redirect: "follow",
            signal: controller.signal,
            headers: { "User-Agent": UA, Accept: "application/xml,text/xml,*/*;q=0.8" },
        });
        if (!res.ok)
            return [];
        const xml = await res.text();
        const locs = [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)].map((m) => m[1]);
        return locs.filter((u) => {
            try {
                return new URL(u).origin === origin;
            }
            catch {
                return false;
            }
        });
    }
    catch {
        return [];
    }
    finally {
        clearTimeout(timer);
    }
}
/** Runs `worker` over `items` with at most `limit` in flight at once. */
async function runWithConcurrency(items, limit, worker) {
    const results = new Array(items.length);
    let next = 0;
    async function runNext() {
        const i = next++;
        if (i >= items.length)
            return;
        results[i] = await worker(items[i]);
        return runNext();
    }
    await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => runNext()));
    return results;
}
function resolveInternal(href, base, origin) {
    if (!href || href.startsWith("#") || /^(mailto:|tel:|javascript:)/i.test(href))
        return null;
    try {
        const u = new URL(href, base);
        u.hash = "";
        if (u.origin !== origin)
            return null;
        return u.toString();
    }
    catch {
        return null;
    }
}
function extractInternalLinks(html, pageUrl, origin) {
    const hrefs = [...html.matchAll(/<a\b[^>]*href\s*=\s*["']([^"']+)["']/gi)].map((m) => m[1]);
    const resolved = hrefs.map((h) => resolveInternal(h, pageUrl, origin)).filter((u) => !!u);
    return Array.from(new Set(resolved));
}
function detectJsRenderedContent(html) {
    const reasons = [];
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
    if (hasEmptyMountPoint)
        reasons.push("an empty SPA mount point (#root/#app/#__next) was found in the static HTML");
    if (visibleText.length < 200 && scriptBytes > 20_000) {
        reasons.push(`only ${visibleText.length} characters of visible text alongside ~${Math.round(scriptBytes / 1024)}KB of inline script`);
    }
    if (scriptCount >= 8 && visibleText.length < 500) {
        reasons.push(`${scriptCount} <script> tags but under 500 characters of static visible text`);
    }
    return { flag: reasons.length > 0, reasons };
}
async function fetchPage(url) {
    try {
        await (0, url_safety_1.assertSafeUrl)(url);
    }
    catch {
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
            res.body?.cancel().catch(() => { });
            return { html: "", status: res.status, ok: false };
        }
        const html = await res.text();
        return { html, status: res.status, ok: res.ok };
    }
    catch {
        return null;
    }
    finally {
        clearTimeout(timer);
    }
}
/**
 * Bounded breadth-first crawl starting from the already-fetched
 * homepage HTML, following same-origin links only.
 */
async function crawlSite(homepageHtml, homepageUrl) {
    const empty = (error) => ({
        crawled: false,
        error,
        pagesCrawled: 0,
        pagesRequested: 0,
        pages: [],
        brokenInternalLinks: [],
        linkGraph: [],
        uncrawledInternalLinkCount: 0,
    });
    let origin;
    try {
        origin = new URL(homepageUrl).origin;
    }
    catch {
        return empty("Homepage URL could not be parsed.");
    }
    const sitemapSeeds = await seedUrlsFromSitemap(origin);
    const homepageLinks = extractInternalLinks(homepageHtml, homepageUrl, origin).slice(0, MAX_LINKS_SAMPLED_PER_PAGE);
    const candidateUrls = new Set([homepageUrl, ...homepageLinks, ...sitemapSeeds]);
    const toVisit = Array.from(candidateUrls).slice(0, MAX_PAGES);
    const uncrawledInternalLinkCount = Math.max(0, candidateUrls.size - toVisit.length);
    const outLinksByPage = new Map();
    // Bounded-concurrency fetch pool (see runWithConcurrency) instead of a
    // sequential for-loop: same MAX_PAGES budget, fetched several at a
    // time rather than one after another, cutting wall-clock crawl time
    // roughly by MAX_CONCURRENT_FETCHES on a typical multi-page run.
    const pages = await runWithConcurrency(toVisit, MAX_CONCURRENT_FETCHES, async (url) => {
        const isHomepage = url === homepageUrl;
        const fetched = isHomepage ? { html: homepageHtml, status: 200, ok: true } : await fetchPage(url);
        if (!fetched) {
            const r = await (0, network_checks_1.probe)(url, "HEAD");
            outLinksByPage.set(url, []);
            return {
                url,
                status: r.status,
                ok: r.ok,
                title: null,
                wordCount: 0,
                internalLinkCount: 0,
                possibleJsRenderedContent: false,
                jsRenderReasons: [],
            };
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
        return {
            url,
            status: fetched.status,
            ok: fetched.ok,
            title,
            wordCount,
            internalLinkCount: links.length,
            possibleJsRenderedContent: jsRender.flag,
            jsRenderReasons: jsRender.reasons,
        };
    });
    const brokenInternalLinks = [];
    // Cross-check every internal link found on any crawled page against
    // the set of pages we actually fetched: links to pages outside the
    // crawled sample are probed live (bounded, concurrent) so "broken
    // internal link" isn't limited to just the homepage's own links.
    const crawledUrls = new Set(pages.map((p) => p.url));
    const allTargets = new Set();
    for (const targets of outLinksByPage.values())
        targets.forEach((t) => allTargets.add(t));
    const targetsToProbe = Array.from(allTargets).slice(0, 30);
    const probeResults = await Promise.all(targetsToProbe.map(async (t) => ({ t, r: crawledUrls.has(t) ? null : await (0, network_checks_1.probe)(t, "HEAD") })));
    const externalProbeStatus = new Map(probeResults.filter((p) => p.r).map((p) => [p.t, p.r]));
    const crawledStatus = new Map(pages.map((p) => [p.url, { ok: p.ok, status: p.status }]));
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
    const inDegree = new Map();
    for (const targets of outLinksByPage.values()) {
        for (const t of targets)
            inDegree.set(t, (inDegree.get(t) || 0) + 1);
    }
    const linkGraph = pages.map((p) => {
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
