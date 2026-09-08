"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { ArrowRight, Plus, X, Lock, Loader2 } from "lucide-react";
import HeroVisual from "./HeroVisual";
import { PlanId } from "@/lib/plans";

interface HeroProps {
  onAnalyze: (url: string, competitorUrl?: string) => void;
  disabled: boolean;
  isAuthed: boolean;
  hasAccount: boolean;
  authLoading: boolean;
  canCompare: boolean;
  prefillUrl?: string;
  userPlan: PlanId;
  wantsPageSpeed: boolean;
  onWantsPageSpeedChange: (value: boolean) => void;
}

export default function Hero({
  onAnalyze,
  disabled,
  isAuthed,
  hasAccount,
  authLoading,
  canCompare,
  prefillUrl,
  userPlan,
  wantsPageSpeed,
  onWantsPageSpeedChange,
}: HeroProps) {
  const router = useRouter();
  const [url, setUrl] = useState(prefillUrl || "");
  const [showCompetitor, setShowCompetitor] = useState(false);
  const [competitorUrl, setCompetitorUrl] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim() || disabled) return;
    if (hasAccount && !isAuthed) {
      // Logged in but unverified: do nothing — the verify-email banner
      // above already tells them exactly what to do next.
      return;
    }
    onAnalyze(url, showCompetitor ? competitorUrl : undefined);
  }

  return (
    <section className="relative pt-16 sm:pt-24 pb-12 sm:pb-16 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto grid lg:grid-cols-[1.05fr_0.95fr] items-center gap-8 lg:gap-6">
      <div className="text-center lg:text-left">
        {/* Plain h1, no entrance animation — this is the page's primary
            heading, and shipping it at opacity:0 in the initial HTML
            (as framer-motion's fade-in would) reads as invisible content
            to headless-Chrome SEO auditors even though real crawlers
            that don't execute JS/CSS don't care either way. Not worth
            the risk for the one heading that matters most. */}
        <h1 className="font-display font-medium text-[32px] leading-[1.1] sm:text-[48px] sm:leading-[1.05] md:text-[52px] md:leading-[1.03] tracking-tight text-gradient px-1">
          Instant Site Audit &<br className="hidden sm:block" /> Pro Promo Kit
        </h1>

        <motion.p
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mt-4 sm:mt-5 text-text-secondary text-sm sm:text-base md:text-lg max-w-xl mx-auto lg:mx-0 px-2"
        >
          Drop any URL in. Get a brutally specific score, exact code fixes, and a
          ready-to-post promo kit in under a minute.
        </motion.p>

        <motion.form
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          onSubmit={handleSubmit}
          className="mt-7 sm:mt-9 glass rounded-card p-2 flex flex-col sm:flex-row gap-2 shadow-glow"
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
            disabled={disabled || !url.trim() || authLoading || (hasAccount && !isAuthed)}
            className="flex items-center justify-center gap-2 px-5 py-3 rounded-card bg-secondary font-semibold text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:brightness-110 hover:scale-[1.02] active:scale-[0.98] transition shrink-0"
          >
            {hasAccount && !isAuthed && !authLoading ? (
              <>
                <Lock size={15} />
                Verify email first
              </>
            ) : disabled ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                Analyze Now
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </motion.form>

        {!hasAccount && !authLoading && (
          <p className="mt-3 text-xs text-text-secondary">
            1 free audit without an account.{" "}
            <button type="button" onClick={() => router.push("/login?redirect=/")} className="text-primary hover:underline">
              Sign up
            </button>{" "}
            for 2 audits a day, no card needed.
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
                  className="flex-1 glass rounded-card px-4 py-2.5 text-sm outline-none placeholder:text-text-secondary/60"
                  disabled={disabled}
                />
                <button
                  type="button"
                  onClick={() => {
                    setShowCompetitor(false);
                    setCompetitorUrl("");
                  }}
                  className="p-2.5 rounded-card glass hover:text-rose transition"
                  aria-label="Remove competitor field"
                >
                  <X size={14} />
                </button>
              </motion.div>
            </AnimatePresence>
          )}
        </div>

        {userPlan === "pro" && (
          <label className="mt-3 ml-1 flex items-center gap-2 text-xs text-text-secondary cursor-pointer select-none w-fit">
            <input
              type="checkbox"
              checked={wantsPageSpeed}
              onChange={(e) => onWantsPageSpeedChange(e.target.checked)}
              className="accent-primary w-3.5 h-3.5"
            />
            Run a real-browser PageSpeed Insights (Lighthouse) pass — limited to your weekly quota
          </label>
        )}
      </div>

      <HeroVisual />
      </div>
    </section>
  );
}
