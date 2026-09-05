"use client";

import { motion } from "framer-motion";
import { Swords } from "lucide-react";
import { AuditResult } from "@/lib/types";

export default function CompetitorBattle({ result }: { result: AuditResult }) {
  if (!result.competitor) return null;
  const { competitor } = result;
  const youWin = result.overall >= competitor.overall;

  return (
    <section className="px-4 sm:px-6 py-6 sm:py-10">
      <div className="max-w-4xl mx-auto">
        <h2 className="font-display font-semibold text-xl sm:text-2xl mb-1 flex items-center gap-2">
          <Swords size={18} className="text-accent shrink-0" /> Head-to-Head Battle
        </h2>
        <p className="text-text-secondary text-xs sm:text-sm mb-5 sm:mb-6 break-words">
          {result.url} vs {competitor.url}
        </p>

        <div className="glass rounded-card p-4 sm:p-6 md:p-8">
          <div className="grid grid-cols-2 gap-3 sm:gap-6 mb-6 sm:mb-8">
            <div className={`text-center p-3 sm:p-5 rounded-card min-w-0 ${youWin ? "bg-emerald/10 border border-emerald/30" : "bg-surface2 border border-border"}`}>
              <p className="text-[10px] sm:text-xs font-mono text-text-secondary mb-1 truncate">{result.url}</p>
              <p className="font-display font-bold text-2xl sm:text-4xl">{result.overall.toFixed(1)}</p>
            </div>
            <div className={`text-center p-3 sm:p-5 rounded-card min-w-0 ${!youWin ? "bg-emerald/10 border border-emerald/30" : "bg-surface2 border border-border"}`}>
              <p className="text-[10px] sm:text-xs font-mono text-text-secondary mb-1 truncate">{competitor.url}</p>
              <p className="font-display font-bold text-2xl sm:text-4xl">{competitor.overall.toFixed(1)}</p>
            </div>
          </div>

          <div className="space-y-4 mb-6">
            {result.categories.map((cat, i) => {
              const comp = competitor.categories[i];
              const total = cat.score + comp.score || 1;
              const leftPct = (cat.score / total) * 100;
              return (
                <div key={cat.key}>
                  <div className="flex justify-between gap-1 text-[10px] sm:text-xs font-mono text-text-secondary mb-1">
                    <span className="shrink-0">{cat.score.toFixed(1)}</span>
                    <span className="truncate text-center">{cat.label}</span>
                    <span className="shrink-0">{comp.score.toFixed(1)}</span>
                  </div>
                  <div className="h-2 rounded-full bg-surface2 overflow-hidden flex">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${leftPct}%` }}
                      transition={{ duration: 0.7, delay: i * 0.05 }}
                      className="h-full bg-primary"
                    />
                    <div className="h-full bg-accent flex-1" />
                  </div>
                </div>
              );
            })}
          </div>

          {competitor.summary.length > 0 && (
            <div className="border-t border-border pt-5 space-y-2">
              {competitor.summary.map((line, i) => (
                <p key={i} className="text-xs sm:text-sm text-text-secondary flex items-start gap-2 break-words">
                  <span className="text-primary mt-1 shrink-0">•</span> {line}
                </p>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
