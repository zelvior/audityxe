"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle } from "lucide-react";
import Header from "@/components/Header";
import Hero from "@/components/Hero";
import ScanProgress from "@/components/ScanProgress";
import ScoreCard from "@/components/ScoreCard";
import DiffFixes from "@/components/DiffFixes";
import PromoKit from "@/components/PromoKit";
import CompetitorBattle from "@/components/CompetitorBattle";
import { SCAN_STEPS } from "@/lib/constants";
import { AuditResult, Tone } from "@/lib/types";

type Phase = "idle" | "scanning" | "results" | "error";

export default function Home() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [activeStep, setActiveStep] = useState(0);
  const [result, setResult] = useState<AuditResult | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [tone, setTone] = useState<Tone>("constructive");
  const stepTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function handleAnalyze(url: string, competitorUrl?: string) {
    setPhase("scanning");
    setActiveStep(0);
    setResult(null);
    setErrorMsg("");

    let step = 0;
    stepTimerRef.current = setInterval(() => {
      step = Math.min(step + 1, SCAN_STEPS.length - 1);
      setActiveStep(step);
    }, 900);

    try {
      const res = await fetch("/api/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, competitorUrl }),
      });
      const data = await res.json();
      if (stepTimerRef.current) clearInterval(stepTimerRef.current);

      if (!res.ok) {
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
      <Hero onAnalyze={handleAnalyze} disabled={phase === "scanning"} />

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
            className="px-6 py-10"
          >
            <div className="max-w-xl mx-auto glass rounded-2xl p-6 border border-rose/30 flex items-start gap-3">
              <AlertTriangle size={18} className="text-rose mt-0.5 shrink-0" />
              <p className="text-sm text-text-secondary">{errorMsg}</p>
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
            <ScoreCard result={result} tone={tone} onToneChange={setTone} />
            <DiffFixes result={result} tone={tone} />
            <PromoKit result={result} />
            <CompetitorBattle result={result} />
          </motion.div>
        )}
      </AnimatePresence>

      <footer className="px-6 py-10 text-center text-xs font-mono text-text-secondary/60">
        Audityxe — audits run live against the URL you enter.
      </footer>
    </main>
  );
}
