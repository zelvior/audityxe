/**
 * Audit mode configuration — single source of truth for the four crawl
 * depths. Every module, check, timeout, UI control, and export reads its
 * behavior from here so the modes can never drift apart.
 *
 * - **fast** (default): Bounded homepage sample. 6 pages, 1 hop, regex
 *   parsing, no retries. ~30s overall timeout.
 * - **deep**: Real multi-hop BFS queue. 25 pages, 3 hops, cheerio parsing,
 *   robots.txt compliance, retries. ~60-88s timeout.
 * - **max**: Maximum-coverage crawl. 50 pages, 5 hops, cheerio parsing,
 *   robots.txt compliance, 2 retries with backoff, sitemap seeding, larger
 *   concurrency. ~90-120s timeout.
 * - **ultra**: Pushes past normal auditing limits. 100 pages, 8 hops, 16
 *   concurrent fetches, 3 retries, 120s crawl budget, sitemap seeding,
 *   extended link probing. ~150-180s timeout. For sites that demand
 *   exhaustive analysis.
 */

export type AuditMode = "fast" | "deep" | "max" | "ultra";

export interface AuditModeConfig {
  id: AuditMode;
  label: string;
  description: string;
  /** Max pages to crawl (including homepage). */
  maxPages: number;
  /** Max crawl depth in hops from homepage. */
  maxDepth: number;
  /** Max concurrent fetches. */
  maxConcurrentFetches: number;
  /** Per-request timeout in ms. */
  requestTimeoutMs: number;
  /** Max links sampled per page. */
  maxLinksPerPage: number;
  /** Internal crawl budget in ms. */
  crawlBudgetMs: number;
  /** Whether to use cheerio (DOM) or regex parsing. */
  useCheerio: boolean;
  /** Whether to fetch and enforce robots.txt. */
  respectRobots: boolean;
  /** Number of retries per failed request. */
  retries: number;
  /** Whether to seed from sitemap.xml. */
  sitemapSeeding: boolean;
  /** Overall audit timeout in ms (no competitor, no PSI). */
  overallTimeoutMs: number;
  /** Overall audit timeout with competitor. */
  competitorTimeoutMs: number;
  /** Overall audit timeout with PSI. */
  psiTimeoutMs: number;
  /** Overall audit timeout with competitor + PSI. */
  competitorPsiTimeoutMs: number;
}

export const AUDIT_MODES: Record<AuditMode, AuditModeConfig> = {
  fast: {
    id: "fast",
    label: "Fast",
    description: "Homepage sample, fastest",
    maxPages: 6,
    maxDepth: 1,
    maxConcurrentFetches: 3,
    requestTimeoutMs: 6000,
    maxLinksPerPage: 40,
    crawlBudgetMs: 0,
    useCheerio: false,
    respectRobots: false,
    retries: 0,
    sitemapSeeding: true,
    overallTimeoutMs: 30000,
    competitorTimeoutMs: 60000,
    psiTimeoutMs: 82000,
    competitorPsiTimeoutMs: 88000,
  },
  deep: {
    id: "deep",
    label: "Deep",
    description: "Up to 25 pages, 3 hops, slower",
    maxPages: 25,
    maxDepth: 3,
    maxConcurrentFetches: 5,
    requestTimeoutMs: 5000,
    maxLinksPerPage: 60,
    crawlBudgetMs: 40000,
    useCheerio: true,
    respectRobots: true,
    retries: 1,
    sitemapSeeding: false,
    overallTimeoutMs: 60000,
    competitorTimeoutMs: 75000,
    psiTimeoutMs: 85000,
    competitorPsiTimeoutMs: 88000,
  },
  max: {
    id: "max",
    label: "Max",
    description: "Up to 50 pages, 5 hops, maximum coverage",
    maxPages: 50,
    maxDepth: 5,
    maxConcurrentFetches: 8,
    requestTimeoutMs: 8000,
    maxLinksPerPage: 100,
    crawlBudgetMs: 80000,
    useCheerio: true,
    respectRobots: true,
    retries: 2,
    sitemapSeeding: true,
    overallTimeoutMs: 90000,
    competitorTimeoutMs: 105000,
    psiTimeoutMs: 115000,
    competitorPsiTimeoutMs: 120000,
  },
  ultra: {
    id: "ultra",
    label: "Ultra",
    description: "100 pages, 8 hops, 16 concurrent, 3 retries — pushes past limits",
    maxPages: 100,
    maxDepth: 8,
    maxConcurrentFetches: 16,
    requestTimeoutMs: 10000,
    maxLinksPerPage: 150,
    crawlBudgetMs: 120000,
    useCheerio: true,
    respectRobots: true,
    retries: 3,
    sitemapSeeding: true,
    overallTimeoutMs: 150000,
    competitorTimeoutMs: 165000,
    psiTimeoutMs: 175000,
    competitorPsiTimeoutMs: 180000,
  },
};

/** Ordered list for UI rendering. */
export const AUDIT_MODE_ORDER: AuditMode[] = ["fast", "deep", "max", "ultra"];

/** Default mode. */
export const DEFAULT_AUDIT_MODE: AuditMode = "fast";

/** Resolve an arbitrary string to a valid AuditMode, falling back to default. */
export function resolveAuditMode(raw: string | undefined | null): AuditMode {
  if (raw === "deep" || raw === "max" || raw === "ultra" || raw === "fast") return raw;
  return DEFAULT_AUDIT_MODE;
}

/** Check if a mode uses the deep crawler (deep, max, or ultra). */
export function isDeepCrawlMode(mode: AuditMode): boolean {
  return mode === "deep" || mode === "max" || mode === "ultra";
}

/** Check if a mode uses the max crawler (max or ultra). */
export function isMaxCrawlMode(mode: AuditMode): boolean {
  return mode === "max" || mode === "ultra";
}
