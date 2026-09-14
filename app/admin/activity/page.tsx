"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, History } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useAuth } from "@/context/AuthContext";
import PasswordInput from "@/components/PasswordInput";
import { fetchJson } from "@/lib/fetch-json";

interface LogEntry {
  id: string;
  actorEmail: string;
  action: string;
  target: string | null;
  details: string | null;
  at: string | null;
}

const ACTION_LABELS: Record<string, string> = {
  create_discount_code: "Created discount code",
  enable_discount_code: "Enabled discount code",
  disable_discount_code: "Disabled discount code",
  delete_discount_code: "Deleted discount code",
  user_ban: "Banned user",
  user_suspend: "Suspended user",
  user_unban: "Unbanned user",
  user_set_plan: "Changed plan for",
  user_reset_usage: "Reset usage for",
  user_revoke_sessions: "Revoked sessions for",
};

export default function AdminActivityPage() {
  const { user, loading, getToken } = useAuth();
  const router = useRouter();

  const [denyReason, setDenyReason] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminPassword, setAdminPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [checkingPassword, setCheckingPassword] = useState(false);
  const [entries, setEntries] = useState<LogEntry[] | null>(null);
  const [fetching, setFetching] = useState(false);
  const [listError, setListError] = useState("");

  useEffect(() => {
    if (!loading && !user) router.replace("/login?redirect=/admin/activity");
  }, [loading, user, router]);

  useEffect(() => {
    if (!denyReason) return;
    const t = setTimeout(() => router.replace("/account"), 6000);
    return () => clearTimeout(t);
  }, [denyReason, router]);

  const fetchLog = useCallback(
    async (pw: string) => {
      if (!user) return;
      setFetching(true);
      setListError("");
      try {
        const token = await getToken();
        const { ok, status, data, error } = await fetchJson<{ entries: LogEntry[]; code?: string }>("/api/admin/activity", {
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
        if (!ok || !data) throw new Error(error || "Couldn't load activity.");
        setIsAdmin(true);
        setEntries(data.entries);
      } catch (err) {
        setListError(err instanceof Error ? err.message : "Something went wrong.");
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
    fetchLog(adminPassword);
  }, [adminPassword, checkingPassword, fetchLog]);

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
              className="w-full rounded-card bg-black/[0.03] border border-border px-3 py-2 text-sm mb-3 focus:outline-none focus:border-primary/50"
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
          <History size={20} className="text-primary" /> Activity Log
        </h1>
        <p className="text-sm text-text-secondary mb-6">Last 100 admin actions, most recent first.</p>

        {fetching && (
          <div className="flex items-center gap-2 text-sm text-text-secondary">
            <Loader2 size={14} className="animate-spin" /> Loading…
          </div>
        )}
        {listError && !fetching && <p className="text-sm text-rose">{listError}</p>}
        {!fetching && entries && entries.length === 0 && <p className="text-sm text-text-secondary">No admin actions logged yet.</p>}

        {!fetching && entries && entries.length > 0 && (
          <div className="space-y-2">
            {entries.map((e) => (
              <div key={e.id} className="glass rounded-card p-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span>
                    <span className="font-semibold">{ACTION_LABELS[e.action] || e.action}</span>
                    {e.target && <span className="text-text-secondary"> — {e.target}</span>}
                  </span>
                  <span className="text-xs text-text-secondary">{e.at ? new Date(e.at).toLocaleString() : ""}</span>
                </div>
                <p className="text-xs text-text-secondary mt-1">
                  by {e.actorEmail}
                  {e.details && ` · ${e.details}`}
                </p>
              </div>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}
