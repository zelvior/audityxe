"use client";

import { motion } from "framer-motion";
import { Link2, ShieldCheck, Search, Gauge, Accessibility, FileCode2, Sparkles, BarChart3 } from "lucide-react";

// Left-to-right pipeline: one input fans out to five parallel checks,
// which all merge onto a single vertical bus before one clean line
// continues to the results node. The fan-out on the left already never
// crossed (five distinct targets spread across CHECK_X). The old
// fan-IN on the right converged every one of the five outgoing curves
// onto the exact same pixel next to the results node — with five
// curves all sharing one end point and one final tangent, they bunched
// into a visible knot right where the arrowheads met, which read as
// "congested" rather than as a deliberate flow. Routing them onto a
// merge bus instead means each of the five lines is a plain straight
// horizontal segment at its own y (impossible to cross another one),
// and only a single line — the one anyone's eye actually needs to
// follow into the result — curves and carries an arrowhead.
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
const CHECK_NODE_W = 152;
const MERGE_X = 384; // vertical bus the five checks join onto
const RESULT_X = 448;
const RESULT_NODE_W = 132;
const CANVAS_W = 616; // RESULT_X + RESULT_NODE_W + margin

// y-centers of each check row (matches the +14 icon-center offset used
// on every node below) and the bus's own vertical span/midpoint —
// computed once instead of hand-copied, so CHECKS stays the single
// source of truth for row position.
const ROW_CENTERS = CHECKS.map((c) => c.y + 14);
const BUS_TOP = ROW_CENTERS[0];
const BUS_BOTTOM = ROW_CENTERS[ROW_CENTERS.length - 1];
const BUS_MID = (BUS_TOP + BUS_BOTTOM) / 2;

/** Cubic-bezier control points placed at fixed fractions along the
 * straight line between start and end, for both x AND y. Keeping both
 * control points strictly between the two endpoints is what prevents a
 * curve from looping back on itself — a fixed pixel offset can overshoot
 * past a nearby node on a short row; a fractional offset can't. */
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

/** Small colored icon chip — the "node port" look every real workflow
 * tool (n8n, Zapier, Make) uses instead of a bare icon, so each step
 * reads as a distinct block rather than just an icon floating next to
 * text. */
function IconChip({ icon: Icon, tone = "primary" }: { icon: typeof Link2; tone?: "primary" | "accent" }) {
  return (
    <span
      className={`flex items-center justify-center w-6 h-6 rounded-[7px] shrink-0 ${
        tone === "accent" ? "bg-accent/15 border border-accent/25" : "bg-primary/12 border border-primary/20"
      }`}
    >
      <Icon size={13} className={tone === "accent" ? "text-accent" : "text-primary"} />
    </span>
  );
}

export default function HeroVisual() {
  return (
    <div
      className="hidden lg:flex w-full h-[360px] items-center justify-center select-none overflow-visible"
      aria-hidden="true"
    >
      {/* Fixed-size coordinate box, exactly CANVAS_W×360 — matching the
          SVG's viewBox 1:1. Everything inside (SVG connectors + HTML
          node divs) is laid out in the same raw-pixel coordinate space,
          then the WHOLE box is scaled down as one unit via CSS
          transform at narrower `lg`/`xl` widths where the actual grid
          column is narrower than CANVAS_W. Because it's a single
          uniform transform on the shared parent, the SVG and the divs
          can never drift apart relative to each other regardless of
          scale — only their real on-screen size changes. */}
      <div
        className="relative shrink-0 hv-scale"
        style={{ width: CANVAS_W, height: 360 }}
      >
        <svg width={CANVAS_W} height={360} viewBox={`0 0 ${CANVAS_W} 360`} className="absolute inset-0 overflow-visible" fill="none">
          <defs>
            <marker id="hv-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="4.5" markerHeight="4.5" orient="auto-start-reverse">
              <path d="M2 1L8 5L2 9" stroke="#3A434C" strokeWidth="1.5" fill="none" strokeLinecap="round" />
            </marker>
          </defs>

          {/* input → each check (fan-out, five distinct targets — never crosses) */}
          {CHECKS.map((c, i) => (
            <motion.path
              key={`in-${c.label}`}
              d={smoothPath(INPUT_X + 70, INPUT_Y + 14, CHECK_X - 6, c.y + 14)}
              stroke="#3A434C"
              strokeWidth="1.5"
              markerEnd="url(#hv-arrow)"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ delay: 0.5 + i * 0.08, duration: 0.55 }}
            />
          ))}

          {/* each check → merge bus: plain straight lines, each at its
              own y, so five of them can share a target x without ever
              overlapping one another. */}
          {CHECKS.map((c, i) => (
            <motion.line
              key={`bus-${c.label}`}
              x1={CHECK_X + CHECK_NODE_W}
              y1={c.y + 14}
              x2={MERGE_X}
              y2={c.y + 14}
              stroke="#3A434C"
              strokeWidth="1.5"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ delay: 0.85 + i * 0.08, duration: 0.4 }}
            />
          ))}

          {/* the bus itself — a single vertical spine joining the five
              rows, with a small dot at each junction. */}
          <motion.line
            x1={MERGE_X}
            y1={BUS_TOP}
            x2={MERGE_X}
            y2={BUS_BOTTOM}
            stroke="#3A434C"
            strokeWidth="1.5"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ delay: 1.15, duration: 0.35 }}
          />
          {ROW_CENTERS.map((cy, i) => (
            <motion.circle
              key={`dot-${i}`}
              cx={MERGE_X}
              cy={cy}
              r={2.5}
              fill="#3A434C"
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 1.2 + i * 0.05, duration: 0.25 }}
            />
          ))}

          {/* the one line anyone's eye needs to follow: bus center → results */}
          <motion.path
            d={smoothPath(MERGE_X, BUS_MID, RESULT_X - 4, RESULT_Y + 24)}
            stroke="#4ADE80"
            strokeOpacity={0.55}
            strokeWidth="1.75"
            markerEnd="url(#hv-arrow)"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ delay: 1.45, duration: 0.5 }}
          />
        </svg>

        {/* URL input node */}
        <motion.div
          initial={{ opacity: 0, scale: 0.85, y: 6 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.4, ease: "easeOut" }}
          className="absolute glass border border-white/[0.06] rounded-card px-3.5 py-3 flex items-center gap-2.5 shadow-glow"
          style={{ left: INPUT_X, top: INPUT_Y }}
        >
          <IconChip icon={Link2} />
          <span className="text-[11px] font-mono text-text-secondary whitespace-nowrap">URL Input</span>
        </motion.div>

        {/* five parallel check nodes */}
        {CHECKS.map(({ icon: Icon, label, y }, i) => (
          <motion.div
            key={label}
            custom={i}
            initial="hidden"
            animate="show"
            variants={pop}
            className="absolute glass border border-white/[0.06] rounded-card px-3.5 py-3 flex items-center gap-2.5 shadow-glow"
            style={{ left: CHECK_X, top: y, width: CHECK_NODE_W }}
          >
            <IconChip icon={Icon} />
            <span className="text-[11px] font-mono text-text-secondary whitespace-nowrap">{label}</span>
          </motion.div>
        ))}

        {/* results node */}
        <motion.div
          initial={{ opacity: 0, scale: 0.85, y: 6 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ delay: 1.55, duration: 0.45, ease: "easeOut" }}
          className="absolute glass border border-accent/25 rounded-card px-3.5 py-3 flex items-center gap-2.5 shadow-glow"
          style={{ left: RESULT_X, top: RESULT_Y, width: RESULT_NODE_W }}
        >
          <IconChip icon={FileCode2} tone="accent" />
          <div className="leading-tight min-w-0">
            <p className="text-[11px] font-semibold text-text-primary whitespace-nowrap">Results</p>
            <p className="text-[10px] font-mono text-text-secondary whitespace-nowrap">Score + fixes</p>
          </div>
        </motion.div>

        <motion.div
          animate={{ y: [0, -5, 0] }}
          transition={{ delay: 2.1, duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
          className="absolute rounded-full bg-accent/15 border border-accent/30 p-2"
          style={{ left: RESULT_X + RESULT_NODE_W - 10, top: RESULT_Y - 16 }}
        >
          <Sparkles size={13} className="text-accent" />
        </motion.div>
      </div>

      {/* Uniform scale-down at narrower `lg`/`xl` widths where the grid
          column (max-w-6xl split lg:grid-cols-[1.05fr_0.95fr], gap-6)
          is narrower than CANVAS_W. That column's width plateaus at
          roughly 536px once the viewport is wide enough for the
          max-w-6xl container to hit its cap (~1200px+) — it never gets
          wider than that no matter how large the screen is — so there
          are exactly two real steps, not a third "full size" one that
          would silently overflow again on very wide monitors. Using
          CSS custom properties + a single transform keeps every
          internal coordinate (SVG paths and HTML node positions alike)
          in perfect lockstep at any size, instead of recomputing two
          separate coordinate systems per breakpoint. */}
      <style jsx>{`
        .hv-scale {
          transform: scale(0.7);
        }
        @media (min-width: 1280px) {
          .hv-scale {
            transform: scale(0.83);
          }
        }
      `}</style>
    </div>
  );
}
