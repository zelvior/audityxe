"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Mail, Globe, Loader2, ShieldCheck } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useAuth } from "@/context/AuthContext";
import { PLANS, PlanDuration, PlanId, priceForDuration } from "@/lib/plans";
import { useCurrency, formatPrice } from "@/lib/currency";
import { fetchJson } from "@/lib/fetch-json";
import { breadcrumbJsonLd } from "@/lib/breadcrumb";

const ADMIN_EMAIL = "zelvior@proton.me";

interface AccountStatus {
  plan: PlanId;
  planExpiresAt: string | null;
  planExpired: boolean;
}

function buildBuyMailto(params: {
  planName: string;
  duration: PlanDuration;
  priceLabel: string;
  userEmail: string;
  uid: string;
  displayName: string;
}) {
  const subject = `Audityxe plan request: ${params.planName} (${params.duration} days)`;
  const body = [
    `Hi, I'd like to upgrade my Audityxe account.`,
    ``,
    `Account email: ${params.userEmail}`,
    `Account UID: ${params.uid}`,
    `Name: ${params.displayName || "(not set)"}`,
    `Plan requested: ${params.planName}`,
    `Duration: ${params.duration} days`,
    `Price shown: ${params.priceLabel}`,
    ``,
    `I've attached a screenshot of my payment to this email.`,
    ``,
    `(Please attach your payment screenshot as a file before sending this email — it can't be attached automatically.)`,
  ].join("\n");
  return `mailto:${ADMIN_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export default function PricingPage() {
  const { user, getToken } = useAuth();
  const router = useRouter();
  const currency = useCurrency();
  const [duration, setDuration] = useState<PlanDuration>(30);

  const maxAnnualSavingsPct = Math.round(
    Math.max(
      ...Object.values(PLANS)
        .filter((p) => p.priceUsd30 > 0)
        .map((p) => (1 - p.priceUsd365 / (p.priceUsd30 * 12)) * 100)
    )
  );
  const [status, setStatus] = useState<AccountStatus | null>(null);
  const [statusLoading, setStatusLoading] = useState(false);
  const [promoInput, setPromoInput] = useState("");
  const [promo, setPromo] = useState<{ code: string; plan: PlanId; percentOff: number } | null>(null);
  const [promoError, setPromoError] = useState("");
  const [checkingPromo, setCheckingPromo] = useState(false);

  const refreshStatus = useCallback(async () => {
    if (!user) {
      setStatus(null);
      return;
    }
    setStatusLoading(true);
    try {
      const token = await getToken();
      const { ok, data } = await fetchJson<AccountStatus>("/api/account", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (ok && data) {
        setStatus({ plan: data.plan, planExpiresAt: data.planExpiresAt, planExpired: data.planExpired });
      }
    } catch {
      // Non-critical — the buy flow still works even if we can't show current plan.
    } finally {
      setStatusLoading(false);
    }
  }, [user, getToken]);

  // Fetch on mount/sign-in, and again whenever the tab regains focus —
  // so a plan change made directly in Firestore (manual approval) shows
  // up here without needing to log out and back in.
  useEffect(() => {
    refreshStatus();
    function onFocus() {
      refreshStatus();
    }
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [refreshStatus]);

  function handleBuy(planId: "standard" | "pro") {
    if (!user) {
      router.push(`/register?redirect=/pricing`);
      return;
    }
    const plan = PLANS[planId];
    const usdPrice = priceForDuration(plan, duration);
    const promoApplies = promo && promo.plan === planId;
    const finalUsdPrice = promoApplies ? usdPrice * (1 - promo!.percentOff / 100) : usdPrice;
    const priceLabel = formatPrice(finalUsdPrice, currency) + (promoApplies ? ` (${promo!.percentOff}% off with ${promo!.code})` : "");

    if (promoApplies) {
      // Mark the code consumed the moment they actually proceed to
      // checkout with it applied — fire-and-forget is fine here since
      // the mailto navigation happens regardless of this call's outcome,
      // and a failed consume just means the code doesn't get marked
      // used (safer direction to fail in than double-charging usage).
      getToken().then((token) =>
        fetchJson("/api/discount/consume", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          body: JSON.stringify({ code: promo!.code }),
        })
      );
    }

    const href = buildBuyMailto({
      planName: plan.name,
      duration,
      priceLabel,
      userEmail: user.email || "(no email on file)",
      uid: user.uid,
      displayName: user.displayName || "",
    });
    window.location.href = href;
  }

  const applyPromo = useCallback(async () => {
    if (!promoInput.trim() || checkingPromo) return;
    setCheckingPromo(true);
    setPromoError("");
    try {
      const token = user ? await getToken() : null;
      const { ok, data, error } = await fetchJson<{ plan: PlanId; percentOff: number }>("/api/discount/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ code: promoInput }),
      });
      if (!ok || !data) throw new Error(error || "That code isn't valid.");
      setPromo({ code: promoInput.trim().toUpperCase(), plan: data.plan, percentOff: data.percentOff });
    } catch (err) {
      setPromo(null);
      setPromoError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setCheckingPromo(false);
    }
  }, [promoInput, checkingPromo, user, getToken]);

  return (
    <main className="min-h-screen flex flex-col">
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbJsonLd("Pricing", "pricing")).replace(/</g, "\\u003c"),
        }}
      />
      <Header />
      <div className="flex-1 px-4 sm:px-8 py-16 sm:py-24">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-8 sm:mb-10">
            <p className="text-xs font-mono text-text-secondary mb-3">PRICING</p>
            <h1 className="font-display font-bold text-3xl sm:text-4xl md:text-5xl tracking-tight text-gradient mb-4">
              Simple, usage-based plans
            </h1>
            <p className="text-text-secondary text-sm sm:text-base max-w-lg mx-auto">
              Every plan gets the full audit engine — all 6 score categories and the full 17-area
              deep audit. Higher tiers get more audits per day and competitor comparisons.
            </p>
            <p className="text-[11px] font-mono text-text-secondary/60 mt-3 flex items-center justify-center gap-1.5">
              <Globe size={12} />
              {currency.loading
                ? "Detecting your local currency…"
                : currency.isFallback
                ? "Prices shown in USD"
                : `Prices converted to ${currency.currencyCode} at today's rate`}
            </p>
            {status && (
              <p className="text-[11px] font-mono text-emerald mt-2 flex items-center justify-center gap-1.5">
                <ShieldCheck size={12} />
                You're currently on the {PLANS[status.plan].name} plan
                {status.planExpiresAt && !status.planExpired
                  ? ` (until ${new Date(status.planExpiresAt).toLocaleDateString()})`
                  : ""}
                {statusLoading ? "…" : ""}
              </p>
            )}
          </div>

          <div className="flex items-center justify-center gap-1 p-1 rounded-full glass w-fit mx-auto mb-6 text-xs font-mono">
            <button
              onClick={() => setDuration(30)}
              className={`px-4 py-1.5 rounded-full transition ${duration === 30 ? "bg-primary/20 text-primary" : "text-text-secondary"}`}
            >
              30 days
            </button>
            <button
              onClick={() => setDuration(365)}
              className={`px-4 py-1.5 rounded-full transition ${duration === 365 ? "bg-primary/20 text-primary" : "text-text-secondary"}`}
            >
              365 days <span className="text-emerald">· save up to {maxAnnualSavingsPct}%</span>
            </button>
          </div>

          <div className="max-w-xs mx-auto mb-8 sm:mb-10">
            {promo ? (
              <div className="glass rounded-card px-4 py-2.5 flex items-center justify-between text-xs">
                <span className="text-emerald font-semibold">
                  {promo.percentOff}% off {PLANS[promo.plan].name} applied ({promo.code})
                </span>
                <button
                  onClick={() => {
                    setPromo(null);
                    setPromoInput("");
                  }}
                  className="text-text-secondary hover:text-white"
                >
                  Remove
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={promoInput}
                  onChange={(e) => setPromoInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && applyPromo()}
                  placeholder="Promo code"
                  className="flex-1 min-w-0 rounded-card bg-white/5 border border-white/10 px-3 py-2 text-xs font-mono uppercase focus:outline-none focus:border-primary/50"
                  disabled={checkingPromo}
                />
                <button
                  onClick={applyPromo}
                  disabled={checkingPromo || !promoInput.trim()}
                  className="px-3 py-2 rounded-card glass text-xs font-semibold disabled:opacity-50 flex items-center gap-1.5"
                >
                  {checkingPromo ? <Loader2 size={12} className="animate-spin" /> : "Apply"}
                </button>
              </div>
            )}
            {promoError && !promo && <p className="text-[11px] text-rose mt-1.5 text-center">{promoError}</p>}
          </div>

          <div className="grid md:grid-cols-3 gap-5 sm:gap-6">
            {Object.values(PLANS).map((plan) => {
              const usdPrice = priceForDuration(plan, duration);
              const promoApplies = promo && promo.plan === plan.id;
              const discountedUsdPrice = promoApplies ? usdPrice * (1 - promo!.percentOff / 100) : usdPrice;
              const isFree = plan.id === "free";
              const isCurrentPlan = status?.plan === plan.id;

              return (
                <div
                  key={plan.id}
                  className={`glass rounded-card p-6 sm:p-7 flex flex-col relative ${
                    plan.id === "standard" ? "border-primary/50 shadow-glow" : ""
                  } ${isCurrentPlan ? "ring-2 ring-emerald/50" : ""}`}
                >
                  {isCurrentPlan ? (
                    <span className="self-start text-[10px] font-mono px-2.5 py-1 rounded-full bg-emerald/20 text-emerald mb-3">
                      YOUR CURRENT PLAN
                    </span>
                  ) : (
                    plan.id === "standard" && (
                      <span className="self-start text-[10px] font-mono px-2.5 py-1 rounded-full bg-primary/20 text-primary mb-3">
                        MOST POPULAR
                      </span>
                    )
                  )}
                  <h2 className="font-display font-bold text-xl mb-1">{plan.name}</h2>
                  <p className="text-3xl font-display font-bold mb-1 flex items-center gap-2 flex-wrap">
                    {currency.loading && !isFree ? (
                      <Loader2 size={20} className="animate-spin text-text-secondary" />
                    ) : promoApplies ? (
                      <>
                        <span className="line-through text-text-secondary/50 text-xl">{formatPrice(usdPrice, currency)}</span>
                        <span className="text-emerald">{formatPrice(discountedUsdPrice, currency)}</span>
                      </>
                    ) : (
                      formatPrice(usdPrice, currency)
                    )}
                    {!isFree && <span className="text-sm font-normal text-text-secondary">/ {duration}d</span>}
                  </p>
                  <p className="text-xs text-text-secondary mb-6">{plan.tagline}</p>

                  <ul className="space-y-2.5 mb-8 flex-1">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-center gap-2 text-sm text-text-secondary leading-snug">
                        <Check size={15} className="text-emerald shrink-0" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>

                  {isFree ? (
                    <Link
                      href={user ? "/account" : "/register"}
                      className="w-full text-center py-3 rounded-card glass font-semibold text-sm hover:border-white/20 transition"
                    >
                      {isCurrentPlan ? "You're on Free" : user ? "Downgrade automatically at expiry" : "Get started free"}
                    </Link>
                  ) : isCurrentPlan ? (
                    <Link
                      href="/account"
                      className="w-full text-center py-3 rounded-card glass font-semibold text-sm hover:border-white/20 transition"
                    >
                      Manage in account
                    </Link>
                  ) : (
                    <button
                      onClick={() => handleBuy(plan.id as "standard" | "pro")}
                      className="w-full flex items-center justify-center gap-2 py-3 rounded-card bg-secondary font-semibold text-sm hover:brightness-110 transition"
                    >
                      <Mail size={15} />
                      {user ? `Get ${plan.name}` : "Sign in to buy"}
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          <div className="max-w-2xl mx-auto mt-10 sm:mt-12 glass rounded-card p-5 sm:p-6">
            <h3 className="font-display font-semibold text-sm mb-3">How upgrading works</h3>
            <ol className="space-y-2 text-sm text-text-secondary list-decimal list-inside">
              <li>Click "Get Standard" or "Get Pro" above (sign in first if you haven't).</li>
              <li>Your email client opens with your account details pre-filled.</li>
              <li>
                Attach a screenshot of your payment and send it to{" "}
                <a href={`mailto:${ADMIN_EMAIL}`} className="text-primary hover:underline">
                  {ADMIN_EMAIL}
                </a>
                .
              </li>
              <li>
                Access is granted manually within 24 hours for the duration you selected. Once
                granted, this page updates automatically the next time you load it or switch back
                to this tab.
              </li>
            </ol>
          </div>

          <p className="text-center text-xs text-text-secondary/70 mt-8">
            Limits reset daily at midnight UTC. Prices are estimated in your local currency using a
            live exchange rate and may vary slightly from your bank's conversion.{" "}
            <Link href="/contact" className="text-primary hover:underline">
              Questions? Get in touch
            </Link>
            .
          </p>

          {/* Full feature-by-feature comparison — moved here from the
              homepage's trust section so it lives with the rest of the
              pricing detail instead of being duplicated on the page
              people land on to actually run an audit. */}
          <div className="mt-14 sm:mt-16">
            <p className="text-center text-xs font-mono text-text-secondary mb-3">FEATURE COMPARISON</p>
            <div className="glass rounded-card overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-xs font-mono text-text-secondary">
                    <th className="text-left px-4 sm:px-5 py-3">Feature</th>
                    <th className="text-center px-3 py-3">Free</th>
                    <th className="text-center px-3 py-3">Standard</th>
                    <th className="text-center px-3 py-3">Pro</th>
                  </tr>
                </thead>
                <tbody className="text-text-secondary">
                  {[
                    ["All 6 score categories + 17-area deep audit", true, true, true],
                    ["Written verdict + promo copy", true, true, true],
                    ["Daily audits", String(PLANS.free.dailyAudits), String(PLANS.standard.dailyAudits), String(PLANS.pro.dailyAudits)],
                    ["Competitor comparison", PLANS.free.competitorAudits, PLANS.standard.competitorAudits, PLANS.pro.competitorAudits],
                    ["Bulk audit (up to 20 URLs)", false, false, true],
                  ].map(([feature, free, standard, pro], i) => (
                    <tr key={i} className="border-b border-border/50 last:border-0">
                      <td className="px-4 sm:px-5 py-3">{feature as string}</td>
                      {[free, standard, pro].map((val, j) => (
                        <td key={j} className="text-center px-3 py-3">
                          {typeof val === "boolean" ? (
                            val ? (
                              <Check size={15} className="text-emerald inline" />
                            ) : (
                              <span className="text-text-secondary/40 inline">—</span>
                            )
                          ) : (
                            <span className="font-mono text-xs">{val}</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </main>
  );
}
