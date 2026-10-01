/**
 * Max crawl mode — the most thorough crawl option. Extends the deep
 * crawler's BFS approach with higher limits: 50 pages, 5 hops, 8
 * concurrent fetches, 2 retries with backoff, sitemap seeding, and an
 * 80s internal budget.
 *
 * Lazy-imported only when crawlMode === "max" is requested, so its
 * cheerio dependency never loads on the fast/deep path.
 */
import type { SiteCrawlResult } from "./site-crawl";
export interface MaxCrawlResult extends SiteCrawlResult {
    engine: "max";
    robotsRespected: boolean;
    disallowedUrlsSkipped: number;
    retriedRequests: number;
    maxDepthReached: number;
    budgetExceeded: boolean;
}
export declare function crawlSiteMax(homepageHtml: string, homepageUrl: string): Promise<MaxCrawlResult>;
