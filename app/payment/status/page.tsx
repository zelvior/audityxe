"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, Clock, ArrowRight, RefreshCw } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useAuth } from "@/context/AuthContext";
import { fetchJson } from "@/lib/fetch-json";
import { PLANS } from "@/lib/plans";

type LiveStatus = "checking" | "pending" | "credited" | "error";

const POLL_INTERVAL_MS = 5000;
const MAX_POLL_MS = 10 * 60 * 1000; // give up auto-polling after 10 minutes

function PaymentStatusInner() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("order_id");
  const { user, getToken, loading: authLoading } = useAuth();

  const [status, setStatus] = useState<LiveStatus>("checking");
  const [plan, setPlan] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [startedAt] = useState(() => Date.now());

  const poll = useCallback(async () => {
    if (!orderId || !user) return;
    try {
      const token = await getToken();
      const { ok, data } = await fetchJson<{ status: LiveStatus; plan: string | null; error?: string }>(
        `/api/payments/nowpayments/status?order_id=${encodeURIComponent(orderId)}`,
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );
      if (ok && data) {
        setStatus(data.status === "credited" ? "credited" : "pending");
        setPlan(data.plan);
      } else {
        setError(data?.error || "Couldn't check payment status.");
      }
    } catch {
      setError("Couldn't check payment status.");
    }
  }, [orderId, user, getToken]);

  useEffect(() => {
    if (authLoading) return;
    if (!orderId) {
      setStatus("error");
      setError("No order to check — this page is reached after a NOWPayments checkout.");
      return;
    }
    if (!user) return; // will re-run once auth resolves

    poll();
    const interval = setInterval(() => {
      if (Date.now() - startedAt > MAX_POLL_MS) {
        clearInterval(interval);
        return;
      }
      poll();
    }, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [authLoading, user, orderId, poll, startedAt]);

  // Stop polling once credited.
  useEffect(() => {
    if (status !== "credited") return;
  }, [status]);

  const planLabel = plan && plan in PLANS ? PLANS[plan as keyof typeof PLANS].name : plan;

  return (
    <main className="min-h-screen flex flex-col">
      <Header />
      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 py-12">
        <div className="max-w-md w-full text-center">
          <AnimatePresence mode="wait">
            {status === "credited" ? (
              <motion.div key="credited" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                <span className="flex items-center justify-center w-14 h-14 rounded-full bg-emerald/10 border border-emerald/30 mx-auto mb-4">
                  <CheckCircle2 size={26} className="text-emerald" />
                </span>
                <h1 className="font-display font-bold text-2xl mb-2">Payment confirmed.</h1>
                <p className="text-sm text-text-secondary mb-6">
                  {planLabel ? `Your account is now on the ${planLabel} plan.` : "Your account has been upgraded."}{" "}
                  Access is live immediately — no need to refresh anything else.
                </p>
                <Link
                  href="/account"
                  className="inline-flex items-center gap-2 h-11 px-5 rounded-btn bg-primary text-white text-sm font-semibold hover:brightness-110 transition"
                >
                  Go to your account <ArrowRight size={15} />
                </Link>
              </motion.div>
            ) : status === "error" ? (
              <motion.div key="error" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                <span className="flex items-center justify-center w-14 h-14 rounded-full bg-rose/10 border border-rose/30 mx-auto mb-4">
                  <Clock size={26} className="text-rose" />
                </span>
                <h1 className="font-display font-bold text-2xl mb-2">Couldn&apos;t check status</h1>
                <p className="text-sm text-text-secondary mb-6">{error}</p>
                <div className="flex items-center justify-center gap-3">
                  <button
                    onClick={poll}
                    className="inline-flex items-center gap-2 h-11 px-5 rounded-btn glass text-sm font-semibold hover:border-primary/40 transition"
                  >
                    <RefreshCw size={14} /> Try again
                  </button>
                  <Link href="/account" className="inline-flex items-center gap-2 h-11 px-5 rounded-btn bg-primary text-white text-sm font-semibold hover:brightness-110 transition">
                    Go to account
                  </Link>
                </div>
              </motion.div>
            ) : (
              <motion.div key="pending" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                <motion.span
                  className="flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 border border-primary/30 mx-auto mb-4"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                >
                  <Clock size={26} className="text-primary" />
                </motion.span>
                <h1 className="font-display font-bold text-2xl mb-2">Waiting for confirmation…</h1>
                <p className="text-sm text-text-secondary mb-2">
                  We&apos;ve received your checkout — now waiting for the network to confirm the
                  transaction. This usually takes a few minutes, but can take longer depending on
                  network congestion.
                </p>
                <p className="text-xs text-text-secondary/70 mb-6">
                  This page checks automatically every few seconds. You can safely close it and
                  come back — your account will update on its own the moment it&apos;s confirmed.
                </p>
                <Link href="/account" className="text-xs text-primary hover:underline">
                  Go to your account instead →
                </Link>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
      <Footer />
    </main>
  );
}

/** useSearchParams() requires a Suspense boundary in the App Router. */
export default function PaymentStatusPage() {
  return (
    <Suspense fallback={null}>
      <PaymentStatusInner />
    </Suspense>
  );
}
