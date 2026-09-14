"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldCheck, Search, Gauge, BarChart3, Accessibility, FileCode2 } from "lucide-react";

const TILES = [
  { id: "security", icon: ShieldCheck, label: "Security" },
  { id: "seo", icon: Search, label: "SEO" },
  { id: "performance", icon: Gauge, label: "Performance" },
  { id: "lighthouse", icon: BarChart3, label: "Lighthouse" },
  { id: "a11y", icon: Accessibility, label: "Accessibility" },
  { id: "results", icon: FileCode2, label: "Results" },
] as const;

/** Fisher–Yates, using the runtime's own RNG — called once per mount,
 * so every visitor (and every reload) gets their own shuffle. Rejects
 * an accidental already-solved shuffle so there's always a puzzle to
 * actually solve. */
function shuffledOrder(): number[] {
  let order: number[];
  do {
    order = [0, 1, 2, 3, 4, 5];
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
  } while (order.every((v, i) => v === i));
  return order;
}

/**
 * A small interactive tile-swap puzzle standing in for the old static
 * pipeline diagram. Each visitor gets their own random shuffle
 * (generated client-side on mount, not from a fixed seed), and solves
 * it by tapping two tiles to swap them until the six audit-engine
 * steps land back in order. Purely a bit of homepage delight — it
 * doesn't gate or unlock anything — but it's genuinely interactive and
 * never the same twice, which a static diagram never was.
 */
export default function AuditPuzzle() {
  const [order, setOrder] = useState<number[] | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [moves, setMoves] = useState(0);
  const [solved, setSolved] = useState(false);

  useEffect(() => {
    setOrder(shuffledOrder());
  }, []);

  function handleTap(slot: number) {
    if (solved || !order) return;
    if (selected === null) {
      setSelected(slot);
      return;
    }
    if (selected === slot) {
      setSelected(null);
      return;
    }
    const next = [...order];
    [next[selected], next[slot]] = [next[slot], next[selected]];
    setOrder(next);
    setSelected(null);
    setMoves((m) => m + 1);
    if (next.every((v, i) => v === i)) {
      setSolved(true);
    }
  }

  function reshuffle() {
    setOrder(shuffledOrder());
    setSelected(null);
    setMoves(0);
    setSolved(false);
  }

  return (
    <div className="w-full max-w-md mx-auto lg:mx-0">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-mono text-text-secondary">
          {solved ? "Solved! That's the actual audit order." : "Tap two tiles to put the audit steps back in order."}
        </p>
        <button
          type="button"
          onClick={reshuffle}
          className="text-[11px] font-mono text-primary hover:underline shrink-0 ml-3"
        >
          Shuffle again
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
        {order === null
          ? TILES.map((t) => <div key={t.id} className="aspect-square rounded-card border border-border" />)
          : order.map((tileIdx, slot) => {
              const tile = TILES[tileIdx];
              const Icon = tile.icon;
              const isCorrect = tileIdx === slot;
              return (
                <motion.button
                  key={slot}
                  type="button"
                  layout
                  onClick={() => handleTap(slot)}
                  transition={{ type: "spring", stiffness: 500, damping: 32 }}
                  className={`aspect-square rounded-card border flex flex-col items-center justify-center gap-1.5 transition-colors ${
                    solved
                      ? "border-emerald bg-emerald/10"
                      : selected === slot
                        ? "border-primary bg-primary/10"
                        : isCorrect
                          ? "border-primary/30 bg-primary/5"
                          : "border-border bg-surface"
                  }`}
                >
                  <Icon size={20} className={solved ? "text-emerald" : "text-primary"} />
                  <span className="text-[10px] font-mono text-text-secondary">{tile.label}</span>
                </motion.button>
              );
            })}
      </div>

      <AnimatePresence>
        {solved && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="text-xs font-mono text-emerald mt-3"
          >
            Nice — solved in {moves} move{moves === 1 ? "" : "s"}. That's exactly the order Audityxe actually runs
            your audit in.
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}
