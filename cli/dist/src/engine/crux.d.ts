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
export declare const EMPTY_CRUX_SUMMARY: CruxSummary;
export declare function fetchCruxSummary(targetUrl: string, byokApiKey?: string | null): Promise<CruxSummary>;
