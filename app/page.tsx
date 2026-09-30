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

const FAQ_SCHEMA = [
  {
    q: "How do I audit a website for free?",
    a: "Paste any URL into Audityxe's website checker and click Analyze. It's a free website audit tool — sign up for a free account and you'll get a website quality score out of 10 across 6 categories: SEO, performance, accessibility, security, UX, and technical health.",
  },
  {
    q: "How are Audityxe's scores actually calculated?",
    a: "All category scores come from parsing the real, live HTML and HTTP response of the page being audited — heading structure, meta tags, security headers, redirect chains, robots.txt and sitemap.xml fetched live, and sampled broken-link/image checks. The same strict benchmark and weighting is applied to every website, so scores are comparable across audits and over time.",
  },
  {
    q: "What does Audityxe check in a website audit?",
    a: "Audityxe runs a technical SEO audit (titles, meta tags, headings, canonical tags, structured data), a website accessibility audit (alt text, contrast, form labels), a website security audit (HTTPS, HSTS, CSP, security headers), a website UX and conversion audit (mobile viewport, tap targets, broken links/images), and on Pro, a real browser-rendered performance audit via Google PageSpeed Insights covering Core Web Vitals.",
  },
  {
    q: "What's the difference between the Free, Standard, and Pro plans?",
    a: "Free gives a limited number of audits per day with the full 6-category score and multi-area breakdown. Standard adds more daily audits and competitor head-to-head comparison. Pro adds real browser-rendered PageSpeed performance auditing, bulk audits for agencies, and AI-generated promo copy using your own API key.",
  },
  {
    q: "Is Audityxe's audit data stored?",
    a: "No — full audit results are computed fresh per request and returned directly to your browser, with no public report page or cross-account history. The one exception is a minimal per-domain score-and-date record used only to power the embeddable Audityxe badge.",
  },
];

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQ_SCHEMA.map((item) => ({
    "@type": "Question",
    name: item.q,
    acceptedAnswer: {
      "@type": "Answer",
      text: item.a,
    },
  })),
};

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
  const [scanningUrl, setScanningUrl] = useState("");
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
  const [crawlMode, setCrawlMode] = useState<"fast" | "deep" | "max" | "ultra">("fast");
  const [runInBackground, setRunInBackground] = useState(false);
  const [backgroundJob, setBackgroundJob] = useState<{ jobId: string; token: string } | null>(null);
  const [jobProgress, setJobProgress] = useState<string[]>([]);
  const jobPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

  // Poll every 3s — cheap, plain HTTP polling rather than a streaming
  // connection, so it costs nothing extra if the tab is backgrounded and
  // keeps working after a page reload. Shared by a freshly started
  // background job and by reopening one from a notification tap.
  function pollJob(jobId: string, jobToken: string) {
    if (jobPollRef.current) clearInterval(jobPollRef.current);
    jobPollRef.current = setInterval(async () => {
      const poll = await fetchJson<{ status: "running" | "done" | "error"; progress: string[]; result: AuditResult | null; error: string | null; hostname?: string }>(
        `/api/audit/status/${jobId}?token=${encodeURIComponent(jobToken)}`
      );
      if (!poll.ok || !poll.data) return; // transient network hiccup — just try again next tick

      setJobProgress(poll.data.progress || []);

      if (poll.data.status === "done" && poll.data.result) {
        if (jobPollRef.current) clearInterval(jobPollRef.current);
        setActiveStep(SCAN_STEPS.length - 1);
        setResult(poll.data.result);
        setBackgroundJob(null);
        setPhase("results");
      } else if (poll.data.status === "error") {
        if (jobPollRef.current) clearInterval(jobPollRef.current);
        setErrorMsg(poll.data.error || "Failed to fetch and analyze the site.");
        setBackgroundJob(null);
        setPhase("error");
      }
    }, 3000);
  }

  // Notification tap → /?job=ID&token=TOKEN: reopen that audit's result
  // (or resume watching it if it's still running).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const jobId = params.get("job");
    const jobToken = params.get("token");
    if (!jobId || !jobToken) return;
    window.history.replaceState(null, "", window.location.pathname);
    (async () => {
      const first = await fetchJson<{ status: "running" | "done" | "error"; progress: string[]; result: AuditResult | null; error: string | null; hostname?: string }>(
        `/api/audit/status/${jobId}?token=${encodeURIComponent(jobToken)}`
      );
      if (!first.ok || !first.data) {
        setErrorMsg(first.error || "That audit couldn't be found — it may have expired.");
        setPhase("error");
        return;
      }
      if (first.data.status === "done" && first.data.result) {
        setResult(first.data.result);
        setPhase("results");
      } else if (first.data.status === "error") {
        setErrorMsg(first.data.error || "Failed to fetch and analyze the site.");
        setPhase("error");
      } else {
        setScanningUrl(first.data.hostname || "");
        setJobProgress(first.data.progress || []);
        setBackgroundJob({ jobId, token: jobToken });
        setActiveStep(1);
        setPhase("scanning");
        pollJob(jobId, jobToken);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleAnalyze(url: string, competitorUrl?: string) {
    if (needsEmailVerification) return;

    const confirmPageSpeed = wantsPageSpeed;
    // The background-job path is only offered for — and only makes
    // sense for — audits actually expected to run long (a real-browser
    // Lighthouse pass, or a deep multi-hop crawl). A quick fast-mode
    // audit finishes before the round-trip overhead of a job doc plus
    // polling would even pay for itself.
    const useBackgroundJob = runInBackground && (confirmPageSpeed || crawlMode === "deep" || crawlMode === "max" || crawlMode === "ultra");

    setPhase("scanning");
    setActiveStep(0);
    setScanningUrl(url.trim());
    setResult(null);
    setErrorMsg("");
    setRateLimited(null);
    setBackgroundJob(null);
    setJobProgress([]);
    if (jobPollRef.current) clearInterval(jobPollRef.current);

    let step = 0;
    // The step checklist is a client-side approximation, not real
    // backend progress (the API is one opaque request/response, not a
    // streaming one) — so its pace needs to roughly track how long the
    // request will actually take, or it finishes and sits there
    // looking "done" while the real audit keeps running underneath,
    // which is exactly the confusing/misleading state this is meant to
    // avoid. A real-browser (Lighthouse) pass alone can take up to 75s
    // (see PSI_TIMEOUT_MS), so pace much slower when one was requested.
    // Skipped entirely for the background-job path — that one has a
    // *real* progress feed (jobProgress, polled from the server below)
    // instead of this simulated one.
    const stepIntervalMs = confirmPageSpeed ? 9000 : crawlMode === "ultra" ? 4000 : crawlMode === "max" ? 3000 : crawlMode === "deep" ? 2200 : 900;
    if (!useBackgroundJob) {
      stepTimerRef.current = setInterval(() => {
        step = Math.min(step + 1, SCAN_STEPS.length - 1);
        setActiveStep(step);
      }, stepIntervalMs);
    }

    try {
      if (!user) {
        if (stepTimerRef.current) clearInterval(stepTimerRef.current);
        setErrorMsg("Please sign in to run an audit.");
        setPhase("error");
        return;
      }
      const token = await getToken();
      if (!token) {
        if (stepTimerRef.current) clearInterval(stepTimerRef.current);
        setErrorMsg("Your session has expired. Please sign in again.");
        setPhase("error");
        return;
      }

      if (useBackgroundJob) {
        const { ok, data, error } = await fetchJson<{ jobId: string; token: string; hostname: string; code?: string; plan?: PlanId; limit?: number }>(
          "/api/audit/start",
          {
            method: "POST",
            headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
            body: JSON.stringify({ url, competitorUrl, confirmPageSpeed, crawlMode }),
          }
        );
        if (!ok || !data) {
          if (data?.code === "RATE_LIMITED") setRateLimited({ plan: data.plan as PlanId, limit: data.limit as number });
          setErrorMsg(error || "Couldn't start that audit. Check the URL and try again.");
          setPhase("error");
          return;
        }

        setBackgroundJob({ jobId: data.jobId, token: data.token });
        setActiveStep(1);

        pollJob(data.jobId, data.token);
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
          body: JSON.stringify({ url, competitorUrl, confirmPageSpeed, crawlMode }),
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
      if (jobPollRef.current) clearInterval(jobPollRef.current);
      setErrorMsg("Network error while fetching that site. Check the URL and try again.");
      setPhase("error");
    }
  }

  useEffect(() => {
    return () => {
      if (stepTimerRef.current) clearInterval(stepTimerRef.current);
      if (jobPollRef.current) clearInterval(jobPollRef.current);
    };
  }, []);

  return (
    <main>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd).replace(/</g, "\\u003c") }}
      />
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-white focus:rounded-lg focus:outline-none"
      >
        Skip to main content
      </a>
      <div className="relative">
        {/* Full-bleed hero background. The source image DOES carry real
            alpha transparency at its own edges — but its fade-to-clear
            only really kicks in in roughly its last 5–8% of height, and
            object-cover here crops the tall source image down to a much
            shorter box, cutting it off well before that built-in fade
            ever completes. Net effect without a mask: a hard, visible
            edge exactly at the container boundary instead of a blend —
            so the fade is applied explicitly here via mask-image
            instead of relying on the source alone. Also dimmed further
            in dark mode, since the image was designed against the
            light theme's cream background and would otherwise read as
            a stark light patch against the near-black dark bg. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-[420px] sm:h-[520px] lg:h-[620px] -z-10 overflow-hidden"
          style={{
            maskImage: "linear-gradient(to bottom, black 0%, black 55%, transparent 96%)",
            WebkitMaskImage: "linear-gradient(to bottom, black 0%, black 55%, transparent 96%)",
          }}
        >
          <picture>
            <source srcSet="/hero-background.webp" type="image/webp" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/hero-background.png"
              alt=""
              width={1920}
              height={1080}
              className="w-full h-full object-cover object-top opacity-90 dark:opacity-25"
            />
          </picture>
          {/* Extra top-down scrim so header/hero text stays legible over
              the image regardless of where its brighter mountain peaks
              happen to land, without flattening the image's own colors. */}
          <div className="absolute inset-0 bg-gradient-to-b from-[rgb(var(--color-bg))]/10 via-transparent to-[rgb(var(--color-bg))]" />
        </div>

        <Header />
        <Onboarding />
        <div id="main-content">
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
          crawlMode={crawlMode}
          onCrawlModeChange={setCrawlMode}
        />
        {(wantsPageSpeed || crawlMode === "deep" || crawlMode === "max" || crawlMode === "ultra") && phase !== "scanning" && (
          <div className="max-w-xl mx-auto px-4 -mt-2 mb-2 relative">
            <label htmlFor="run-in-background" className="flex items-center justify-center gap-2 text-xs text-text-secondary cursor-pointer select-none">
              <input
                type="checkbox"
                id="run-in-background"
                checked={runInBackground}
                onChange={(e) => setRunInBackground(e.target.checked)}
                className="accent-primary w-3.5 h-3.5"
              />
              Run in the background — let me leave this page or close the tab
            </label>
          </div>
        )}
        </div>
      </div>

      {user && needsEmailVerification && <VerifyEmailBanner />}
      {phase === "idle" && <TrustSection />}

      <AnimatePresence mode="wait">
        {phase === "scanning" && (
          <motion.div key="scan" exit={{ opacity: 0 }}>
            <ScanProgress
              activeStep={activeStep}
              isLongRun={wantsPageSpeed || crawlMode === "deep" || crawlMode === "max" || crawlMode === "ultra"}
              scanningUrl={scanningUrl}
              progressLog={jobProgress}
              backgroundJob={backgroundJob}
            />
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
