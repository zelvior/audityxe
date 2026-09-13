"use client";

import { motion } from "framer-motion";
import { Link2, ShieldCheck, Search, Gauge, Accessibility, FileCode2, Sparkles, BarChart3 } from "lucide-react";

// Simple left-to-right funnel: one input, three parallel checks stacked
// vertically, all converging on a single results card. Every arrow only
// ever moves left→right so none of them can cross each other.
const CHECKS = [
  { icon: ShieldCheck, label: "Security Check", y: 4 },
  { icon: Search, label: "SEO Scan", y: 76 },
  { icon: Gauge, label: "Performance", y: 148 },
  { icon: BarChart3, label: "Lighthouse Audit", y: 220 },
  { icon: Accessibility, label: "Accessibility", y: 292 },
];

const INPUT_Y = 152;
const RESULT_Y = 152;
const INPUT_X = 8;
const CHECK_X = 176;
const RESULT_X = 344;
const CHECK_NODE_W = 128; // matches the fixed-width check node box below
const RESULT_NODE_W = 108; // fixed width so the box can never overflow the canvas
const CANVAS_W = 480; // widened from 420 — RESULT_X + RESULT_NODE_W + margin no longer clips

/** Cubic-bezier control points placed at fixed fractions along the
 * straight line between start and end, for both x AND y. This is what
 * actually prevents the connector loops: any scheme where a control
 * point's x can end up past (or before) the OTHER control point's x
 * makes the curve double back on itself before reaching the end point
 * — exactly what happened before, when the check→results curves used
 * fixed pixel offsets that overshot past the (short, close-together)
 * results node for the top and bottom rows. Fractional placement keeps
 * both control points strictly between start and end for every row,
 * regardless of how far apart the two nodes are. */
function smoothPath(x1: number, y1: number, x2: number, y2: number): string {
  const c1x = x1 + (x2 - x1) * 0.45;
  const c2x = x1 + (x2 - x1) * 0.55;
  return `M${x1} ${y1} C ${c1x} ${y1}, ${c2x} ${y2}, ${x2} ${y2}`;
}

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
    <div className="hidden lg:flex w-full h-[360px] items-center justify-center select-none overflow-hidden" aria-hidden="true">
      {/* Fixed-size coordinate box, exactly CANVAS_W×360 — matching the
          SVG's viewBox 1:1. The connecting arrows are drawn in SVG
          viewBox units while the nodes are plain HTML divs positioned
          with raw CSS-pixel left/top values; if this box weren't pinned
          to the same size as the viewBox, the SVG (scaled to fill
          whatever width the grid column happened to give it) and the
          divs (never scaled) would drift apart the moment the container
          wasn't exactly CANVAS_W px wide. The Results node previously
          had no explicit width, so its actual rendered size (icon + two
          lines of text + padding) came out wider than the room left for
          it at RESULT_X in a 420px canvas — it overflowed and got
          clipped at the frame edge. Fixed by giving it an explicit
          RESULT_NODE_W and widening the canvas so RESULT_X +
          RESULT_NODE_W comfortably fits with margin to spare.
          Separately, the check→results connectors used to loop back on
          themselves because their bezier control points used fixed
          pixel offsets that could land past each other on the short
          top/bottom rows — smoothPath() below fixes that by placing
          both control points at fixed fractions of the actual distance
          instead. */}
      <div className="relative shrink-0" style={{ width: CANVAS_W, height: 360 }}>
        <svg width={CANVAS_W} height={360} viewBox={`0 0 ${CANVAS_W} 360`} className="absolute inset-0 overflow-visible" fill="none">
          <defs>
            <marker id="hv-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="4.5" markerHeight="4.5" orient="auto-start-reverse">
              <path d="M2 1L8 5L2 9" stroke="#4B4166" strokeWidth="1.5" fill="none" strokeLinecap="round" />
            </marker>
          </defs>

          {/* input → each check */}
          {CHECKS.map((c, i) => (
            <motion.path
              key={`in-${c.label}`}
              d={smoothPath(INPUT_X + 70, INPUT_Y + 14, CHECK_X - 6, c.y + 14)}
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
              d={smoothPath(CHECK_X + CHECK_NODE_W, c.y + 14, RESULT_X - 4, RESULT_Y + 24)}
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
            style={{ left: CHECK_X, top: y, width: CHECK_NODE_W }}
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
          className="absolute glass rounded-card px-3.5 py-2.5 flex items-center gap-2 shadow-glow border-primary/30"
          style={{ left: RESULT_X, top: RESULT_Y, width: RESULT_NODE_W }}
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
          style={{ left: RESULT_X + RESULT_NODE_W / 2 - 14, top: RESULT_Y - 34 }}
        >
          <Sparkles size={14} className="text-accent" />
        </motion.div>
      </div>
    </div>
  );
}
