"use client";

import { motion } from "framer-motion";
import { Gauge, Lock } from "lucide-react";
import { AuditResult } from "@/lib/types";

function metricColor(value: number | null, good: number, poor: number, lowerIsBetter = true): string {
  if (value == null) return "text-text-secondary";
  const isGood = lowerIsBetter ? value <= good : value >= good;
  const isPoor = lowerIsBetter ? value >= poor : value <= poor;
  if (isGood) return "text-emerald";
  if (isPoor) return "text-rose";
  return "text-amber";
}

function Metric({ label, value, unit, colorClass }: { label: string; value: string; unit?: string; colorClass: string }) {
  return (
    <div className="rounded-card bg-surface2/60 px-3 py-2.5">
      <p className="text-[10px] font-mono text-text-secondary uppercase tracking-wide">{label}</p>
      <p className={`font-display font-semibold text-lg ${colorClass}`}>
        {value}
        {unit && <span className="text-xs font-mono text-text-secondary ml-0.5">{unit}</span>}
      </p>
    </div>
  );
}

export default function PerformanceMetrics({ result }: { result: AuditResult }) {
  const isPro = result._usage?.plan === "pro";

  if (result.pageSpeedLocked) {
    if (!isPro) return null; // free/anon plans never get the option — no point showing a lock message for a feature they can't reach
    const reason =
      result.pageSpeedLockReason === "weekly_limit"
        ? "This plan's weekly real-browser (Lighthouse) audit quota has already been used."
        : "A real-browser (Lighthouse) pass wasn't requested for this audit.";
    return (
      <section className="px-4 sm:px-6">
        <div className="max-w-4xl mx-auto glass rounded-card p-4 sm:p-6 flex items-center gap-3 text-sm text-text-secondary">
          <Lock size={16} className="shrink-0 text-primary" />
          <p>Lab performance metrics not included: {reason}</p>
        </div>
      </section>
    );
  }

  if (!result.pageSpeed?.fetched) return null;

  const cwv = result.pageSpeed.coreWebVitals;

  return (
    <section className="px-4 sm:px-6 py-4 sm:py-6">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="max-w-4xl mx-auto glass rounded-card p-4 sm:p-6"
      >
        <div className="flex items-center gap-2 mb-1">
          <Gauge size={16} className="text-primary" />
          <h3 className="font-display font-semibold text-sm sm:text-base">Real Browser Performance</h3>
        </div>
        <p className="text-xs text-text-secondary mb-4">
          Lab measurement data from a single automated run — not real-user field data, and can vary run to run.
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-4">
          <Metric
            label="Performance"
            value={result.pageSpeed.performanceScore != null ? String(result.pageSpeed.performanceScore) : "\u2014"}
            colorClass={metricColor(result.pageSpeed.performanceScore, 90, 50, false)}
          />
          <Metric
            label="Accessibility"
            value={result.pageSpeed.accessibilityScore != null ? String(result.pageSpeed.accessibilityScore) : "\u2014"}
            colorClass={metricColor(result.pageSpeed.accessibilityScore, 90, 50, false)}
          />
          <Metric
            label="Best Practices"
            value={result.pageSpeed.bestPracticesScore != null ? String(result.pageSpeed.bestPracticesScore) : "\u2014"}
            colorClass={metricColor(result.pageSpeed.bestPracticesScore, 90, 50, false)}
          />
          <Metric
            label="SEO"
            value={result.pageSpeed.seoScore != null ? String(result.pageSpeed.seoScore) : "\u2014"}
            colorClass={metricColor(result.pageSpeed.seoScore, 90, 50, false)}
          />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 sm:gap-4">
          <Metric label="LCP" value={cwv.lcpMs != null ? String(cwv.lcpMs) : "\u2014"} unit="ms" colorClass={metricColor(cwv.lcpMs, 2500, 4000)} />
          <Metric label="CLS" value={cwv.clsScore != null ? cwv.clsScore.toFixed(2) : "\u2014"} colorClass={metricColor(cwv.clsScore, 0.1, 0.25)} />
          <Metric label="TBT" value={cwv.tbtMs != null ? String(cwv.tbtMs) : "\u2014"} unit="ms" colorClass={metricColor(cwv.tbtMs, 200, 600)} />
          <Metric label="FCP" value={cwv.fcpMs != null ? String(cwv.fcpMs) : "\u2014"} unit="ms" colorClass={metricColor(cwv.fcpMs, 1800, 3000)} />
          <Metric label="Speed Index" value={cwv.speedIndexMs != null ? String(cwv.speedIndexMs) : "\u2014"} unit="ms" colorClass={metricColor(cwv.speedIndexMs, 3400, 5800)} />
        </div>

        {result.pageSpeed.fieldData?.available ? (
          <div className="mt-5">
            <p className="text-xs font-mono text-text-secondary uppercase tracking-wide mb-1">
              Real-world Core Web Vitals ({result.pageSpeed.fieldData.scope}-level, past 28 days)
            </p>
            <p className="text-[11px] text-text-secondary/70 mb-3">
              From actual Chrome users visiting this site — the higher-confidence number if it
              diverges from the single lab run above.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              <Metric
                label="Overall"
                value={result.pageSpeed.fieldData.overallCategory ?? "\u2014"}
                colorClass={
                  result.pageSpeed.fieldData.overallCategory === "FAST"
                    ? "text-emerald"
                    : result.pageSpeed.fieldData.overallCategory === "SLOW"
                    ? "text-rose"
                    : "text-amber"
                }
              />
              <Metric
                label="LCP"
                value={result.pageSpeed.fieldData.lcpMs != null ? String(result.pageSpeed.fieldData.lcpMs) : "\u2014"}
                unit="ms"
                colorClass={metricColor(result.pageSpeed.fieldData.lcpMs, 2500, 4000)}
              />
              <Metric
                label="CLS"
                value={result.pageSpeed.fieldData.clsScore != null ? result.pageSpeed.fieldData.clsScore.toFixed(2) : "\u2014"}
                colorClass={metricColor(result.pageSpeed.fieldData.clsScore, 0.1, 0.25)}
              />
              <Metric
                label="INP"
                value={result.pageSpeed.fieldData.inpMs != null ? String(result.pageSpeed.fieldData.inpMs) : "\u2014"}
                unit="ms"
                colorClass={metricColor(result.pageSpeed.fieldData.inpMs, 200, 500)}
              />
            </div>
          </div>
        ) : (
          <p className="mt-5 text-[11px] text-text-secondary/70">
            No real-world (CrUX) field data is available for this origin — not enough recorded
            Chrome traffic for Google to report on. The lab metrics above are the best available
            signal.
          </p>
        )}

        {result.pageSpeed.topIssues.length > 0 && (
          <div className="mt-5 space-y-2">
            <p className="text-xs font-mono text-text-secondary uppercase tracking-wide">Top Lighthouse issues</p>
            {result.pageSpeed.topIssues.map((issue) => (
              <div key={issue.id} className="text-xs sm:text-sm">
                <span className="font-medium">{issue.title}:</span>{" "}
                <span className="text-text-secondary">{issue.description}</span>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </section>
  );
}
