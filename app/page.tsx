"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, Lock, Zap } from "lucide-react";
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
import PerformanceMetrics from "@/components/PerformanceMetrics";
import RenderProof from "@/components/RenderProof";
import VerifyEmailBanner from "@/components/VerifyEmailBanner";
import Onboarding from "@/components/Onboarding";
import { SCAN_STEPS } from "@/lib/constants";
import { AuditResult } from "@/lib/types";
import { useAuth } from "@/context/AuthContext";
import { PLANS, PlanId } from "@/lib/plans";
import { fetchJson } from "@/lib/fetch-json";

type Phase = "idle" | "scanning" | "results" | "error";

export default function Home() {
  const { user, loading: authLoading, needsEmailVerification, getToken } = useAuth();
  // Read ?url= client-side only (not via useSearchParams) so this page
  // stays fully static/SSR'd — useSearchParams forces a Suspense
  // boundary that ships an empty fallback in the static HTML on prod
  // builds, which was making crawlers/SEO tools see 0 H1s and 0 words
  // of visible copy since the entire page content only appeared after
  // client-side hydration. This prefill is a non-critical enhancement
  // (badge "verify this score" deep link), so it's fine for it to only
  // populate after mount instead of forcing the whole page dynamic.
  const [prefillUrl, setPrefillUrl] = useState<string | undefined>(undefined);
  useEffect(() => {
    const url = new URLSearchParams(window.location.search).get("url");
    if (url) setPrefillUrl(url);
  }, []);
  const [phase, setPhase] = useState<Phase>("idle");
  const [activeStep, setActiveStep] = useState(0);
  const [result, setResult] = useState<AuditResult | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [rateLimited, setRateLimited] = useState<{ plan: PlanId; limit: number } | null>(null);
  const stepTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // The account's real plan, fetched directly — not inferred from a
  // previous audit result. Deriving plan from `result?._usage?.plan`
  // meant a signed-in Pro user's very first audit of any session always
  // saw "free" (no result exists yet), so the Lighthouse opt-in checkbox
  // below would silently never appear until after one audit had already
  // run without it.
  const [accountPlan, setAccountPlan] = useState<PlanId>("free");
  const [hasPsiByokKey, setHasPsiByokKey] = useState(false);
  const [wantsPageSpeed, setWantsPageSpeed] = useState(false);

  useEffect(() => {
    if (!user) {
      setAccountPlan("free");
      setHasPsiByokKey(false);
      return;
    }
    let cancelled = false;
    (async () => {
      const token = await getToken();
      if (!token) return;
      const { ok, data } = await fetchJson<{ plan: PlanId; psiByok?: { configured: boolean } }>("/api/settings", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!cancelled && ok && data?.plan) setAccountPlan(data.plan);
      if (!cancelled && ok) setHasPsiByokKey(!!data?.psiByok?.configured);
    })();
    return () => {
      cancelled = true;
    };
  }, [user, getToken]);

  const userPlan: PlanId = (result?._usage?.plan as PlanId) || accountPlan;
  const canCompare = PLANS[userPlan].competitorAudits;

  async function handleAnalyze(url: string, competitorUrl?: string) {
    if (needsEmailVerification) return;

    const confirmPageSpeed = userPlan === "pro" ? wantsPageSpeed : false;

    setPhase("scanning");
    setActiveStep(0);
    setResult(null);
    setErrorMsg("");
    setRateLimited(null);

    let step = 0;
    // The step checklist is a client-side approximation, not real
    // backend progress (the API is one opaque request/response, not a
    // streaming one) — so its pace needs to roughly track how long the
    // request will actually take, or it finishes and sits there
    // looking "done" while the real audit keeps running underneath,
    // which is exactly the confusing/misleading state this is meant to
    // avoid. A real-browser (Lighthouse) pass alone can take up to 75s
    // (see PSI_TIMEOUT_MS), so pace much slower when one was requested.
    const stepIntervalMs = confirmPageSpeed ? 9000 : 900;
    stepTimerRef.current = setInterval(() => {
      step = Math.min(step + 1, SCAN_STEPS.length - 1);
      setActiveStep(step);
    }, stepIntervalMs);

    try {
      // No token at all for a signed-out visitor — that's fine, the
      // request goes through as an anonymous, IP-limited audit.
      const token = user ? await getToken() : null;
      if (user && !token) {
        if (stepTimerRef.current) clearInterval(stepTimerRef.current);
        setErrorMsg("Your session has expired. Please sign in again.");
        setPhase("error");
        return;
      }

      const { ok, data, error } = await fetchJson<AuditResult & { code?: string; plan?: PlanId; limit?: number }>(
        "/api/audit",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ url, competitorUrl, confirmPageSpeed }),
        }
      );
      if (stepTimerRef.current) clearInterval(stepTimerRef.current);

      if (!ok || !data) {
        if (data?.code === "RATE_LIMITED") {
          setRateLimited({ plan: data.plan as PlanId, limit: data.limit as number });
        }
        setErrorMsg(error || "Couldn't reach that site. Check the URL and try again.");
        setPhase("error");
        return;
      }

      setActiveStep(SCAN_STEPS.length - 1);
      setResult(data);
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
      <Onboarding />
      <Hero
        onAnalyze={handleAnalyze}
        disabled={phase === "scanning"}
        isAuthed={!!user && !needsEmailVerification}
        hasAccount={!!user}
        prefillUrl={prefillUrl}
        authLoading={authLoading}
        canCompare={canCompare}
        userPlan={userPlan}
        hasPsiByokKey={hasPsiByokKey}
        wantsPageSpeed={wantsPageSpeed}
        onWantsPageSpeedChange={setWantsPageSpeed}
      />

      {user && needsEmailVerification && <VerifyEmailBanner />}
      {phase === "idle" && <TrustSection />}

      <AnimatePresence mode="wait">
        {phase === "scanning" && (
          <motion.div key="scan" exit={{ opacity: 0 }}>
            <ScanProgress activeStep={activeStep} isLongRun={wantsPageSpeed && userPlan === "pro"} />
          </motion.div>
        )}

        {phase === "error" && (
          <motion.div
            key="error"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="px-4 sm:px-6 py-8 sm:py-10"
          >
            <div className="max-w-xl mx-auto glass rounded-card p-5 sm:p-6 border border-rose/30 flex items-start gap-3">
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
              <div className="px-4 sm:px-6 max-w-4xl mx-auto -mb-2 pt-6">
                <p className="text-[11px] font-mono text-text-secondary/70 flex items-center gap-1.5">
                  <Lock size={11} />
                  {result._usage.remaining} of {result._usage.limit} audits left today on the{" "}
                  {PLANS[result._usage.plan as PlanId].name} plan.{" "}
                  <Link href="/pricing" className="text-primary hover:underline">
                    Upgrade
                  </Link>
                </p>
              </div>
            )}
            <ScoreCard result={result} />
            <PerformanceMetrics result={result} />
            <RenderProof result={result} />
            <AuditModules modules={result.modules} />
            <DiffFixes result={result} />
            <PromoKit result={result} />
            <CompetitorBattle result={result} />
          </motion.div>
        )}
      </AnimatePresence>

      <Footer />
    </main>
  );
}
