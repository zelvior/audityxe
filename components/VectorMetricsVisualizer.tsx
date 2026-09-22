"use client";

import { useId, useState } from "react";
import { motion } from "framer-motion";
import { CategoryScore } from "@/lib/types";

function colorFor(score: number) {
  if (score >= 8) return { stroke: "rgb(var(--color-emerald))", text: "text-emerald" };
  if (score >= 5) return { stroke: "rgb(var(--color-amber))", text: "text-amber" };
  return { stroke: "rgb(var(--color-rose))", text: "text-rose" };
}

const MAX_SCORE = 10;
const RINGS = [2, 4, 6, 8, 10];

/** Polar → cartesian, 0 = straight up, going clockwise — standard radar
 * chart orientation. */
function pointAt(cx: number, cy: number, radius: number, index: number, total: number) {
  const angle = (Math.PI * 2 * index) / total - Math.PI / 2;
  return { x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle) };
}

/**
 * Plots the audit's real per-category scores (lib/types.ts CategoryScore —
 * the exact same numbers ScoreCard renders as bars) as vectors from a
 * shared center — one polygon vertex per category, distance from center
 * = that category's actual score / 10. Nothing here is estimated,
 * simulated, or decorative: nudge one category's score and this chart
 * moves with it, because it reads directly from `categories`, the same
 * prop ScoreCard uses.
 */
export default function VectorMetricsVisualizer({ categories }: { categories: CategoryScore[] }) {
  const gradientId = useId();
  const [hovered, setHovered] = useState<number | null>(null);
  const prefersReducedMotion = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  const size = 340;
  const cx = size / 2;
  const cy = size / 2;
  const maxRadius = size / 2 - 56; // leaves room for axis labels
  const n = categories.length;
  if (n < 3) return null; // a radar chart needs at least a triangle to mean anything

  const vertices = categories.map((cat, i) => {
    const r = (cat.score / MAX_SCORE) * maxRadius;
    return { ...pointAt(cx, cy, r, i, n), cat };
  });
  const polygonPoints = vertices.map((v) => `${v.x},${v.y}`).join(" ");
  const overallColor = colorFor(categories.reduce((s, c) => s + c.score, 0) / n);

  return (
    <div className="glass rounded-card p-5 sm:p-6">
      <div className="flex items-center justify-between mb-1">
        <p className="text-sm font-semibold">Vector metrics</p>
        <p className="text-xs text-text-secondary font-mono">{n} axes · live from this audit</p>
      </div>
      <p className="text-xs text-text-secondary mb-4">
        Every category's real score, plotted as a vector from center. A bigger, rounder shape = a
        more even, all-around result; a spike toward one axis means that category is carrying (or
        dragging) the rest.
      </p>

      <div className="flex justify-center">
        <svg viewBox={`0 0 ${size} ${size}`} width="100%" style={{ maxWidth: 380 }} role="img" aria-label="Radar chart of category scores">
          <defs>
            <radialGradient id={gradientId} cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor={overallColor.stroke} stopOpacity="0.28" />
              <stop offset="100%" stopColor={overallColor.stroke} stopOpacity="0.03" />
            </radialGradient>
          </defs>

          {/* Reference rings at 2/4/6/8/10 */}
          {RINGS.map((ring) => {
            const r = (ring / MAX_SCORE) * maxRadius;
            const ringPoints = Array.from({ length: n }, (_, i) => pointAt(cx, cy, r, i, n));
            return (
              <polygon
                key={ring}
                points={ringPoints.map((p) => `${p.x},${p.y}`).join(" ")}
                fill="none"
                stroke="rgb(var(--color-border))"
                strokeWidth={ring === 10 ? 1.2 : 0.75}
              />
            );
          })}

          {/* Spokes */}
          {vertices.map((_, i) => {
            const edge = pointAt(cx, cy, maxRadius, i, n);
            return <line key={i} x1={cx} y1={cy} x2={edge.x} y2={edge.y} stroke="rgb(var(--color-border))" strokeWidth={0.75} />;
          })}

          {/* The actual data polygon — animates in once on mount/update */}
          <motion.polygon
            points={polygonPoints}
            fill={`url(#${gradientId})`}
            stroke={overallColor.stroke}
            strokeWidth={2}
            strokeLinejoin="round"
            initial={prefersReducedMotion ? false : { scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            style={{ transformOrigin: `${cx}px ${cy}px` }}
          />

          {/* Vertex dots + hover targets */}
          {vertices.map((v, i) => {
            const c = colorFor(v.cat.score);
            return (
              <g key={v.cat.key}>
                <motion.circle
                  cx={v.x}
                  cy={v.y}
                  r={hovered === i ? 6 : 4}
                  fill={c.stroke}
                  stroke="rgb(var(--color-bg))"
                  strokeWidth={1.5}
                  initial={prefersReducedMotion ? false : { opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5, duration: 0.3 }}
                  className="cursor-pointer transition-[r]"
                  onMouseEnter={() => setHovered(i)}
                  onMouseLeave={() => setHovered(null)}
                />
                {/* Larger invisible hit target for touch */}
                <circle
                  cx={v.x}
                  cy={v.y}
                  r={14}
                  fill="transparent"
                  onMouseEnter={() => setHovered(i)}
                  onMouseLeave={() => setHovered(null)}
                  onTouchStart={() => setHovered(i)}
                />
              </g>
            );
          })}

          {/* Axis labels */}
          {vertices.map((v, i) => {
            const labelPos = pointAt(cx, cy, maxRadius + 26, i, n);
            const anchor = labelPos.x < cx - 4 ? "end" : labelPos.x > cx + 4 ? "start" : "middle";
            const c = colorFor(v.cat.score);
            return (
              <text
                key={v.cat.key}
                x={labelPos.x}
                y={labelPos.y}
                textAnchor={anchor}
                dominantBaseline="middle"
                fontSize={11}
                fontFamily="var(--font-mono, monospace)"
                fill={hovered === i ? c.stroke : "rgb(var(--color-text-secondary))"}
                className="transition-colors select-none"
              >
                {v.cat.label}
              </text>
            );
          })}

          {/* Hovered vertex's exact score */}
          {hovered !== null && (
            <text
              x={cx}
              y={cy}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={22}
              fontWeight={800}
              fill={colorFor(vertices[hovered].cat.score).stroke}
            >
              {vertices[hovered].cat.score.toFixed(1)}
            </text>
          )}
        </svg>
      </div>

      <div className="flex flex-wrap justify-center gap-x-4 gap-y-1.5 mt-2">
        {categories.map((cat) => {
          const c = colorFor(cat.score);
          return (
            <span key={cat.key} className="text-xs text-text-secondary flex items-center gap-1.5">
              <span className={`inline-block w-2 h-2 rounded-full ${c.text.replace("text-", "bg-")}`} />
              {cat.label} <span className={`font-mono font-semibold ${c.text}`}>{cat.score.toFixed(1)}</span>
            </span>
          );
        })}
      </div>
    </div>
  );
}
