"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Check, Copy, MapPin, Wrench } from "lucide-react";
import { AuditResult, Tone } from "@/lib/types";

function DiffLine({ line }: { line: string }) {
  if (line.startsWith("+")) {
    return <div className="text-emerald bg-emerald/10 px-3 py-0.5">{line}</div>;
  }
  if (line.startsWith("-")) {
    return <div className="text-rose bg-rose/10 px-3 py-0.5">{line}</div>;
  }
  return <div className="text-text-secondary px-3 py-0.5">{line}</div>;
}

export default function DiffFixes({ result, tone }: { result: AuditResult; tone: Tone }) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  function copy(id: string, snippet: string) {
    navigator.clipboard?.writeText(snippet).catch(() => {});
    setCopiedId(id);
    setTimeout(() => setCopiedId((c) => (c === id ? null : c)), 1600);
  }

  return (
    <section className="px-6 py-10">
      <div className="max-w-4xl mx-auto">
        <h2 className="font-display font-semibold text-2xl mb-1">Priority Fixes</h2>
        <p className="text-text-secondary text-sm mb-6">
          Your lowest-scoring areas, with exact code and copy to ship.
        </p>

        <div className="space-y-4">
          {result.fixes.map((fix, i) => (
            <motion.div
              key={fix.id}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ delay: i * 0.05 }}
              className="glass rounded-2xl p-5 sm:p-6"
            >
              <div className="flex items-center justify-between gap-3 mb-3">
                <span className="text-xs font-mono px-2.5 py-1 rounded-full bg-primary/15 text-primary">
                  {fix.category}
                </span>
              </div>

              <div className="flex items-start gap-2 text-sm text-text-secondary mb-2">
                <MapPin size={14} className="mt-0.5 shrink-0" />
                <span>{fix.target}</span>
              </div>

              <p className="text-sm sm:text-base mb-3">
                {tone === "brutal" ? fix.problem.brutal : fix.problem.constructive}
              </p>

              <div className="flex items-start gap-2 text-sm mb-3">
                <Wrench size={14} className="mt-0.5 shrink-0 text-emerald" />
                <span className="text-text-secondary">{fix.fix}</span>
              </div>

              <div className="relative rounded-xl overflow-hidden border border-border bg-black/40">
                <div className="flex items-center justify-between px-3 py-2 border-b border-border">
                  <span className="text-[11px] font-mono text-text-secondary uppercase">{fix.language}</span>
                  <button
                    onClick={() => copy(fix.id, fix.snippet)}
                    className="flex items-center gap-1.5 text-xs font-mono text-text-secondary hover:text-primary transition"
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
                <pre className="text-xs sm:text-[13px] font-mono overflow-x-auto py-2">
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
