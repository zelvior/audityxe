"use client";

import { motion } from "framer-motion";
import { AuditResult } from "@/lib/types";
import AuditActionBar from "./AuditActionBar";

function colorFor(score: number) {
  if (score >= 8) return { bar: "bg-emerald", text: "text-emerald", ring: "rgb(var(--color-emerald))" };
  if (score >= 5) return { bar: "bg-amber", text: "text-amber", ring: "rgb(var(--color-amber))" };
  return { bar: "bg-rose", text: "text-rose", ring: "rgb(var(--color-rose))" };
}

export default function ScoreCard({ result }: { result: AuditResult }) {
  const overallColor = colorFor(result.overall);
  const circumference = 2 * Math.PI * 54;
  const dash = (result.overall / 10) * circumference;

  return (
    <section className="px-4 sm:px-6 py-6 sm:py-10">
      <div className="max-w-4xl mx-auto glass rounded-card p-4 sm:p-6 md:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8">
          <div className="min-w-0">
            <p className="text-xs font-mono text-text-secondary">AUDIT RESULT FOR</p>
            <p className="font-display font-semibold text-lg sm:text-xl break-all">{result.url}</p>
          </div>
          <AuditActionBar result={result} />
        </div>

        <div className="flex flex-col sm:flex-row gap-6 sm:gap-8 items-center sm:items-start mb-8 sm:mb-10">
          <div className="relative w-28 h-28 sm:w-36 sm:h-36 shrink-0">
            <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
              <circle cx="60" cy="60" r="54" fill="none" stroke="rgb(var(--color-border))" strokeWidth="10" />
              <motion.circle
                cx="60"
                cy="60"
                r="54"
                fill="none"
                stroke={overallColor.ring}
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={circumference}
                initial={{ strokeDashoffset: circumference }}
                animate={{ strokeDashoffset: circumference - dash }}
                transition={{ duration: 1, ease: "easeOut" }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-display font-bold text-2xl sm:text-3xl">{result.overall.toFixed(1)}</span>
              <span className="text-xs text-text-secondary font-mono">/ 10</span>
            </div>
          </div>

          <div className="flex-1 text-center sm:text-left min-w-0">
            <p className={`font-display font-semibold text-base sm:text-lg md:text-xl leading-snug ${overallColor.text}`}>
              <span className="hand-underline hand-underline--alt">{result.verdict}</span>
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {result.categories.map((cat, i) => {
            const c = colorFor(cat.score);
            return (
              <div key={cat.key}>
                <div className="flex items-center justify-between gap-2 text-xs sm:text-sm mb-1.5">
                  <span className="text-text-secondary truncate">{cat.label}</span>
                  <span className={`font-mono font-semibold shrink-0 ${c.text}`}>{cat.score.toFixed(1)}</span>
                </div>
                <div className="h-2 rounded-full bg-surface2 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${cat.score * 10}%` }}
                    transition={{ duration: 0.8, delay: i * 0.06, ease: "easeOut" }}
                    className={`h-full rounded-full ${c.bar}`}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {result.siteContext && (
          <p className="text-[11px] text-text-secondary/70 mb-4">
            Detected as: <span className="text-text-secondary">{result.siteContext.label}</span>
            {result.siteContext.confidence && result.siteContext.confidence !== "high" && (
              <span className="ml-1 px-1.5 py-0.5 rounded bg-surface2 text-text-secondary/80 font-mono text-[9px] align-middle">
                {result.siteContext.confidence.toUpperCase()} CONFIDENCE
              </span>
            )}
          </p>
        )}

        {result.scoringMethodology && (
          <details className="mb-2 group">
            <summary className="text-[11px] font-mono text-text-secondary/70 cursor-pointer select-none list-none flex items-center gap-1">
              <span className="group-open:rotate-90 transition-transform inline-block">›</span> How is this score calculated?
            </summary>
            <p className="text-[11px] text-text-secondary/70 mt-2 leading-relaxed">{result.scoringMethodology}</p>
          </details>
        )}
      </div>
    </section>
  );
}
