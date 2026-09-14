"use client";

import { motion } from "framer-motion";
import { Link2, ShieldCheck, Search, Gauge, Accessibility, FileCode2, Sparkles, BarChart3 } from "lucide-react";

// Left-to-right pipeline: one input fans out to five parallel checks,
// which all merge onto a single vertical bus before one clean line
// continues to the results node.
//
// Rendering precision notes (jagged lines / misaligned intersections):
// the actual cause wasn't the path math — the S-curve bezier formula
// below was already geometrically smooth and the orthogonal bus
// segments were already exact straight lines with mathematically
// identical y-coordinates to their source rows. What made them look
// rough was the CSS `scale()` transform applied to the whole canvas at
// narrower widths (see .hv-scale below): scaling a declared
// strokeWidth down to a non-integer device-pixel value is what most
// browsers anti-alias poorly, reading as "jagged". Fixing that at the
// source: every line/path now sets `vector-effect="non-scaling-stroke"`
// (keeps the stroke rendered at its true declared width regardless of
// the parent's CSS scale) plus a `shape-rendering` hint tuned per
// element — `crispEdges` for the perfectly axis-aligned bus segments
// and spine (sharpest possible rendering for straight horizontal/
// vertical lines), `geometricPrecision` for the curved beziers (best
// anti-aliasing for curves; crispEdges would make a curve look
// staircased instead). The five check-row y-centers, the merge bus's
// x, and the five junction dots all derive from the same ROW_CENTERS/
// MERGE_X constants below, so the intersections are exact by
// construction rather than eyeballed.
//
// Muted connectors use the same translucent white for every non-
// highlighted line; only the final bus→results line is the accent
// color, with its own matching accent-colored arrowhead marker (it
// previously shared the muted marker, so its arrowhead didn't match
// its own line color).
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
        <svg
          width={CANVAS_W}
          height={360}
          viewBox={`0 0 ${CANVAS_W} 360`}
          className="absolute inset-0 overflow-visible"
          fill="none"
          shapeRendering="geometricPrecision"
        >
          <defs>
            <marker id="hv-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="4.5" markerHeight="4.5" orient="auto-start-reverse">
              <path d="M2 1L8 5L2 9" stroke="rgb(var(--color-text-primary) / 0.18)" strokeWidth="1.5" fill="none" strokeLinecap="round" shapeRendering="geometricPrecision" />
            </marker>
            <marker id="hv-arrow-accent" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="4.5" markerHeight="4.5" orient="auto-start-reverse">
              <path d="M2 1L8 5L2 9" stroke="rgb(var(--color-accent))" strokeWidth="1.5" fill="none" strokeLinecap="round" shapeRendering="geometricPrecision" />
            </marker>
            {/* Very light hand-drawn wobble applied only to the fan-out
                and results connectors (the curves), never to the
                perfectly straight/axis-aligned bus segments, which
                should stay crisp schematic lines. */}
            <filter id="hv-rough" x="-20%" y="-20%" width="140%" height="140%">
              <feTurbulence type="fractalNoise" baseFrequency="0.02 0.06" numOctaves="1" seed="4" result="n" />
              <feDisplacementMap in="SourceGraphic" in2="n" scale="2.2" xChannelSelector="R" yChannelSelector="G" />
            </filter>
          </defs>

          {/* input → each check (fan-out, five distinct targets — never
              crosses). Opacity-only, not pathLength: animating
              stroke-dasharray on several SVG paths at once forces the
              browser to recompute path geometry every frame on the
              main thread, which is exactly what was showing up as long
              requestAnimationFrame handlers (65-100ms) on mount —
              opacity animates on the compositor instead, effectively
              free. The one line worth the fancier draw-in effect (the
              final results arrow, below) still gets it; these plain
              connectors don't need it to read as "connected". */}
          {CHECKS.map((c, i) => (
            <motion.path
              key={`in-${c.label}`}
              d={smoothPath(INPUT_X + 70, INPUT_Y + 14, CHECK_X - 6, c.y + 14)}
              stroke="rgb(var(--color-text-primary) / 0.18)"
              strokeWidth="1.5"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
              shapeRendering="geometricPrecision"
              markerEnd="url(#hv-arrow)"
              filter="url(#hv-rough)"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 + i * 0.08, duration: 0.35 }}
            />
          ))}

          {/* each check → merge bus: kept perfectly straight and
              axis-free of the hand-drawn filter — these are the exact
              schematic joins onto the bus, at the exact same y as
              their row, so the junction dots line up precisely. */}
          {CHECKS.map((c, i) => (
            <motion.line
              key={`bus-${c.label}`}
              x1={CHECK_X + CHECK_NODE_W}
              y1={c.y + 14}
              x2={MERGE_X}
              y2={c.y + 14}
              stroke="rgb(var(--color-text-primary) / 0.18)"
              strokeWidth="1.5"
              vectorEffect="non-scaling-stroke"
              shapeRendering="crispEdges"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.85 + i * 0.08, duration: 0.3 }}
            />
          ))}

          {/* the bus itself — a single vertical spine joining the five
              rows, with a small dot at each junction. The five dots
              are one shared motion.g fade instead of five separately
              driven motion.circle instances — same visual result, a
              fifth of the animated-element count. */}
          <motion.line
            x1={MERGE_X}
            y1={BUS_TOP}
            x2={MERGE_X}
            y2={BUS_BOTTOM}
            stroke="rgb(var(--color-text-primary) / 0.18)"
            strokeWidth="1.5"
            vectorEffect="non-scaling-stroke"
            shapeRendering="crispEdges"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.15, duration: 0.3 }}
          />
          <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.3, duration: 0.3 }}>
            {ROW_CENTERS.map((cy, i) => (
              <circle key={`dot-${i}`} cx={MERGE_X} cy={cy} r={2.5} fill="rgb(var(--color-text-primary) / 0.35)" shapeRendering="geometricPrecision" />
            ))}
          </motion.g>

          {/* the one line anyone's eye needs to follow: bus center →
              results — the single element that keeps the pathLength
              draw-in, since it's the one moment worth the extra cost. */}
          <motion.path
            d={smoothPath(MERGE_X, BUS_MID, RESULT_X - 4, RESULT_Y + 24)}
            stroke="rgb(var(--color-accent))"
            strokeOpacity={0.85}
            strokeWidth="1.75"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
            shapeRendering="geometricPrecision"
            markerEnd="url(#hv-arrow-accent)"
            filter="url(#hv-rough)"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ delay: 1.45, duration: 0.5 }}
          />

          {/* Continuous "live" signal: a small comet-like pulse travels
              from URL Input, through each check, along the bus, and out
              to Results, on a loop — this is what actually reads as
              "alive" rather than a one-shot entrance animation. Uses
              SVG's native offset-path/offset-distance (motion path)
              instead of manually animating cx/cy per frame, so it's a
              compositor-driven animation, not a layout recalculation. */}
          {CHECKS.map((c, i) => {
            const fanPath = smoothPath(INPUT_X + 70, INPUT_Y + 14, CHECK_X - 6, c.y + 14);
            return (
              <circle
                key={`pulse-fan-${c.label}`}
                r="2.4"
                fill="rgb(var(--color-primary))"
                style={{
                  offsetPath: `path("${fanPath}")`,
                  offsetRotate: "0deg",
                  animation: `hv-travel 2.6s ${1.9 + i * 0.35}s linear infinite`,
                }}
              />
            );
          })}
          <circle
            r="2.6"
            fill="rgb(var(--color-accent))"
            style={{
              offsetPath: `path("${smoothPath(MERGE_X, BUS_MID, RESULT_X - 4, RESULT_Y + 24)}")`,
              offsetRotate: "0deg",
              animation: "hv-travel 1.4s 3.6s linear infinite",
            }}
          />
        </svg>

        {/* sequential glow sweeping through the five checks, looping —
            reads as "actively scanning" rather than a static list. */}
        {CHECKS.map((c, i) => (
          <motion.div
            key={`scan-${c.label}`}
            className="absolute rounded-card pointer-events-none"
            style={{ left: CHECK_X, top: c.y, width: CHECK_NODE_W, height: 46 }}
            animate={{ opacity: [0, 0, 0.9, 0], boxShadow: ["0 0 0 rgba(0,0,0,0)", "0 0 0 rgba(0,0,0,0)", "0 0 22px rgb(var(--color-primary) / 0.35)", "0 0 0 rgba(0,0,0,0)"] }}
            transition={{ delay: 2.2 + i * 0.5, duration: 4.5, repeat: Infinity, repeatDelay: 4.5, ease: "easeInOut" }}
          />
        ))}

        {/* URL input node */}
        <motion.div
          initial={{ opacity: 0, scale: 0.85, y: 6 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          whileHover={{ y: -3, scale: 1.03 }}
          transition={{ delay: 0.15, duration: 0.4, ease: "easeOut" }}
          className="absolute glass border border-black/[0.06] rounded-card px-3.5 py-3 flex items-center gap-2.5 shadow-glow"
          style={{ left: INPUT_X, top: INPUT_Y }}
        >
          {/* "live" pulse — signals this is the actively-running step,
              not just a static diagram. */}
          <motion.span
            className="absolute -inset-1 rounded-card border border-primary/40 pointer-events-none"
            initial={{ opacity: 0.6, scale: 1 }}
            animate={{ opacity: 0, scale: 1.12 }}
            transition={{ delay: 1.6, duration: 1.6, repeat: Infinity, ease: "easeOut" }}
          />
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
            whileHover={{ y: -3, scale: 1.04 }}
            variants={pop}
            className="absolute glass border border-black/[0.06] rounded-card px-3.5 py-3 flex items-center gap-2.5 shadow-glow"
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
          whileHover={{ y: -3, scale: 1.04 }}
          transition={{ delay: 1.55, duration: 0.45, ease: "easeOut" }}
          className="absolute glass border border-accent/25 rounded-card px-3.5 py-3 flex items-center gap-2.5 shadow-glow"
          style={{ left: RESULT_X, top: RESULT_Y, width: RESULT_NODE_W }}
        >
          <IconChip icon={FileCode2} tone="accent" />
          <div className="leading-tight min-w-0">
            <p className="text-[11px] font-semibold text-text-primary whitespace-nowrap hand-underline hand-underline--alt">Results</p>
            <p className="text-[10px] font-mono text-text-secondary whitespace-nowrap">Score + fixes</p>
          </div>
        </motion.div>

        <motion.div
          animate={{ y: [0, -5, 0], rotate: [0, 8, 0] }}
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
        @keyframes hv-travel {
          0% {
            offset-distance: 0%;
            opacity: 0;
          }
          8% {
            opacity: 1;
          }
          92% {
            opacity: 1;
          }
          100% {
            offset-distance: 100%;
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}
