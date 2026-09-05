import { PageSpeedSummary } from "./types";

/**
 * Real browser-level auditing, done honestly: rather than bundling a
 * headless Chromium binary into a serverless function (fragile, slow
 * cold starts, and a real risk of silently failing in production —
 * exactly the kind of thing that shouldn't be shipped as if it works),
 * Audityxe calls Google's PageSpeed Insights API. This is not a
 * simulation: PSI actually launches real Chrome, renders the page, and
 * runs a full Lighthouse audit — the same engine Chrome DevTools uses —
 * on Google's infrastructure. It's free: usable with no API key at a
 * modest rate limit, or with a free (no billing required) API key from
 * Google Cloud Console for a much higher daily quota.
 *
 * If PSI is slow, rate-limited, or unavailable for a given request, the
 * rest of the audit still completes normally using Audityxe's own
 * signal-based checks — this is treated as an enhancement layer, never
 * a hard dependency.
 */

const PSI_TIMEOUT_MS = 12000;

export const EMPTY_PAGESPEED_SUMMARY: PageSpeedSummary = {
  fetched: false,
  performanceScore: null,
  accessibilityScore: null,
  bestPracticesScore: null,
  seoScore: null,
  coreWebVitals: { lcpMs: null, clsScore: null, tbtMs: null, fcpMs: null, speedIndexMs: null },
  topIssues: [],
};

export async function fetchPageSpeedInsights(targetUrl: string, byokApiKey?: string | null): Promise<PageSpeedSummary> {
  const empty: PageSpeedSummary = EMPTY_PAGESPEED_SUMMARY;

  const apiKey = byokApiKey || process.env.PAGESPEED_API_KEY;
  const params = new URLSearchParams();
  params.set("url", targetUrl);
  params.set("strategy", "mobile");
  ["performance", "accessibility", "best-practices", "seo"].forEach((c) => params.append("category", c));
  if (apiKey) params.set("key", apiKey);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PSI_TIMEOUT_MS);

  try {
    const res = await fetch(`https://www.googleapis.com/pagespeedonline/v5/runPagespeed?${params.toString()}`, {
      signal: controller.signal,
    });
    if (!res.ok) {
      return empty;
    }
    const data = await res.json();
    const lh = data?.lighthouseResult;
    if (!lh) return empty;

    const categories = lh.categories || {};
    const audits: Record<string, { score: number | null; title?: string; description?: string; numericValue?: number }> =
      lh.audits || {};

    const pct = (cat: { score?: number } | undefined): number | null =>
      typeof cat?.score === "number" ? Math.round(cat.score * 100) : null;

    const metricMs = (id: string): number | null =>
      typeof audits[id]?.numericValue === "number" ? Math.round(audits[id].numericValue as number) : null;

    // Real, specific failing audits — this is the "evidence" layer: each
    // one is a concrete Lighthouse finding with its own title/description,
    // not a generic score.
    const failingAudits = Object.entries(audits)
      .filter(([, a]) => typeof a.score === "number" && a.score < 0.9 && a.title && a.description)
      .sort((a, b) => (a[1].score ?? 1) - (b[1].score ?? 1))
      .slice(0, 8)
      .map(([id, a]) => ({
        id,
        title: a.title as string,
        description: (a.description as string).replace(/\[.*?\]\(.*?\)/g, "").trim(),
      }));

    return {
      fetched: true,
      performanceScore: pct(categories.performance),
      accessibilityScore: pct(categories.accessibility),
      bestPracticesScore: pct(categories["best-practices"]),
      seoScore: pct(categories.seo),
      coreWebVitals: {
        lcpMs: metricMs("largest-contentful-paint"),
        clsScore: audits["cumulative-layout-shift"]?.numericValue ?? null,
        tbtMs: metricMs("total-blocking-time"),
        fcpMs: metricMs("first-contentful-paint"),
        speedIndexMs: metricMs("speed-index"),
      },
      topIssues: failingAudits,
    };
  } catch {
    return empty;
  } finally {
    clearTimeout(timer);
  }
}
