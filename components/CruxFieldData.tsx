import { CruxSummary } from "@/lib/types";

const VERDICT_STYLE: Record<string, { text: string; bg: string; label: string }> = {
  good: { text: "text-emerald", bg: "bg-emerald/10 border-emerald/20", label: "Good" },
  "needs-improvement": { text: "text-amber", bg: "bg-amber/10 border-amber/20", label: "Needs improvement" },
  poor: { text: "text-rose", bg: "bg-rose/10 border-rose/20", label: "Poor" },
};

function formatValue(unit: "ms" | "score", p75: number): string {
  if (unit === "ms") return p75 >= 1000 ? `${(p75 / 1000).toFixed(2)}s` : `${Math.round(p75)}ms`;
  return p75.toFixed(2);
}

/**
 * Real-user Core Web Vitals from Chrome's own telemetry (lib/crux.ts) —
 * field data from actual visitors over the past 28 days, distinct from
 * the simulated Lighthouse pass. This was being computed on every
 * audit and attached to the result object, but nothing in the UI ever
 * rendered it — this component is what actually surfaces it.
 */
export default function CruxFieldData({ crux }: { crux: CruxSummary }) {
  if (!crux.available || crux.metrics.length === 0) {
    // Only worth a line when there's a specific, actionable reason —
    // "not_configured" (no BYOK/env key set up at all) isn't the
    // visitor's concern and is silently skipped rather than shown as
    // if something's broken.
    if (crux.reason === "no_data") {
      return (
        <div className="glass rounded-card p-4 sm:p-5 text-sm text-text-secondary">
          <p className="font-semibold text-text-primary mb-1">Real-world Core Web Vitals</p>
          <p>
            Not enough recorded Chrome traffic for Google to publish field data on this origin yet.
            The lab-based metrics above are the best available signal for now.
          </p>
        </div>
      );
    }
    return null;
  }

  return (
    <div className="glass rounded-card p-4 sm:p-5">
      <div className="flex items-center justify-between mb-1">
        <p className="text-sm font-semibold">Real-world Core Web Vitals</p>
        <span className="text-xs text-text-secondary font-mono">CrUX · past 28 days</span>
      </div>
      <p className="text-xs text-text-secondary mb-4">
        From actual Chrome users who visited {crux.origin}, not a single simulated run — the
        higher-confidence number where it diverges from the lab metrics above.
        {crux.collectionPeriod?.lastDate && ` Last updated ${crux.collectionPeriod.lastDate}.`}
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {crux.metrics.map((m) => {
          const style = VERDICT_STYLE[m.verdict];
          return (
            <div key={m.id} className={`rounded-card border p-3 ${style.bg}`}>
              <p className="text-[11px] text-text-secondary uppercase tracking-wide mb-1">{m.label}</p>
              <p className={`text-lg font-bold font-mono ${style.text}`}>{formatValue(m.unit, m.p75)}</p>
              <p className={`text-[11px] mt-0.5 ${style.text}`}>{style.label}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
