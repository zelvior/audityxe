"use client";

import { motion } from "framer-motion";
import { Link2, ShieldCheck, Search, Gauge, Accessibility, FileCode2, Sparkles } from "lucide-react";

// Simple left-to-right funnel: one input, three parallel checks stacked
// vertically, all converging on a single results card. Every arrow only
// ever moves left→right so none of them can cross each other.
const CHECKS = [
  { icon: ShieldCheck, label: "Security Check", y: 12 },
  { icon: Search, label: "SEO Scan", y: 96 },
  { icon: Gauge, label: "Performance", y: 180 },
  { icon: Accessibility, label: "Accessibility", y: 264 },
];

const INPUT_Y = 138;
const RESULT_Y = 138;
const INPUT_X = 8;
const CHECK_X = 176;
const RESULT_X = 330;

const pop = {
  hidden: { opacity: 0, scale: 0.85, y: 6 },
  show: (i: number) => ({
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { delay: 0.25 + i * 0.09, duration: 0.4, ease: "easeOut" as const },
  }),
};

export default function HeroVisual() {
  return (
    <div className="hidden lg:flex w-full h-[360px] items-center justify-center select-none" aria-hidden="true">
      {/* Fixed-size coordinate box, exactly 420×320 — matching the SVG's
          viewBox 1:1. The connecting arrows are drawn in SVG viewBox
          units while the nodes are plain HTML divs positioned with raw
          CSS-pixel left/top values; if this box weren't pinned to the
          same 420×320 size, the SVG (scaled to fill whatever width the
          grid column happened to give it) and the divs (never scaled)
          would drift apart the moment the container wasn't exactly
          420px wide — which is exactly what caused the disconnected,
          looping arrows before this fix. */}
      <div className="relative w-[420px] h-[320px] shrink-0">
        <svg width={420} height={320} viewBox="0 0 420 320" className="absolute inset-0 overflow-visible" fill="none">
          <defs>
            <marker id="hv-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="4.5" markerHeight="4.5" orient="auto-start-reverse">
              <path d="M2 1L8 5L2 9" stroke="#4B4166" strokeWidth="1.5" fill="none" strokeLinecap="round" />
            </marker>
          </defs>

          {/* input → each check */}
          {CHECKS.map((c, i) => (
            <motion.path
              key={`in-${c.label}`}
              d={`M${INPUT_X + 70} ${INPUT_Y + 14} C ${INPUT_X + 120} ${INPUT_Y + 14}, ${CHECK_X - 40} ${c.y + 14}, ${CHECK_X - 6} ${c.y + 14}`}
              stroke="#3A3350"
              strokeWidth="1.5"
              markerEnd="url(#hv-arrow)"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ delay: 0.5 + i * 0.08, duration: 0.55 }}
            />
          ))}

          {/* each check → results */}
          {CHECKS.map((c, i) => (
            <motion.path
              key={`out-${c.label}`}
              d={`M${CHECK_X + 128} ${c.y + 14} C ${CHECK_X + 178} ${c.y + 14}, ${RESULT_X - 40} ${RESULT_Y + 24}, ${RESULT_X - 4} ${RESULT_Y + 24}`}
              stroke="#3A3350"
              strokeWidth="1.5"
              markerEnd="url(#hv-arrow)"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ delay: 0.85 + i * 0.08, duration: 0.55 }}
            />
          ))}
        </svg>

        {/* URL input node */}
        <motion.div
          initial={{ opacity: 0, scale: 0.85, y: 6 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.4, ease: "easeOut" }}
          className="absolute glass rounded-card px-3.5 py-2.5 flex items-center gap-2 shadow-glow"
          style={{ left: INPUT_X, top: INPUT_Y }}
        >
          <Link2 size={14} className="text-primary shrink-0" />
          <span className="text-[11px] font-mono text-text-secondary whitespace-nowrap">URL Input</span>
        </motion.div>

        {/* four parallel check nodes */}
        {CHECKS.map(({ icon: Icon, label, y }, i) => (
          <motion.div
            key={label}
            custom={i}
            initial="hidden"
            animate="show"
            variants={pop}
            className="absolute glass rounded-card px-3.5 py-2.5 flex items-center gap-2 shadow-glow"
            style={{ left: CHECK_X, top: y }}
          >
            <Icon size={14} className="text-primary shrink-0" />
            <span className="text-[11px] font-mono text-text-secondary whitespace-nowrap">{label}</span>
          </motion.div>
        ))}

        {/* results node */}
        <motion.div
          initial={{ opacity: 0, scale: 0.85, y: 6 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ delay: 1.15, duration: 0.45, ease: "easeOut" }}
          className="absolute glass rounded-card px-4 py-3 flex items-center gap-2 shadow-glow border-primary/30"
          style={{ left: RESULT_X, top: RESULT_Y }}
        >
          <FileCode2 size={15} className="text-accent shrink-0" />
          <div className="leading-tight">
            <p className="text-[11px] font-semibold text-text-primary">Results</p>
            <p className="text-[10px] font-mono text-text-secondary">Score + fixes</p>
          </div>
        </motion.div>

        <motion.div
          animate={{ y: [0, -5, 0] }}
          transition={{ delay: 1.8, duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
          className="absolute rounded-full bg-accent/15 border border-accent/30 p-2"
          style={{ left: RESULT_X + 28, top: RESULT_Y - 34 }}
        >
          <Sparkles size={14} className="text-accent" />
        </motion.div>
      </div>
    </div>
  );
}
