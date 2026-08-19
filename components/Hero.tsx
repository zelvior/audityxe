"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, ArrowRight, Plus, X } from "lucide-react";
import { LIVE_DEMO_PILLS } from "@/lib/constants";

interface HeroProps {
  onAnalyze: (url: string, competitorUrl?: string) => void;
  disabled: boolean;
}

export default function Hero({ onAnalyze, disabled }: HeroProps) {
  const [url, setUrl] = useState("");
  const [showCompetitor, setShowCompetitor] = useState(false);
  const [competitorUrl, setCompetitorUrl] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim() || disabled) return;
    onAnalyze(url, showCompetitor ? competitorUrl : undefined);
  }

  return (
    <section className="relative pt-28 pb-16 px-6">
      <div className="max-w-3xl mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass text-xs font-mono text-text-secondary mb-6"
        >
          <Sparkles size={13} className="text-accent" />
          AI-POWERED AUDIT ENGINE
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="font-display font-medium text-[42px] leading-[1.05] sm:text-[56px] sm:leading-[1.03] tracking-tight text-gradient"
        >
          Instant AI Site Audit &<br className="hidden sm:block" /> Viral Promo Generator
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mt-5 text-text-secondary text-base sm:text-lg max-w-xl mx-auto"
        >
          Drop any URL in. Get a brutally specific score, exact code fixes, and a
          ready-to-post promo kit in under a minute.
        </motion.p>

        <motion.form
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          onSubmit={handleSubmit}
          className="mt-9 glass rounded-2xl p-2 flex flex-col sm:flex-row gap-2 shadow-glow"
        >
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Enter a website URL, e.g. yoursite.com"
            className="flex-1 bg-transparent px-4 py-3 text-sm sm:text-base placeholder:text-text-secondary/60 outline-none"
            disabled={disabled}
          />
          <button
            type="submit"
            disabled={disabled || !url.trim()}
            className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-primary to-accent font-semibold text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:brightness-110 transition"
          >
            Analyze Now
            <ArrowRight size={16} />
          </button>
        </motion.form>

        <div className="mt-3 text-left">
          {!showCompetitor ? (
            <button
              type="button"
              onClick={() => setShowCompetitor(true)}
              className="inline-flex items-center gap-1.5 text-xs font-mono text-text-secondary hover:text-primary transition mt-2 ml-1"
            >
              <Plus size={13} /> Compare with Competitor
            </button>
          ) : (
            <AnimatePresence>
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-2 flex items-center gap-2"
              >
                <input
                  type="text"
                  value={competitorUrl}
                  onChange={(e) => setCompetitorUrl(e.target.value)}
                  placeholder="Competitor URL"
                  className="flex-1 glass rounded-xl px-4 py-2.5 text-sm outline-none placeholder:text-text-secondary/60"
                  disabled={disabled}
                />
                <button
                  type="button"
                  onClick={() => {
                    setShowCompetitor(false);
                    setCompetitorUrl("");
                  }}
                  className="p-2.5 rounded-xl glass hover:text-rose transition"
                  aria-label="Remove competitor field"
                >
                  <X size={14} />
                </button>
              </motion.div>
            </AnimatePresence>
          )}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-10 flex flex-wrap items-center justify-center gap-2"
        >
          <span className="text-xs font-mono text-text-secondary/70 mr-1">Recent audits:</span>
          {LIVE_DEMO_PILLS.map((p) => (
            <span
              key={p.url}
              className="text-xs font-mono px-3 py-1.5 rounded-full glass text-text-secondary"
            >
              {p.url} <span className="text-emerald font-semibold">{p.score.toFixed(1)}/10</span>
            </span>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
