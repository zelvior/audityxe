"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { Sparkles, ArrowRight, Plus, X, Lock } from "lucide-react";

interface HeroProps {
  onAnalyze: (url: string, competitorUrl?: string) => void;
  disabled: boolean;
  isAuthed: boolean;
  hasAccount: boolean;
  authLoading: boolean;
  canCompare: boolean;
}

export default function Hero({ onAnalyze, disabled, isAuthed, hasAccount, authLoading, canCompare }: HeroProps) {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [showCompetitor, setShowCompetitor] = useState(false);
  const [competitorUrl, setCompetitorUrl] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim() || disabled) return;
    if (!isAuthed) {
      if (!hasAccount) router.push("/login?redirect=/");
      // Logged in but unverified: do nothing — the verify-email banner
      // above already tells them exactly what to do next.
      return;
    }
    onAnalyze(url, showCompetitor ? competitorUrl : undefined);
  }

  return (
    <section className="relative pt-20 sm:pt-28 pb-12 sm:pb-16 px-4 sm:px-6">
      <div className="max-w-3xl mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass text-[11px] sm:text-xs font-mono text-text-secondary mb-5 sm:mb-6"
        >
          <Sparkles size={13} className="text-accent shrink-0" />
          LIVE, BROWSER-VERIFIED AUDIT ENGINE
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="font-display font-medium text-[32px] leading-[1.1] sm:text-[48px] sm:leading-[1.05] md:text-[56px] md:leading-[1.03] tracking-tight text-gradient px-1"
        >
          Instant Site Audit &<br className="hidden sm:block" /> Viral Promo Generator
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mt-4 sm:mt-5 text-text-secondary text-sm sm:text-base md:text-lg max-w-xl mx-auto px-2"
        >
          Drop any URL in. Get a brutally specific score, exact code fixes, and a
          ready-to-post promo kit in under a minute.
        </motion.p>

        <motion.form
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          onSubmit={handleSubmit}
          className="mt-7 sm:mt-9 glass rounded-2xl p-2 flex flex-col sm:flex-row gap-2 shadow-glow"
        >
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Enter a website URL, e.g. yoursite.com"
            aria-label="Website URL to audit"
            className="flex-1 min-w-0 bg-transparent px-3.5 sm:px-4 py-3 text-sm sm:text-base placeholder:text-text-secondary/60 outline-none"
            disabled={disabled}
          />
          <button
            type="submit"
            disabled={disabled || !url.trim() || authLoading}
            className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-primary to-accent font-semibold text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:brightness-110 transition shrink-0"
          >
            {!isAuthed && !authLoading ? (
              <>
                <Lock size={15} />
                {hasAccount ? "Verify email first" : "Sign in to analyze"}
              </>
            ) : (
              <>
                Analyze Now
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </motion.form>

        {!isAuthed && !authLoading && !hasAccount && (
          <p className="mt-3 text-xs text-text-secondary">
            <Lock size={11} className="inline -mt-0.5 mr-1" />
            Free account required — 3 audits a day, no card needed.
          </p>
        )}

        <div className="mt-3 text-left">
          {!showCompetitor ? (
            <button
              type="button"
              onClick={() => setShowCompetitor(true)}
              disabled={!canCompare}
              className="inline-flex items-center gap-1.5 text-xs font-mono text-text-secondary hover:text-primary transition mt-2 ml-1 disabled:opacity-40 disabled:cursor-not-allowed"
              title={canCompare ? undefined : "Competitor comparison is available on Standard and Pro plans"}
            >
              <Plus size={13} /> Compare with Competitor
              {!canCompare && <Lock size={11} />}
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
                  aria-label="Competitor website URL"
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
      </div>
    </section>
  );
}
