"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, LayoutDashboard, Users, Ban, Clock, Tag } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useAuth } from "@/context/AuthContext";
import PasswordInput from "@/components/PasswordInput";
import { fetchJson } from "@/lib/fetch-json";

interface AdminStats {
  totalUsers: number;
  byPlan: { free: number; standard: number; pro: number };
  banned: number;
  suspended: number;
  redeemCodes: { total: number; active: number; totalRedemptions: number };
}

function StatCard({ icon: Icon, label, value }: { icon: any; label: string; value: string | number }) {
  return (
    <div className="glass rounded-card p-4">
      <div className="flex items-center gap-2 text-xs text-text-secondary mb-1">
        <Icon size={13} /> {label}
      </div>
      <p className="text-2xl font-display font-bold">{value}</p>
    </div>
  );
}

export default function AdminDashboardPage() {
  const { user, loading, getToken } = useAuth();
  const router = useRouter();

  const [denyReason, setDenyReason] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminPassword, setAdminPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [checkingPassword, setCheckingPassword] = useState(false);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [fetching, setFetching] = useState(false);
  const [statsError, setStatsError] = useState("");

  useEffect(() => {
    if (!loading && !user) router.replace("/login?redirect=/admin/dashboard");
  }, [loading, user, router]);

  useEffect(() => {
    if (!denyReason) return;
    const t = setTimeout(() => router.replace("/account"), 6000);
    return () => clearTimeout(t);
  }, [denyReason, router]);

  const fetchStats = useCallback(
    async (pw: string) => {
      if (!user) return;
      setFetching(true);
      setStatsError("");
      try {
        const token = await getToken();
        const { ok, status, data, error } = await fetchJson<{ stats: AdminStats; code?: string }>("/api/admin/stats", {
          headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), "x-admin-password": pw },
        });
        if (status === 403) {
          if ((data as any)?.code === "NOT_ADMIN") {
            setDenyReason(
              `Signed in as ${user.email || "unknown email"} — this address isn't in ADMIN_EMAILS. Add it (comma-separated) in your Vercel env vars and redeploy.`
            );
            return;
          }
          setPasswordError(error || "Incorrect admin password.");
          return;
        }
        if (status === 429) {
          setPasswordError(error || "Too many attempts. Try again later.");
          return;
        }
        if (status === 401) {
          setDenyReason("Your session couldn't be verified — try signing out and back in. If this persists, the server's Firebase Admin credentials may be misconfigured.");
          return;
        }
        if (!ok || !data) throw new Error(error || "Couldn't load stats.");
        setIsAdmin(true);
        setStats(data.stats);
      } catch (err) {
        setStatsError(err instanceof Error ? err.message : "Something went wrong.");
      } finally {
        setFetching(false);
        setCheckingPassword(false);
      }
    },
    [user, getToken]
  );

  const submitPassword = useCallback(() => {
    if (!adminPassword.trim() || checkingPassword) return;
    setCheckingPassword(true);
    setPasswordError("");
    fetchStats(adminPassword);
  }, [adminPassword, checkingPassword, fetchStats]);

  if (loading || !user) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <Loader2 size={22} className="animate-spin text-text-secondary" />
      </main>
    );
  }

  if (denyReason) {
    return (
      <main className="min-h-screen flex items-center justify-center px-4">
        <div className="glass rounded-card p-6 max-w-sm text-center">
          <p className="text-sm font-semibold mb-2 text-rose">Admin access denied</p>
          <p className="text-xs text-text-secondary mb-4">{denyReason}</p>
          <p className="text-xs text-text-secondary/60">Redirecting to your account in a few seconds…</p>
        </div>
      </main>
    );
  }

  if (!isAdmin) {
    return (
      <>
        <Header />
        <main className="min-h-screen flex items-center justify-center px-4">
          <div className="glass rounded-card p-6 w-full max-w-sm">
            <span className="text-sm font-semibold mb-3 block">Admin password required</span>
            <PasswordInput
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submitPassword()}
              placeholder="Password"
              autoFocus
              className="w-full rounded-card bg-[rgb(var(--color-text-primary)/0.045)] border border-border px-3 py-2 text-sm mb-3 focus:outline-none focus:border-primary/50"
              disabled={checkingPassword}
            />
            {passwordError && <p className="text-xs text-rose mb-3">{passwordError}</p>}
            <button
              onClick={submitPassword}
              disabled={checkingPassword || !adminPassword.trim()}
              className="w-full py-2 rounded-card bg-primary text-white text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {checkingPassword ? <Loader2 size={14} className="animate-spin" /> : "Continue"}
            </button>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="min-h-screen pt-28 pb-20 px-4 max-w-3xl mx-auto">
        <Link href="/account" className="inline-flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary mb-6">
          <ArrowLeft size={16} /> Back to account
        </Link>

        <h1 className="font-display font-bold text-2xl mb-1 flex items-center gap-2">
          <LayoutDashboard size={20} className="text-primary" /> Dashboard
        </h1>
        <p className="text-sm text-text-secondary mb-6">Live overview across users and redeem codes.</p>

        {fetching && (
          <div className="flex items-center gap-2 text-sm text-text-secondary">
            <Loader2 size={14} className="animate-spin" /> Loading…
          </div>
        )}
        {statsError && !fetching && <p className="text-sm text-rose">{statsError}</p>}

        {!fetching && stats && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <StatCard icon={Users} label="Total users" value={stats.totalUsers} />
            <StatCard icon={Users} label="Free plan" value={stats.byPlan.free} />
            <StatCard icon={Users} label="Standard plan" value={stats.byPlan.standard} />
            <StatCard icon={Users} label="Pro plan" value={stats.byPlan.pro} />
            <StatCard icon={Ban} label="Banned" value={stats.banned} />
            <StatCard icon={Clock} label="Suspended" value={stats.suspended} />
            <StatCard icon={Tag} label="Redeem codes" value={stats.redeemCodes.total} />
            <StatCard icon={Tag} label="Active codes" value={stats.redeemCodes.active} />
            <StatCard icon={Tag} label="Total redemptions" value={stats.redeemCodes.totalRedemptions} />
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}
