"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Check, Copy, MapPin, Wrench, Search } from "lucide-react";
import { AuditResult } from "@/lib/types";

function DiffLine({ line }: { line: string }) {
  if (line.startsWith("+")) {
    return <div className="text-emerald bg-emerald/10 px-3 py-0.5">{line}</div>;
  }
  if (line.startsWith("-")) {
    return <div className="text-rose bg-rose/10 px-3 py-0.5">{line}</div>;
  }
  return <div className="text-text-secondary px-3 py-0.5">{line}</div>;
}

/** The rendered snippet is diff-formatted (+/- markers) for readability,
 * but pasting that literally into a real file would break it — the "+"
 * characters aren't part of the actual code. This extracts the clean,
 * paste-ready version: keeps added/context lines, drops removed lines,
 * and strips the leading diff marker. */
function cleanSnippetForCopy(snippet: string): string {
  const lines = snippet.split("\n");
  const hasMarkers = lines.some((l) => l.startsWith("+") || l.startsWith("-"));
  if (!hasMarkers) return snippet;
  return lines
    .filter((l) => !l.startsWith("-"))
    .map((l) => (l.startsWith("+") ? l.slice(1).replace(/^ /, "") : l))
    .join("\n");
}

export default function DiffFixes({ result }: { result: AuditResult }) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  function copy(id: string, snippet: string) {
    navigator.clipboard?.writeText(cleanSnippetForCopy(snippet)).catch(() => {});
    setCopiedId(id);
    setTimeout(() => setCopiedId((c) => (c === id ? null : c)), 1600);
  }

  return (
    <section className="px-4 sm:px-6 py-6 sm:py-10">
      <div className="max-w-4xl mx-auto">
        <h2 className="font-display font-semibold text-xl sm:text-2xl mb-1">Priority Fixes</h2>
        <p className="text-text-secondary text-xs sm:text-sm mb-5 sm:mb-6">
          Your lowest-scoring areas, with real evidence and exact code to ship.
        </p>

        <div className="space-y-4">
          {result.fixes.length === 0 && (
            <div className="glass rounded-card p-6 sm:p-8 text-center">
              <p className="text-sm sm:text-base font-medium mb-1">
                No urgent fixes found on this pass.
              </p>
              <p className="text-xs sm:text-sm text-text-secondary">
                None of the specific problems we check for were detected on this page. That
                doesn't guarantee perfection, see the{" "}
                <a href="/methodology" className="text-primary hover:underline">
                  methodology
                </a>{" "}
                for what we can and can't measure, but it's a genuinely good sign.
              </p>
            </div>
          )}
          {result.fixes.map((fix, i) => (
            <motion.div
              key={fix.id}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ delay: i * 0.05 }}
              className="glass rounded-card p-4 sm:p-6"
            >
              <div className="flex items-center justify-between gap-3 mb-3">
                <span className="text-[10px] sm:text-xs font-mono px-2.5 py-1 rounded-full bg-primary/15 text-primary">
                  {fix.category}
                </span>
              </div>

              <div className="flex items-start gap-2 text-xs sm:text-sm text-text-secondary mb-2">
                <MapPin size={14} className="mt-0.5 shrink-0" />
                <span className="break-words">{fix.target}</span>
              </div>

              <p className="text-sm sm:text-base mb-3 break-words">{fix.problem}</p>

              {fix.evidence && (
                <div className="flex items-start gap-2 text-xs sm:text-sm mb-3 bg-surface2/60 rounded-lg px-3 py-2">
                  <Search size={13} className="mt-0.5 shrink-0 text-primary" />
                  <span className="text-text-secondary break-words">
                    <span className="font-semibold text-text-primary">Evidence: </span>
                    {fix.evidence}
                  </span>
                </div>
              )}

              <div className="flex items-start gap-2 text-xs sm:text-sm mb-3">
                <Wrench size={14} className="mt-0.5 shrink-0 text-emerald" />
                <span className="text-text-secondary break-words">{fix.fix}</span>
              </div>

              <div className="relative rounded-card overflow-hidden border border-border bg-black/40">
                <div className="flex items-center justify-between px-3 py-2 border-b border-border">
                  <span className="text-[10px] sm:text-[11px] font-mono text-text-secondary uppercase">{fix.language}</span>
                  <button
                    onClick={() => copy(fix.id, fix.snippet)}
                    className="flex items-center gap-1.5 text-[11px] sm:text-xs font-mono text-text-secondary hover:text-primary transition shrink-0"
                  >
                    {copiedId === fix.id ? (
                      <>
                        <Check size={12} className="text-emerald" /> Copied
                      </>
                    ) : (
                      <>
                        <Copy size={12} /> Copy code
                      </>
                    )}
                  </button>
                </div>
                <pre className="text-[11px] sm:text-[13px] font-mono overflow-x-auto py-2 max-w-full">
                  {fix.snippet.split("\n").map((line, idx) => (
                    <DiffLine key={idx} line={line} />
                  ))}
                </pre>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
