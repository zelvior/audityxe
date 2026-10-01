import { PageSpeedSummary } from "./types";
export declare const EMPTY_PAGESPEED_SUMMARY: PageSpeedSummary;
/**
 * Public entry point: runs the primary mobile Lighthouse pass (the one
 * that actually determines Core Web Vitals / pass-fail scoring) and the
 * secondary desktop-only screenshot capture in parallel, then merges
 * the desktop screenshot into whatever the primary pass returned —
 * success or failure. A failed primary pass can still end up with a
 * usable desktop screenshot to show, and a failed desktop capture never
 * affects the primary result either way.
 */
export declare function fetchPageSpeedInsights(targetUrl: string, byokApiKey?: string | null): Promise<PageSpeedSummary>;
