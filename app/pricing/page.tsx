"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Mail, Globe, Loader2, ShieldCheck, Bitcoin, RefreshCw } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useAuth } from "@/context/AuthContext";
import { PLANS, PlanId } from "@/lib/plans";
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
  priceLabel: string;
  userEmail: string;
  uid: string;
  displayName: string;
}) {
  const subject = `Audityxe plan request: ${params.planName} (30 days)`;
  const body = [
    `Hi, I'd like to upgrade my Audityxe account.`,
    ``,
    `Account email: ${params.userEmail}`,
    `Account UID: ${params.uid}`,
    `Name: ${params.displayName || "(not set)"}`,
    `Plan requested: ${params.planName}`,
    `Duration: 30 days`,
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
  const [wasCancelled, setWasCancelled] = useState(false);
  useEffect(() => {
    // Plain window.location read rather than useSearchParams() — this
    // avoids the Suspense-boundary requirement that hook needs in the
    // App Router, for what's a purely cosmetic one-time banner check.
    if (typeof window !== "undefined" && new URLSearchParams(window.location.search).get("payment") === "cancelled") {
      setWasCancelled(true);
    }
  }, []);
  const [status, setStatus] = useState<AccountStatus | null>(null);
  const [statusLoading, setStatusLoading] = useState(false);
  const [cryptoBusy, setCryptoBusy] = useState<"standard" | "pro" | null>(null);
  const [cryptoError, setCryptoError] = useState("");
  const [subBusy, setSubBusy] = useState<"standard" | "pro" | null>(null);
  const [subMessage, setSubMessage] = useState("");

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

  async function handleCryptoBuy(planId: "standard" | "pro") {
    if (!user) {
      router.push(`/register?redirect=/pricing`);
      return;
    }
    setCryptoBusy(planId);
    setCryptoError("");
    try {
      const token = await getToken();
      const { ok, data, error } = await fetchJson<{ invoiceUrl: string }>(
        "/api/payments/nowpayments/create",
        {
          method: "POST",
          headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          body: JSON.stringify({ plan: planId }),
        }
      );
      if (ok && data?.invoiceUrl) {
        // NOWPayments hosts the whole checkout (currency choice, address,
        // QR, confirmation states) — hand off to it rather than
        // reimplementing any of that here.
        window.location.href = data.invoiceUrl;
        return;
      }
      setCryptoError(error || "Couldn't start crypto checkout. Please try again or use the email option.");
    } catch {
      setCryptoError("Couldn't start crypto checkout. Please try again or use the email option.");
    } finally {
      setCryptoBusy(null);
    }
  }

  /**
   * Starts an auto-renewing crypto subscription instead of a one-off
   * payment. NOWPayments emails the first payment link and a new one
   * before each renewal — there's no invoice URL to redirect to here,
   * so success means "check your email," not a navigation.
   */
  async function handleSubscribe(planId: "standard" | "pro") {
    if (!user) {
      router.push(`/register?redirect=/pricing`);
      return;
    }
    setSubBusy(planId);
    setSubMessage("");
    setCryptoError("");
    try {
      const token = await getToken();
      const { ok, data, error } = await fetchJson<{ message: string }>(
        "/api/payments/nowpayments/subscribe",
        {
          method: "POST",
          headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          body: JSON.stringify({ plan: planId }),
        }
      );
      if (ok && data?.message) {
        setSubMessage(data.message);
        return;
      }
      setCryptoError(error || "Couldn't start the subscription. Please try again or pay once instead.");
    } catch {
      setCryptoError("Couldn't start the subscription. Please try again or pay once instead.");
    } finally {
      setSubBusy(null);
    }
  }

  function handleBuy(planId: "standard" | "pro") {
    if (!user) {
      router.push(`/register?redirect=/pricing`);
      return;
    }
    const plan = PLANS[planId];
    const priceLabel = formatPrice(plan.priceUsd, currency);

    const href = buildBuyMailto({
      planName: plan.name,
      priceLabel,
      userEmail: user.email || "(no email on file)",
      uid: user.uid,
      displayName: user.displayName || "",
    });
    window.location.href = href;
  }

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
          {wasCancelled && (
            <div className="max-w-md mx-auto mb-6 text-center text-xs text-text-secondary glass rounded-card px-4 py-2.5">
              Checkout was cancelled — nothing was charged. Pick a plan below whenever you&apos;re ready.
            </div>
          )}
          <div className="text-center mb-8 sm:mb-10">
            <p className="text-xs font-mono text-text-secondary mb-3">PRICING</p>
            <h1 className="font-display font-bold text-3xl sm:text-4xl md:text-5xl tracking-tight text-gradient mb-4">
              Simple, <span className="hand-underline">usage-based</span> plans
            </h1>
            <p className="text-text-secondary text-sm sm:text-base max-w-lg mx-auto">
              Every plan gets the full audit engine — all 6 score categories and the full multi-area
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

          <div className="grid md:grid-cols-3 gap-5 sm:gap-6">
            {Object.values(PLANS).map((plan) => {
              const usdPrice = plan.priceUsd;
              const isFree = plan.id === "free";
              const isCurrentPlan = status?.plan === plan.id;

              return (
                <div
                  key={plan.id}
                  className={`glass rounded-card p-6 sm:p-7 flex flex-col relative ${
                    plan.id === "standard" ? "border-primary/50" : ""
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
                    ) : (
                      formatPrice(usdPrice, currency)
                    )}
                    {!isFree && <span className="text-sm font-normal text-text-secondary">/mo</span>}
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
                      className="w-full text-center py-3 rounded-card glass font-semibold text-sm hover:border-[rgb(var(--color-text-primary)/0.2)] transition"
                    >
                      {isCurrentPlan ? "You're on Free" : user ? "Downgrade automatically at expiry" : "Get started free"}
                    </Link>
                  ) : isCurrentPlan ? (
                    <Link
                      href="/account"
                      className="w-full text-center py-3 rounded-card glass font-semibold text-sm hover:border-[rgb(var(--color-text-primary)/0.2)] transition"
                    >
                      Manage in account
                    </Link>
                  ) : (
                    <div className="space-y-2">
                      <button
                        onClick={() => handleCryptoBuy(plan.id as "standard" | "pro")}
                        disabled={cryptoBusy !== null || subBusy !== null}
                        className="w-full flex items-center justify-center gap-2 py-3 rounded-card bg-primary text-white font-semibold text-sm hover:brightness-110 transition disabled:opacity-60"
                      >
                        {cryptoBusy === plan.id ? (
                          <Loader2 size={15} className="animate-spin" />
                        ) : (
                          <Bitcoin size={15} />
                        )}
                        {user ? `Pay with crypto` : "Sign in to buy"}
                      </button>
                      {user && (plan.id === "standard" || plan.id === "pro") && (
                        <button
                          onClick={() => handleSubscribe(plan.id as "standard" | "pro")}
                          disabled={cryptoBusy !== null || subBusy !== null}
                          className="w-full flex items-center justify-center gap-2 py-2 rounded-card border border-primary/30 text-primary font-semibold text-xs hover:bg-primary/5 transition disabled:opacity-60"
                        >
                          {subBusy === plan.id ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                          Or auto-renew monthly by email
                        </button>
                      )}
                      <button
                        onClick={() => handleBuy(plan.id as "standard" | "pro")}
                        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-card glass font-semibold text-xs hover:border-[rgb(var(--color-text-primary)/0.2)] transition"
                      >
                        <Mail size={13} />
                        Or pay another way
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {cryptoError && (
            <p className="max-w-2xl mx-auto mt-6 text-xs text-rose text-center">{cryptoError}</p>
          )}
          {subMessage && (
            <p className="max-w-2xl mx-auto mt-6 text-xs text-emerald text-center">{subMessage}</p>
          )}

          <p className="max-w-2xl mx-auto mt-6 text-xs text-text-secondary text-center">
            Crypto payments are processed by NOWPayments. Plans are paid per period and don&apos;t
            auto-renew. See the{" "}
            <Link href="/refund-policy" className="text-primary hover:underline">
              Refund Policy
            </Link>{" "}
            before paying.
          </p>

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
                Access is granted manually within 24 hours, for 30 days. Once granted, this page
                updates automatically the next time you load it or switch back to this tab.
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
              <div className="overflow-x-auto">
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
                      ["All 6 score categories + multi-area deep audit", true, true, true],
                      ["Written verdict + promo copy", true, true, true],
                      ["Daily audits", String(PLANS.free.dailyAudits), String(PLANS.standard.dailyAudits), String(PLANS.pro.dailyAudits)],
                      ["Competitor comparison", PLANS.free.competitorAudits, PLANS.standard.competitorAudits, PLANS.pro.competitorAudits],
                      ["Lighthouse & CrUX (bring your own free Google Cloud key)", true, true, true],
                      ["Shared Lighthouse key — no key setup needed (1 run/week)", false, false, true],
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
      </div>
      <Footer />
    </main>
  );
}
