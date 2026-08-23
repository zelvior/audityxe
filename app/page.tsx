"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, Lock, Zap, Share2 } from "lucide-react";
import Link from "next/link";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import Hero from "@/components/Hero";
import TrustSection from "@/components/TrustSection";
import ScanProgress from "@/components/ScanProgress";
import ScoreCard from "@/components/ScoreCard";
import DiffFixes from "@/components/DiffFixes";
import PromoKit from "@/components/PromoKit";
import CompetitorBattle from "@/components/CompetitorBattle";
import AuditModules from "@/components/AuditModules";
import VerifyEmailBanner from "@/components/VerifyEmailBanner";
import { SCAN_STEPS } from "@/lib/constants";
import { AuditResult, Tone } from "@/lib/types";
import { useAuth } from "@/context/AuthContext";
import { PLANS, PlanId } from "@/lib/plans";

type Phase = "idle" | "scanning" | "results" | "error";

export default function Home() {
  const { user, loading: authLoading, needsEmailVerification, getToken } = useAuth();
  const [phase, setPhase] = useState<Phase>("idle");
  const [activeStep, setActiveStep] = useState(0);
  const [result, setResult] = useState<AuditResult | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [rateLimited, setRateLimited] = useState<{ plan: PlanId; limit: number } | null>(null);
  const [tone, setTone] = useState<Tone>("constructive");
  const stepTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const userPlan: PlanId = (result?._usage?.plan as PlanId) || "free";
  const canCompare = PLANS[userPlan].competitorAudits;

  async function handleAnalyze(url: string, competitorUrl?: string) {
    if (!user || needsEmailVerification) return;

    setPhase("scanning");
    setActiveStep(0);
    setResult(null);
    setErrorMsg("");
    setRateLimited(null);

    let step = 0;
    stepTimerRef.current = setInterval(() => {
      step = Math.min(step + 1, SCAN_STEPS.length - 1);
      setActiveStep(step);
    }, 900);

    try {
      const token = await getToken();
      if (!token) {
        if (stepTimerRef.current) clearInterval(stepTimerRef.current);
        setErrorMsg("Your session has expired. Please sign in again.");
        setPhase("error");
        return;
      }

      const res = await fetch("/api/audit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ url, competitorUrl }),
      });
      const data = await res.json();
      if (stepTimerRef.current) clearInterval(stepTimerRef.current);

      if (!res.ok) {
        if (data.code === "RATE_LIMITED") {
          setRateLimited({ plan: data.plan, limit: data.limit });
        }
        setErrorMsg(data.error || "Couldn't reach that site. Check the URL and try again.");
        setPhase("error");
        return;
      }

      setActiveStep(SCAN_STEPS.length - 1);
      setResult(data as AuditResult);
      setPhase("results");
    } catch {
      if (stepTimerRef.current) clearInterval(stepTimerRef.current);
      setErrorMsg("Network error while fetching that site. Check the URL and try again.");
      setPhase("error");
    }
  }

  useEffect(() => {
    return () => {
      if (stepTimerRef.current) clearInterval(stepTimerRef.current);
    };
  }, []);

  return (
    <main>
      <Header />
      <Hero
        onAnalyze={handleAnalyze}
        disabled={phase === "scanning"}
        isAuthed={!!user && !needsEmailVerification}
        hasAccount={!!user}
        authLoading={authLoading}
        canCompare={canCompare}
      />

      {user && needsEmailVerification && <VerifyEmailBanner />}
      {phase === "idle" && <TrustSection />}

      <AnimatePresence mode="wait">
        {phase === "scanning" && (
          <motion.div key="scan" exit={{ opacity: 0 }}>
            <ScanProgress activeStep={activeStep} />
          </motion.div>
        )}

        {phase === "error" && (
          <motion.div
            key="error"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="px-4 sm:px-6 py-8 sm:py-10"
          >
            <div className="max-w-xl mx-auto glass rounded-2xl p-5 sm:p-6 border border-rose/30 flex items-start gap-3">
              {rateLimited ? <Zap size={18} className="text-amber mt-0.5 shrink-0" /> : <AlertTriangle size={18} className="text-rose mt-0.5 shrink-0" />}
              <div>
                <p className="text-sm text-text-secondary">{errorMsg}</p>
                {rateLimited && (
                  <Link
                    href="/pricing"
                    className="inline-block mt-3 text-xs font-mono text-primary hover:underline"
                  >
                    View plans →
                  </Link>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {phase === "results" && result && (
          <motion.div
            key="results"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
          >
            {result._usage && (
              <div className="px-4 sm:px-6 max-w-4xl mx-auto -mb-2 pt-6 flex flex-wrap items-center gap-x-4 gap-y-1">
                <p className="text-[11px] font-mono text-text-secondary/70 flex items-center gap-1.5">
                  <Lock size={11} />
                  {result._usage.remaining} of {result._usage.limit} audits left today on the{" "}
                  {PLANS[result._usage.plan as PlanId].name} plan.{" "}
                  <Link href="/pricing" className="text-primary hover:underline">
                    Upgrade
                  </Link>
                </p>
                {result._reportId && (
                  <Link
                    href={`/report/${result._reportId}`}
                    target="_blank"
                    className="text-[11px] font-mono text-primary hover:underline flex items-center gap-1"
                  >
                    <Share2 size={11} /> View shareable report
                  </Link>
                )}
              </div>
            )}
            <ScoreCard result={result} tone={tone} onToneChange={setTone} />
            <AuditModules modules={result.modules} />
            <DiffFixes result={result} tone={tone} />
            <PromoKit result={result} />
            <CompetitorBattle result={result} />
          </motion.div>
        )}
      </AnimatePresence>

      <Footer />
    </main>
  );
}
