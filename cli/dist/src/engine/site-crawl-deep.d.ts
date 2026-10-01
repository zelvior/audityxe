/**
 * Deep crawl mode — an opt-in, slower, more thorough alternative to
 * site-crawl.ts's fast mode.
 *
 * ## Why this isn't the vendored Crawlee-derived package directly
 *
 * We inspected the supplied crawler package (`@audityxe-crawler/core`,
 * `basic-crawler`, `cheerio-crawler`, `http-crawler`, `http-client`,
 * `types`, `utils` — a rebrand of Apify's Crawlee) with the intent of
 * importing it as-is. Two hard blockers made that impossible to ship
 * reliably:
 *
 *   1. `@audityxe-crawler/core`'s package.json depends on
 *      `@audityxe-crawler/fs-storage` (workspace:*) for its default
 *      RequestQueue/Dataset storage backend — that package is not
 *      present anywhere in the supplied archive, so `core`, and every
 *      package built on it, cannot be installed or built as delivered.
 *   2. Every package is `"type": "module"` (ESM-only) with
 *      `"engines": { "node": ">=22.0.0" }`, built via a pnpm workspace +
 *      Turborepo pipeline (`turbo run build`) that assumes the whole
 *      monorepo is present. Vendoring just the pieces that *are* present
 *      would still need that toolchain and Node 22, which isn't a
 *      requirement this project makes of its deployment target.
 *
 * Rather than either skip deep mode entirely or ship something that
 * fails to build, this module reimplements the package's genuinely
 * useful techniques directly against the real, published `cheerio`
 * package (the same HTML parser Crawlee itself wraps) with **no other
 * new dependency** and no fs-storage / Node 22 / ESM-toolchain
 * requirement:
 *
 *   - **Request queue** — real BFS across the whole reachable site (not
 *     just the homepage's own links, like fast mode), bounded by page
 *     count and crawl depth, not just a fixed link sample.
 *   - **Retries** — each request gets one retry with backoff before
 *     being recorded as failed.
 *   - **Concurrency pool** — bounded concurrent fetches (see
 *     runWithConcurrency in site-crawl.ts, reused here).
 *   - **Session/UA rotation** — requests rotate across a small pool of
 *     realistic desktop user agents rather than one fixed string.
 *   - **robots.txt compliance** — fetched once, parsed, and every
 *     candidate URL is checked against its Disallow rules before being
 *     queued, the same courtesy a real crawler owes a site.
 *   - **Cheerio-based parsing** — real DOM traversal for links, title,
 *     and word count instead of fast mode's regex approach, which is
 *     more accurate on malformed/unusual HTML.
 *
 * Same soft-failure contract as fast mode: any top-level error still
 * yields `crawled: false`, never a thrown exception the caller has to
 * handle specially.
 */
import type { SiteCrawlResult } from "./site-crawl";
export interface DeepCrawlResult extends SiteCrawlResult {
    engine: "deep";
    robotsRespected: boolean;
    disallowedUrlsSkipped: number;
    retriedRequests: number;
    maxDepthReached: number;
    budgetExceeded: boolean;
}
/**
 * Real BFS request queue: unlike fast mode (one page of links sampled
 * from the homepage plus sitemap seeds, capped at 6 pages total), this
 * follows links found on every page it visits, up to DEEP_MAX_DEPTH
 * hops from the homepage and DEEP_MAX_PAGES pages overall — the actual
 * shape of a real crawl queue, processed in waves so concurrency and
 * the page/budget caps apply across the whole crawl, not per page.
 */
export declare function crawlSiteDeep(homepageHtml: string, homepageUrl: string): Promise<DeepCrawlResult>;
