/**
 * Real-user Core Web Vitals, straight from Chrome's own telemetry —
 * distinct from, and complementary to, the Lighthouse pass in
 * pagespeed.ts. Lighthouse/PSI is *lab data*: one simulated run, on
 * Google's infrastructure, under fixed network/CPU conditions. CrUX is
 * *field data*: aggregated, anonymized measurements from real Chrome
 * users who actually visited the site, over the preceding 28 days. A
 * site can look great in one Lighthouse run and still be slow for real
 * users on real, throttled connections — CrUX is what actually
 * separates that pass from a genuinely fast experience in the wild.
 *
 * PSI's own response already embeds a version of this (see `fieldData`
 * in pagespeed.ts, extracted from PSI's `loadingExperience` field) —
 * but only when a full Lighthouse run was actually requested, which is
 * gated to Pro plans with a weekly cap (see `confirmPageSpeed` /
 * `includePageSpeed`). CrUX itself is a separate, much lighter Google
 * API — no headless Chrome run behind it, just a lookup against
 * Google's existing published dataset — so calling it directly here,
 * independent of that gate, means every plan gets real-user Core Web
 * Vitals, not just whoever spent their Lighthouse quota this week.
 *
 * Same honest posture as pagespeed.ts: CrUX is an enhancement layer,
 * never a hard dependency. Two very common, non-error outcomes:
 *   - No API key configured → skipped entirely, cleanly.
 *   - 404 "no data" → most sites simply don't have enough real Chrome
 *     traffic for Google to publish aggregated, privacy-safe field
 *     data. This is not a failure of the site or of this check; it's
 *     reported as exactly that, not as an error.
 */

import { CruxSummary } from "./types";

const CRUX_TIMEOUT_MS = 8000;
const CRUX_ENDPOINT = "https://chromeuxreport.googleapis.com/v1/records:queryRecord";

export const EMPTY_CRUX_SUMMARY: CruxSummary = {
  available: false,
  reason: "not_configured",
  origin: null,
  collectionPeriod: null,
  metrics: [],
};

interface CruxHistogramBin {
  start: number;
  end?: number;
  density?: number;
}

interface CruxMetricRaw {
  histogram?: CruxHistogramBin[];
  percentiles?: { p75?: number };
}

interface CruxApiResponse {
  record?: {
    key?: { origin?: string; url?: string };
    metrics?: Record<string, CruxMetricRaw>;
    collectionPeriod?: {
      firstDate?: { year: number; month: number; day: number };
      lastDate?: { year: number; month: number; day: number };
    };
  };
}

// CrUX's own metric keys → a stable, human id this codebase controls.
// Thresholds are Google's own published "good" / "poor" Core Web
// Vitals boundaries, same ones Lighthouse and Search Console use, so a
// field-data verdict here means the same thing it would anywhere else.
const METRIC_DEFS: {
  cruxKey: string;
  id: string;
  label: string;
  unit: "ms" | "score";
  good: number;
  poor: number;
}[] = [
  { cruxKey: "largest_contentful_paint", id: "lcp", label: "Largest Contentful Paint", unit: "ms", good: 2500, poor: 4000 },
  { cruxKey: "cumulative_layout_shift", id: "cls", label: "Cumulative Layout Shift", unit: "score", good: 0.1, poor: 0.25 },
  { cruxKey: "interaction_to_next_paint", id: "inp", label: "Interaction to Next Paint", unit: "ms", good: 200, poor: 500 },
  { cruxKey: "experimental_time_to_first_byte", id: "ttfb", label: "Time to First Byte", unit: "ms", good: 800, poor: 1800 },
];

function verdictFor(value: number, good: number, poor: number): "good" | "needs-improvement" | "poor" {
  if (value <= good) return "good";
  if (value <= poor) return "needs-improvement";
  return "poor";
}

function formatDate(d?: { year: number; month: number; day: number }): string | null {
  if (!d) return null;
  return `${d.year}-${String(d.month).padStart(2, "0")}-${String(d.day).padStart(2, "0")}`;
}

export async function fetchCruxSummary(targetUrl: string, byokApiKey?: string | null): Promise<CruxSummary> {
  const apiKey = byokApiKey || process.env.CRUX_API_KEY || process.env.PAGESPEED_API_KEY;
  if (!apiKey) {
    return { ...EMPTY_CRUX_SUMMARY, reason: "not_configured" };
  }

  let origin: string;
  try {
    origin = new URL(targetUrl).origin;
  } catch {
    return { ...EMPTY_CRUX_SUMMARY, reason: "invalid_url" };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CRUX_TIMEOUT_MS);
  try {
    const res = await fetch(`${CRUX_ENDPOINT}?key=${encodeURIComponent(apiKey)}`, {
      method: "POST",
      signal: controller.signal,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ origin }),
    });

    if (res.status === 404) {
      // The documented, expected shape of "not enough real Chrome
      // traffic to publish" — genuinely the majority outcome for
      // small/medium sites. Not an error.
      return { available: false, reason: "no_data", origin, collectionPeriod: null, metrics: [] };
    }
    if (!res.ok) {
      return { available: false, reason: "request_failed", origin, collectionPeriod: null, metrics: [] };
    }

    const data: CruxApiResponse = await res.json();
    const rawMetrics = data.record?.metrics;
    if (!rawMetrics) {
      return { available: false, reason: "no_data", origin, collectionPeriod: null, metrics: [] };
    }

    const metrics = METRIC_DEFS.map((def) => {
      const raw = rawMetrics[def.cruxKey];
      const p75 = raw?.percentiles?.p75;
      if (typeof p75 !== "number") return null;
      return {
        id: def.id,
        label: def.label,
        unit: def.unit,
        p75,
        verdict: verdictFor(p75, def.good, def.poor),
      };
    }).filter((m): m is NonNullable<typeof m> => m !== null);

    if (metrics.length === 0) {
      return { available: false, reason: "no_data", origin, collectionPeriod: null, metrics: [] };
    }

    return {
      available: true,
      reason: null,
      origin,
      collectionPeriod: {
        firstDate: formatDate(data.record?.collectionPeriod?.firstDate),
        lastDate: formatDate(data.record?.collectionPeriod?.lastDate),
      },
      metrics,
    };
  } catch {
    return { available: false, reason: "request_failed", origin, collectionPeriod: null, metrics: [] };
  } finally {
    clearTimeout(timer);
  }
}
