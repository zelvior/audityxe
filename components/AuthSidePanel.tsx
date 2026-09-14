"use client";

import { motion } from "framer-motion";
import { ShieldCheck, Gauge, Search, Accessibility } from "lucide-react";

const BADGES = [
  { icon: ShieldCheck, x: 90, y: 130, delay: 0.5 },
  { icon: Gauge, x: 430, y: 165, delay: 0.65 },
  { icon: Search, x: 85, y: 480, delay: 0.8 },
  { icon: Accessibility, x: 435, y: 510, delay: 0.95 },
];

export default function AuthSidePanel() {
  return (
    <div className="hidden lg:flex relative w-[46%] shrink-0 bg-secondary overflow-hidden items-center justify-center">
      <svg viewBox="0 0 520 640" className="absolute inset-0 w-full h-full" preserveAspectRatio="xMidYMid slice">
        <defs>
          <linearGradient id="authPanelBg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#8C3703" />
            <stop offset="55%" stopColor="#6E2B03" />
            <stop offset="100%" stopColor="#4A1D02" />
          </linearGradient>
          <radialGradient id="authGlow" cx="50%" cy="20%" r="65%">
            <stop offset="0%" stopColor="#F0C46B" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#F0C46B" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#F0C46B" />
            <stop offset="100%" stopColor="#B5460A" />
          </linearGradient>
          <pattern id="authGrid" width="34" height="34" patternUnits="userSpaceOnUse">
            <path d="M34 0H0V34" fill="none" stroke="#E4E5F0" strokeOpacity="0.05" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width="520" height="640" fill="url(#authPanelBg)" />
        <rect width="520" height="640" fill="url(#authGrid)" />
        <rect width="520" height="640" fill="url(#authGlow)" />

        <motion.circle
          cx="440"
          cy="120"
          r="130"
          fill="none"
          stroke="#E4E5F0"
          strokeOpacity="0.06"
          strokeWidth="1.5"
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 1.2, ease: "easeOut" }}
        />
        <circle cx="440" cy="120" r="90" fill="none" stroke="#E4E5F0" strokeOpacity="0.05" strokeWidth="1.5" />
      </svg>

      {/* floating capability badges — positioned as percentages of the
          panel, not raw pixel offsets, since the background SVG above
          is viewBox-scaled to fill a variable-width/height panel with
          preserveAspectRatio="slice" (crop-to-fill). Raw px badge
          coordinates taken from the 520×640 viewBox space would only
          ever line up with the backdrop at one exact panel size and
          drift out of place everywhere else — percentages track the
          same scaled backdrop at any panel size. */}
      {BADGES.map(({ icon: Icon, x, y, delay }, i) => (
        <div
          key={i}
          className="absolute"
          style={{ left: `${(x / 520) * 100}%`, top: `${(y / 640) * 100}%`, transform: "translate(-50%, -50%)" }}
        >
          <motion.div
            className="glass rounded-2xl p-3"
            initial={{ opacity: 0, y: 12, scale: 0.85 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay, duration: 0.5, ease: "easeOut" }}
          >
            <motion.div
              animate={{ y: [0, -6, 0] }}
              transition={{ delay: delay + 1, duration: 3 + i * 0.4, repeat: Infinity, ease: "easeInOut" }}
            >
              <Icon size={18} className="text-primary" />
            </motion.div>
          </motion.div>
        </div>
      ))}

      {/* central "audit report" card */}
      <motion.div
        className="relative glass rounded-card p-6 w-[260px]"
        initial={{ opacity: 0, y: 24, scale: 0.94 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        <div className="h-2.5 w-24 rounded bg-text-primary/60 mb-2" />
        <div className="h-1.5 w-36 rounded bg-text-secondary/40 mb-6" />

        <div className="relative w-32 h-32 mx-auto mb-6">
          <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
            <circle cx="60" cy="60" r="52" fill="none" stroke="#6E2B03" strokeWidth="10" />
            <motion.circle
              cx="60"
              cy="60"
              r="52"
              fill="none"
              stroke="url(#ringGrad2)"
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={2 * Math.PI * 52}
              initial={{ strokeDashoffset: 2 * Math.PI * 52 }}
              animate={{ strokeDashoffset: 2 * Math.PI * 52 * (1 - 0.86) }}
              transition={{ duration: 1.1, delay: 0.4, ease: "easeOut" }}
            />
            <defs>
              <linearGradient id="ringGrad2" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#F0C46B" />
                <stop offset="100%" stopColor="#B5460A" />
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-display font-bold text-2xl text-text-primary">8.6</span>
            <span className="text-[9px] text-text-secondary font-mono tracking-wide">OVERALL SCORE</span>
          </div>
        </div>

        {[150, 120, 90].map((w, i) => (
          <div key={i} className="h-3.5 rounded-full bg-surface2 overflow-hidden mb-2.5 last:mb-0">
            <motion.div
              className="h-full rounded-full"
              style={{ background: i === 0 ? "#F0C46B" : i === 1 ? "#D99A3E" : "#B5460A" }}
              initial={{ width: 0 }}
              animate={{ width: `${(w / 184) * 100}%` }}
              transition={{ duration: 0.7, delay: 0.6 + i * 0.12, ease: "easeOut" }}
            />
          </div>
        ))}

        <motion.div
          className="absolute -left-6 -bottom-6 w-14 h-14 rounded-full bg-[#F0C46B] flex items-center justify-center"
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.9, duration: 0.4, ease: "easeOut" }}
        >
          <motion.svg
            viewBox="0 0 24 24"
            className="w-6 h-6"
            fill="none"
            stroke="#4A1D02"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <motion.path
              d="M5 13l4 4L19 7"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ delay: 1.1, duration: 0.5, ease: "easeOut" }}
            />
          </motion.svg>
        </motion.div>
      </motion.div>

      <motion.div
        className="absolute bottom-8 left-8 right-8"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.2, duration: 0.5 }}
      >
        <p className="text-[#F4EFE4] font-display font-semibold text-lg leading-snug">
          Every audit, backed by real evidence.
        </p>
        <p className="text-[#F0C46B] text-sm mt-1">
          No black-box scores — just deterministic checks you can verify yourself.
        </p>
      </motion.div>
    </div>
  );
}
