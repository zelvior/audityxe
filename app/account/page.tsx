"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, LogOut, Loader2, Zap, Mail, ShieldCheck, History, ExternalLink } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useAuth } from "@/context/AuthContext";
import { PLANS, PlanId } from "@/lib/plans";

interface UsageData {
  plan: PlanId;
  used: number;
  limit: number;
  remaining: number;
  planExpiresAt: string | null;
  planExpired: boolean;
}

interface ReportSummary {
  id: string;
  url: string;
  overall: number;
  createdAt: string;
}

function scoreColor(score: number) {
  if (score >= 8) return "text-emerald";
  if (score >= 5) return "text-amber";
  return "text-rose";
}

export default function AccountPage() {
  const { user, loading, getToken, signOut } = useAuth();
  const router = useRouter();
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [usageError, setUsageError] = useState("");
  const [fetching, setFetching] = useState(true);
  const [reports, setReports] = useState<ReportSummary[] | null>(null);
  const [reportsFetching, setReportsFetching] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login?redirect=/account");
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      setFetching(true);
      setUsageError("");
      try {
        const token = await getToken();
        const res = await fetch("/api/account", {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Couldn't load account usage.");
        if (!cancelled) setUsage(data);
      } catch (err) {
        if (!cancelled) setUsageError(err instanceof Error ? err.message : "Something went wrong.");
      } finally {
        if (!cancelled) setFetching(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, getToken]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      setReportsFetching(true);
      try {
        const token = await getToken();
        const res = await fetch("/api/reports", {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const data = await res.json();
        if (res.ok && !cancelled) setReports(data.reports || []);
      } catch {
        // History is a nice-to-have — fail silently rather than blocking the page.
      } finally {
        if (!cancelled) setReportsFetching(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, getToken]);

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
            <ArrowLeft size={14} /> Back to Audityxe
          </Link>

          <h1 className="font-display font-bold text-2xl sm:text-3xl tracking-tight mb-6">
            Your account
          </h1>

          <div className="glass rounded-2xl p-5 sm:p-6 mb-5 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center font-display font-bold text-sm shrink-0">
                {(user.displayName || user.email || "?").charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-sm truncate">{user.displayName || "Audityxe user"}</p>
                <p className="text-xs text-text-secondary flex items-center gap-1 truncate">
                  <Mail size={11} className="shrink-0" /> {user.email}
                </p>
              </div>
            </div>
          </div>

          <div className="glass rounded-2xl p-5 sm:p-6 mb-5">
            <div className="flex items-center justify-between mb-4">
              <span className="flex items-center gap-2 text-sm font-semibold">
                <Zap size={15} className="text-primary" /> Usage today
              </span>
              {plan && (
                <span className="text-xs font-mono px-2.5 py-1 rounded-full bg-primary/15 text-primary">
                  {plan.name} plan
                </span>
              )}
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
            <div className="glass rounded-2xl p-5 sm:p-6 mb-5">
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

          <div className="glass rounded-2xl p-5 sm:p-6 mb-5">
            <span className="flex items-center gap-2 text-sm font-semibold mb-3">
              <History size={15} className="text-primary" /> Audit history
            </span>
            {reportsFetching && (
              <div className="flex items-center gap-2 text-sm text-text-secondary py-2">
                <Loader2 size={14} className="animate-spin" /> Loading history…
              </div>
            )}
            {!reportsFetching && reports && reports.length === 0 && (
              <p className="text-sm text-text-secondary">
                No audits yet — run your first one from the homepage.
              </p>
            )}
            {!reportsFetching && reports && reports.length > 0 && (
              <ul className="space-y-2">
                {reports.map((r) => (
                  <li key={r.id}>
                    <Link
                      href={`/report/${r.id}`}
                      target="_blank"
                      className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 transition group"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{r.url}</p>
                        <p className="text-[11px] text-text-secondary">
                          {new Date(r.createdAt).toLocaleDateString(undefined, {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`font-display font-bold text-sm ${scoreColor(r.overall)}`}>
                          {r.overall.toFixed(1)}
                        </span>
                        <ExternalLink size={13} className="text-text-secondary group-hover:text-primary transition" />
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <button
            onClick={async () => {
              await signOut();
              router.push("/");
            }}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl glass text-sm font-semibold text-rose hover:bg-rose/10 transition"
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
