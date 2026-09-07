"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, LogOut, Loader2, Zap, Mail, ShieldCheck, RefreshCw, BadgeCheck, Settings as SettingsIcon, Tag, LayoutDashboard, Megaphone, History } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useAuth } from "@/context/AuthContext";
import { PLANS, PlanId } from "@/lib/plans";
import { fetchJson } from "@/lib/fetch-json";

interface UsageData {
  plan: PlanId;
  used: number;
  limit: number;
  remaining: number;
  planExpiresAt: string | null;
  planExpired: boolean;
}

export default function AccountPage() {
  const { user, loading, getToken, signOut } = useAuth();
  const router = useRouter();
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [usageError, setUsageError] = useState("");
  const [fetching, setFetching] = useState(true);
  const [code, setCode] = useState("");
  const [redeeming, setRedeeming] = useState(false);
  const [redeemError, setRedeemError] = useState("");
  const [redeemSuccess, setRedeemSuccess] = useState("");

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login?redirect=/account");
    }
  }, [loading, user, router]);

  const fetchUsage = useCallback(async () => {
    if (!user) return;
    setFetching(true);
    setUsageError("");
    try {
      const token = await getToken();
      const { ok, data, error } = await fetchJson<UsageData>("/api/account", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!ok || !data) throw new Error(error || "Couldn't load account usage.");
      setUsage(data);
    } catch (err) {
      setUsageError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setFetching(false);
    }
  }, [user, getToken]);

  useEffect(() => {
    fetchUsage();
    // Refresh whenever the tab regains focus, so a plan change made
    // directly in Firestore (manual approval) is reflected without
    // requiring a logout/login or manual page reload.
    function onFocus() {
      fetchUsage();
    }
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [fetchUsage]);

  const redeemCode = useCallback(async () => {
    if (!code.trim() || redeeming) return;
    setRedeeming(true);
    setRedeemError("");
    setRedeemSuccess("");
    try {
      const token = await getToken();
      const { ok, data, error } = await fetchJson<{ plan: PlanId; planExpiresAt: string | null }>(
        "/api/account/redeem-code",
        {
          method: "POST",
          headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          body: JSON.stringify({ code }),
        }
      );
      if (!ok || !data) throw new Error(error || "That code isn't valid.");
      setRedeemSuccess(`${PLANS[data.plan].name} plan activated!`);
      setCode("");
      fetchUsage();
    } catch (err) {
      setRedeemError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setRedeeming(false);
    }
  }, [code, redeeming, getToken, fetchUsage]);

  if (loading || !user) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <Loader2 size={22} className="animate-spin text-text-secondary" />
      </main>
    );
  }

  const plan = usage ? PLANS[usage.plan] : null;
  const pct = usage ? Math.min(100, Math.round((usage.used / usage.limit) * 100)) : 0;

  return (
    <main className="min-h-screen flex flex-col">
      <Header />
      <div className="flex-1 px-4 sm:px-6 py-8 sm:py-12">
        <div className="max-w-lg mx-auto">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm text-text-secondary hover:text-primary transition mb-6 sm:mb-8"
          >
            <ArrowLeft size={14} /> Back
          </Link>

          <h1 className="font-display font-bold text-2xl sm:text-3xl tracking-tight mb-6">
            Your account
          </h1>

          <div className="glass rounded-card p-5 sm:p-6 mb-5 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center font-display font-bold text-sm shrink-0">
                {(user.displayName || user.email || "?").charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-sm truncate">{user.displayName || "Account"}</p>
                <p className="text-xs text-text-secondary flex items-center gap-1 truncate">
                  <Mail size={11} className="shrink-0" /> {user.email}
                </p>
              </div>
              {user.emailVerified ? (
                <span className="ml-auto shrink-0 text-[10px] font-mono px-2 py-1 rounded-full bg-emerald/15 text-emerald flex items-center gap-1">
                  <BadgeCheck size={11} /> Verified
                </span>
              ) : (
                <Link
                  href="/verify-email"
                  className="ml-auto shrink-0 text-[10px] font-mono px-2 py-1 rounded-full bg-amber/15 text-amber hover:bg-amber/25 transition"
                >
                  Unverified — fix this
                </Link>
              )}
            </div>
          </div>

          <div className="glass rounded-card p-5 sm:p-6 mb-5">
            <div className="flex items-center justify-between mb-4">
              <span className="flex items-center gap-2 text-sm font-semibold">
                <Zap size={15} className="text-primary" /> Usage today
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={fetchUsage}
                  disabled={fetching}
                  className="text-text-secondary hover:text-primary transition disabled:opacity-40"
                  title="Refresh"
                  aria-label="Refresh account status"
                >
                  <RefreshCw size={14} className={fetching ? "animate-spin" : ""} />
                </button>
                {plan && (
                  <span className="text-xs font-mono px-2.5 py-1 rounded-full bg-primary/15 text-primary">
                    {plan.name} plan
                  </span>
                )}
              </div>
            </div>

            {usage?.planExpired && (
              <p className="text-xs text-amber bg-amber/10 border border-amber/30 rounded-lg px-3 py-2 mb-3">
                Your paid plan expired and you've been moved back to Free.{" "}
                <Link href="/pricing" className="underline">
                  Renew on the pricing page
                </Link>
                .
              </p>
            )}
            {usage?.planExpiresAt && !usage.planExpired && (
              <p className="text-xs text-text-secondary mb-3">
                Access expires {new Date(usage.planExpiresAt).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}.
              </p>
            )}

            {fetching && (
              <div className="flex items-center gap-2 text-sm text-text-secondary py-4">
                <Loader2 size={14} className="animate-spin" /> Loading usage…
              </div>
            )}

            {usageError && !fetching && (
              <p className="text-sm text-rose">{usageError}</p>
            )}

            {usage && !fetching && (
              <>
                <div className="flex items-end justify-between mb-2">
                  <span className="font-display font-bold text-2xl">{usage.used}</span>
                  <span className="text-xs text-text-secondary font-mono">
                    of {usage.limit} audits used
                  </span>
                </div>
                <div className="h-2 rounded-full bg-surface2 overflow-hidden mb-1">
                  <div
                    className={`h-full rounded-full ${pct >= 90 ? "bg-rose" : pct >= 60 ? "bg-amber" : "bg-emerald"}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <p className="text-xs text-text-secondary">
                  {usage.remaining > 0
                    ? `${usage.remaining} audit${usage.remaining === 1 ? "" : "s"} remaining today.`
                    : "You've used all your audits for today. Resets at midnight UTC."}
                </p>
              </>
            )}
          </div>

          {plan && (
            <div className="glass rounded-card p-5 sm:p-6 mb-5">
              <span className="flex items-center gap-2 text-sm font-semibold mb-3">
                <ShieldCheck size={15} className="text-emerald" /> Plan features
              </span>
              <ul className="space-y-2">
                {plan.features.map((f) => (
                  <li key={f} className="text-sm text-text-secondary flex items-start gap-2">
                    <span className="text-emerald mt-1">•</span> {f}
                  </li>
                ))}
              </ul>
              <Link
                href="/pricing"
                className="mt-4 inline-block text-xs font-mono text-primary hover:underline"
              >
                View all plans →
              </Link>
            </div>
          )}

          <div className="glass rounded-card p-5 sm:p-6 mb-5">
            <span className="flex items-center gap-2 text-sm font-semibold mb-3">
              <Tag size={15} className="text-primary" /> Have a discount code?
            </span>
            <div className="flex gap-2">
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && redeemCode()}
                placeholder="Enter code"
                className="flex-1 min-w-0 rounded-card bg-white/5 border border-white/10 px-3 py-2 text-sm font-mono uppercase focus:outline-none focus:border-primary/50"
                disabled={redeeming}
              />
              <button
                onClick={redeemCode}
                disabled={redeeming || !code.trim()}
                className="px-4 py-2 rounded-card bg-primary text-black text-sm font-semibold disabled:opacity-50 flex items-center gap-2"
              >
                {redeeming ? <Loader2 size={14} className="animate-spin" /> : "Redeem"}
              </button>
            </div>
            {redeemError && <p className="text-xs text-rose mt-2">{redeemError}</p>}
            {redeemSuccess && <p className="text-xs text-emerald mt-2">{redeemSuccess}</p>}
          </div>

          <p className="text-xs text-text-secondary/70 mb-5 px-1">
            Audits aren't stored on our servers after they run — each result exists only in your
            browser, for your privacy. Use the copy/export/share buttons on a result to keep a
            copy for yourself.
          </p>

          {/* Admin links are shown to any signed-in, verified user — there's
              no hardcoded email here. The actual gate is entirely
              server-side (ADMIN_EMAILS allowlist + ADMIN_PASSWORD) in
              lib/admin.ts; a non-admin clicking through gets a clear
              "access denied" message on the admin page itself rather than
              this link being conditioned on a baked-in address. */}
          {user.emailVerified && (
            <>
              <Link
                href="/admin/dashboard"
                className="w-full flex items-center justify-center gap-2 py-3 rounded-card glass text-sm font-semibold hover:border-white/20 transition mb-3"
              >
                <LayoutDashboard size={16} /> Dashboard
              </Link>
              <Link
                href="/admin/discount-codes"
                className="w-full flex items-center justify-center gap-2 py-3 rounded-card glass text-sm font-semibold hover:border-white/20 transition mb-3"
              >
                <Tag size={16} /> Manage discount codes
              </Link>
              <Link
                href="/admin/users"
                className="w-full flex items-center justify-center gap-2 py-3 rounded-card glass text-sm font-semibold hover:border-white/20 transition mb-3"
              >
                <ShieldCheck size={16} /> Manage users
              </Link>
              <Link
                href="/admin/announcement"
                className="w-full flex items-center justify-center gap-2 py-3 rounded-card glass text-sm font-semibold hover:border-white/20 transition mb-3"
              >
                <Megaphone size={16} /> Site announcement
              </Link>
              <Link
                href="/admin/activity"
                className="w-full flex items-center justify-center gap-2 py-3 rounded-card glass text-sm font-semibold hover:border-white/20 transition mb-3"
              >
                <History size={16} /> Activity log
              </Link>
            </>
          )}

          <Link
            href="/settings"
            className="w-full flex items-center justify-center gap-2 py-3 rounded-card glass text-sm font-semibold hover:border-white/20 transition mb-3"
          >
            <SettingsIcon size={16} />
            Settings
          </Link>

          <button
            onClick={async () => {
              try {
                await signOut();
              } catch {
                // Best-effort — still navigate away even if the sign-out
                // call itself fails (e.g. a transient network error);
                // onAuthStateChanged will reconcile the session state.
              }
              router.push("/");
            }}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-card glass text-sm font-semibold text-rose hover:bg-rose/10 transition"
          >
            <LogOut size={16} />
            Sign out
          </button>
        </div>
      </div>
      <Footer />
    </main>
  );
}
