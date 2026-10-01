"use strict";
/**
 * Max crawl mode — the most thorough crawl option. Extends the deep
 * crawler's BFS approach with higher limits: 50 pages, 5 hops, 8
 * concurrent fetches, 2 retries with backoff, sitemap seeding, and an
 * 80s internal budget.
 *
 * Lazy-imported only when crawlMode === "max" is requested, so its
 * cheerio dependency never loads on the fast/deep path.
 */
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
exports.crawlSiteMax = crawlSiteMax;
const cheerio = __importStar(require("cheerio"));
const url_safety_1 = require("./url-safety");
const network_checks_1 = require("./network-checks");
const MAX_MAX_PAGES = 50;
const MAX_MAX_DEPTH = 5;
const MAX_MAX_CONCURRENT_FETCHES = 8;
const MAX_REQUEST_TIMEOUT_MS = 8000;
const MAX_MAX_LINKS_SAMPLED_PER_PAGE = 100;
const MAX_CRAWL_BUDGET_MS = 80000;
const UA_POOL = [
    "Mozilla/5.0 (compatible; AudityxeBot/1.0; +https://audityxe.vercel.app) MaxCrawl/1",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) AudityxeBot/1.0 (+https://audityxe.vercel.app)",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) AudityxeBot/1.0 (+https://audityxe.vercel.app)",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) AudityxeBot/1.0 (+https://audityxe.vercel.app)",
];
function parseRobots(txt, botToken) {
    const lines = txt.split(/\r?\n/).map((l) => l.trim());
    const disallow = [];
    let applies = false;
    let sawAnyUserAgent = false;
    for (const line of lines) {
        const [rawKey, ...rest] = line.split(":");
        if (!rawKey || rest.length === 0)
            continue;
        const key = rawKey.trim().toLowerCase();
        const value = rest.join(":").trim();
        if (key === "user-agent") {
            sawAnyUserAgent = true;
            applies = value === "*" || value.toLowerCase() === botToken.toLowerCase();
        }
        else if (key === "disallow" && applies && value) {
            disallow.push(value);
        }
    }
    if (!sawAnyUserAgent)
        return { disallow: [] };
    return { disallow };
}
function isDisallowed(path, rules) {
    return rules.disallow.some((rule) => path.startsWith(rule));
}
async function fetchRobots(origin) {
    try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), MAX_REQUEST_TIMEOUT_MS);
        const res = await fetch(`${origin}/robots.txt`, {
            redirect: "follow",
            signal: controller.signal,
            headers: { "User-Agent": UA_POOL[0] },
        }).finally(() => clearTimeout(timer));
        if (!res.ok)
            return { disallow: [] };
        return parseRobots(await res.text(), "AudityxeBot");
    }
    catch {
        return { disallow: [] };
    }
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
async function fetchWithRetry(url, attempt = 0) {
    try {
        await (0, url_safety_1.assertSafeUrl)(url);
    }
    catch {
        return null;
    }
    const ua = UA_POOL[Math.floor(Math.random() * UA_POOL.length)];
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), MAX_REQUEST_TIMEOUT_MS);
    try {
        const res = await fetch(url, {
            redirect: "follow",
            signal: controller.signal,
            headers: { "User-Agent": ua, Accept: "text/html,application/xhtml+xml,*/*;q=0.8" },
        });
        const contentType = res.headers.get("content-type") || "";
        if (!/text\/html/i.test(contentType)) {
            res.body?.cancel().catch(() => { });
            return { html: "", status: res.status, ok: false, retried: attempt > 0 };
        }
        if ((res.status === 429 || res.status === 503) && attempt < 2) {
            await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
            return fetchWithRetry(url, attempt + 1);
        }
        const html = await res.text();
        return { html, status: res.status, ok: res.ok, retried: attempt > 0 };
    }
    catch {
        if (attempt < 2) {
            await new Promise((r) => setTimeout(r, 300 * (attempt + 1)));
            return fetchWithRetry(url, attempt + 1);
        }
        return null;
    }
    finally {
        clearTimeout(timer);
    }
}
function detectJsRenderedContent($, html) {
    const reasons = [];
    const visibleText = $("body").clone().find("script, style").remove().end().text().replace(/\s+/g, " ").trim();
    const scriptCount = $("script").length;
    const scriptBytes = $("script")
        .toArray()
        .reduce((sum, el) => sum + ($(el).html() || "").length, 0);
    const hasEmptyMountPoint = ["#root", "#app", "#__next", "#___gatsby"].some((sel) => {
        const el = $(sel).first();
        return el.length > 0 && el.children().length === 0 && (el.text() || "").trim().length === 0;
    });
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
async function seedUrlsFromSitemap(origin) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), MAX_REQUEST_TIMEOUT_MS);
    try {
        const res = await fetch(`${origin}/sitemap.xml`, {
            redirect: "follow",
            signal: controller.signal,
            headers: { "User-Agent": UA_POOL[0], Accept: "application/xml,text/xml,*/*;q=0.8" },
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
        }).slice(0, 30);
    }
    catch {
        return [];
    }
    finally {
        clearTimeout(timer);
    }
}
async function crawlSiteMax(homepageHtml, homepageUrl) {
    const empty = (error) => ({
        crawled: false,
        error,
        pagesCrawled: 0,
        pagesRequested: 0,
        pages: [],
        brokenInternalLinks: [],
        linkGraph: [],
        uncrawledInternalLinkCount: 0,
        engine: "max",
        robotsRespected: false,
        disallowedUrlsSkipped: 0,
        retriedRequests: 0,
        maxDepthReached: 0,
        budgetExceeded: false,
    });
    let origin;
    try {
        origin = new URL(homepageUrl).origin;
    }
    catch {
        return empty("Homepage URL could not be parsed.");
    }
    const startedAt = Date.now();
    const robots = await fetchRobots(origin);
    const sitemapSeeds = await seedUrlsFromSitemap(origin);
    const visited = new Map();
    const outLinksByPage = new Map();
    const queue = [{ url: homepageUrl, depth: 0 }];
    const queued = new Set([homepageUrl, ...sitemapSeeds]);
    let disallowedUrlsSkipped = 0;
    let retriedRequests = 0;
    let maxDepthReached = 0;
    let budgetExceeded = false;
    while (queue.length > 0 && visited.size < MAX_MAX_PAGES) {
        if (Date.now() - startedAt > MAX_CRAWL_BUDGET_MS) {
            budgetExceeded = true;
            break;
        }
        const batch = queue.splice(0, Math.max(1, MAX_MAX_PAGES - visited.size));
        const fetchedBatch = await runWithConcurrency(batch, MAX_MAX_CONCURRENT_FETCHES, async ({ url, depth }) => {
            maxDepthReached = Math.max(maxDepthReached, depth);
            const isHomepage = url === homepageUrl;
            const fetched = isHomepage
                ? { html: homepageHtml, status: 200, ok: true, retried: false }
                : await fetchWithRetry(url);
            if (fetched?.retried)
                retriedRequests++;
            if (!fetched) {
                const r = await (0, network_checks_1.probe)(url, "HEAD");
                const page = {
                    url,
                    status: r.status,
                    ok: r.ok,
                    title: null,
                    wordCount: 0,
                    internalLinkCount: 0,
                    possibleJsRenderedContent: false,
                    jsRenderReasons: [],
                };
                return { url, depth, page, links: [] };
            }
            const $ = cheerio.load(fetched.html);
            const title = ($("title").first().text() || "").replace(/\s+/g, " ").trim().slice(0, 200) || null;
            const wordCount = $("body").clone().find("script, style").remove().end().text().replace(/\s+/g, " ").trim().split(" ").filter(Boolean).length;
            const hrefs = $("a[href]")
                .map((_, el) => $(el).attr("href") || "")
                .get();
            const links = Array.from(new Set(hrefs.map((h) => resolveInternal(h, url, origin)).filter((u) => !!u))).slice(0, MAX_MAX_LINKS_SAMPLED_PER_PAGE);
            const jsRender = detectJsRenderedContent($, fetched.html);
            const page = {
                url,
                status: fetched.status,
                ok: fetched.ok,
                title,
                wordCount,
                internalLinkCount: links.length,
                possibleJsRenderedContent: jsRender.flag,
                jsRenderReasons: jsRender.reasons,
            };
            return { url, depth, page, links };
        });
        for (const { url, depth, page, links } of fetchedBatch) {
            visited.set(url, page);
            outLinksByPage.set(url, links);
            if (depth < MAX_MAX_DEPTH) {
                for (const link of links) {
                    if (queued.has(link) || visited.has(link))
                        continue;
                    const path = (() => {
                        try {
                            return new URL(link).pathname;
                        }
                        catch {
                            return "/";
                        }
                    })();
                    if (isDisallowed(path, robots)) {
                        disallowedUrlsSkipped++;
                        continue;
                    }
                    if (visited.size + queue.length >= MAX_MAX_PAGES)
                        continue;
                    queued.add(link);
                    queue.push({ url: link, depth: depth + 1 });
                }
            }
        }
    }
    const pages = Array.from(visited.values());
    const brokenInternalLinks = [];
    const crawledUrls = new Set(pages.map((p) => p.url));
    const allTargets = new Set();
    for (const targets of outLinksByPage.values())
        targets.forEach((t) => allTargets.add(t));
    const targetsToProbe = Array.from(allTargets)
        .filter((t) => !crawledUrls.has(t))
        .slice(0, 50);
    const probeResults = await runWithConcurrency(targetsToProbe, MAX_MAX_CONCURRENT_FETCHES, async (t) => ({
        t,
        r: await (0, network_checks_1.probe)(t, "HEAD"),
    }));
    const externalProbeStatus = new Map(probeResults.map((p) => [p.t, p.r]));
    const crawledStatus = new Map(pages.map((p) => [p.url, { ok: p.ok, status: p.status }]));
    for (const [from, targets] of outLinksByPage) {
        for (const to of targets) {
            const known = crawledStatus.get(to) || externalProbeStatus.get(to);
            if (known && !known.ok && known.status !== 0) {
                brokenInternalLinks.push({ from, to, status: known.status });
            }
        }
    }
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
    const uncrawledInternalLinkCount = queue.length + Math.max(0, queued.size - visited.size - queue.length);
    return {
        crawled: true,
        error: null,
        pagesCrawled: pages.length,
        pagesRequested: queued.size,
        pages,
        brokenInternalLinks,
        linkGraph,
        uncrawledInternalLinkCount,
        engine: "max",
        robotsRespected: true,
        disallowedUrlsSkipped,
        retriedRequests,
        maxDepthReached,
        budgetExceeded,
    };
}
