"use client";

import { motion } from "framer-motion";
import { Link2, ShieldCheck, Search, Gauge, Accessibility, FileCode2, Sparkles } from "lucide-react";

const NODES = [
  { icon: Link2, label: "URL Input", x: 24, y: 40 },
  { icon: ShieldCheck, label: "Security Check", x: 190, y: 16 },
  { icon: Search, label: "SEO Scan", x: 190, y: 130 },
  { icon: Gauge, label: "Performance", x: 24, y: 200 },
  { icon: Accessibility, label: "Accessibility", x: 190, y: 244 },
];

const pop = {
  hidden: { opacity: 0, scale: 0.85, y: 6 },
  show: (i: number) => ({
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { delay: 0.2 + i * 0.09, duration: 0.4, ease: "easeOut" as const },
  }),
};

export default function HeroVisual() {
  return (
    <div className="relative hidden lg:block w-full h-[360px] select-none" aria-hidden="true">
      <svg
        viewBox="0 0 420 320"
        className="absolute inset-0 w-full h-full overflow-visible"
        fill="none"
      >
        <defs>
          <marker id="hv-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
            <path d="M2 1L8 5L2 9" stroke="#4B4166" strokeWidth="1.5" fill="none" strokeLinecap="round" />
          </marker>
        </defs>
        <motion.path
          d="M72 62 C 120 62, 130 40, 178 40"
          stroke="#3A3350"
          strokeWidth="1.5"
          markerEnd="url(#hv-arrow)"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ delay: 0.55, duration: 0.6 }}
        />
        <motion.path
          d="M72 78 C 120 100, 130 148, 178 152"
          stroke="#3A3350"
          strokeWidth="1.5"
          markerEnd="url(#hv-arrow)"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ delay: 0.65, duration: 0.6 }}
        />
        <motion.path
          d="M72 220 C 120 200, 130 176, 178 162"
          stroke="#3A3350"
          strokeWidth="1.5"
          markerEnd="url(#hv-arrow)"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ delay: 0.75, duration: 0.6 }}
        />
        <motion.path
          d="M72 236 C 120 258, 130 262, 178 262"
          stroke="#3A3350"
          strokeWidth="1.5"
          markerEnd="url(#hv-arrow)"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ delay: 0.85, duration: 0.6 }}
        />
        <motion.path
          d="M262 40 C 320 60, 320 240, 262 262"
          stroke="#3A3350"
          strokeWidth="1.5"
          strokeDasharray="4 4"
          markerEnd="url(#hv-arrow)"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ delay: 1.05, duration: 0.7 }}
        />
      </svg>

      {NODES.map(({ icon: Icon, label, x, y }, i) => (
        <motion.div
          key={label}
          custom={i}
          initial="hidden"
          animate="show"
          variants={pop}
          className="absolute glass rounded-card px-3.5 py-2.5 flex items-center gap-2 shadow-glow"
          style={{ left: x, top: y }}
        >
          <Icon size={14} className="text-primary shrink-0" />
          <span className="text-[11px] font-mono text-text-secondary whitespace-nowrap">{label}</span>
        </motion.div>
      ))}

      <motion.div
        initial={{ opacity: 0, scale: 0.85, y: 6 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ delay: 0.95, duration: 0.45, ease: "easeOut" }}
        className="absolute glass rounded-card px-4 py-3 flex items-center gap-2 shadow-glow border-primary/30"
        style={{ left: 296, top: 132 }}
      >
        <FileCode2 size={15} className="text-accent shrink-0" />
        <div className="leading-tight">
          <p className="text-[11px] font-semibold text-text-primary">Results</p>
          <p className="text-[10px] font-mono text-text-secondary">Score + fixes</p>
        </div>
      </motion.div>

      <motion.div
        animate={{ y: [0, -5, 0] }}
        transition={{ delay: 1.6, duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
        className="absolute rounded-full bg-accent/15 border border-accent/30 p-2"
        style={{ left: 350, top: 60 }}
      >
        <Sparkles size={14} className="text-accent" />
      </motion.div>
    </div>
  );
}
