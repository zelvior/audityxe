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
    brokenInternalLinks: {
        from: string;
        to: string;
        status: number;
    }[];
    linkGraph: LinkGraphNode[];
    /** Internal links found on the homepage but never fetched (crawl depth
     * capped at MAX_PAGES) — reported so "we only checked N pages" is
     * explicit, not silently implied. */
    uncrawledInternalLinkCount: number;
}
/**
 * Bounded breadth-first crawl starting from the already-fetched
 * homepage HTML, following same-origin links only.
 */
export declare function crawlSite(homepageHtml: string, homepageUrl: string): Promise<SiteCrawlResult>;
