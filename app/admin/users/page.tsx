"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, Search, Ban, Clock, ShieldCheck, Tag, RotateCcw, LogOut } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useAuth } from "@/context/AuthContext";
import PasswordInput from "@/components/PasswordInput";
import { fetchJson } from "@/lib/fetch-json";

interface ModerationInfo {
  status: "active" | "suspended" | "banned";
  reason: string | null;
  until: string | null;
  actedAt: string | null;
  actedByEmail: string | null;
}

interface UserListItem {
  uid: string;
  email: string | null;
  displayName: string | null;
  plan: string;
  moderation: ModerationInfo;
  createdAt: string | null;
}

export default function AdminUsersPage() {
  const { user, loading, getToken } = useAuth();
  const router = useRouter();

  const [denyReason, setDenyReason] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminPassword, setAdminPassword] = useState("");
  const [passwordEntered, setPasswordEntered] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [checkingPassword, setCheckingPassword] = useState(false);

  const [query, setQuery] = useState("");
  const [users, setUsers] = useState<UserListItem[] | null>(null);
  const [listError, setListError] = useState("");
  const [fetching, setFetching] = useState(false);
  const [actionTarget, setActionTarget] = useState<string | null>(null); // uid mid-action
  const [reasonDraft, setReasonDraft] = useState("");
  const [untilDraft, setUntilDraft] = useState("");
  const [pendingAction, setPendingAction] = useState<{ uid: string; type: "ban" | "suspend" | "set-plan" } | null>(null);
  const [planDraft, setPlanDraft] = useState<"free" | "standard" | "pro">("pro");
  const [planDaysDraft, setPlanDaysDraft] = useState(30);

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login?redirect=/admin/users");
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (!denyReason) return;
    const t = setTimeout(() => router.replace("/account"), 6000);
    return () => clearTimeout(t);
  }, [denyReason, router]);

  const fetchUsers = useCallback(
    async (q: string, pw: string) => {
      if (!user) return;
      setFetching(true);
      setListError("");
      try {
        const token = await getToken();
        const { ok, status, data, error } = await fetchJson<{ users: UserListItem[]; code?: string }>(
          `/api/admin/users?q=${encodeURIComponent(q)}`,
          { headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), "x-admin-password": pw } }
        );
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
        if (!ok || !data) throw new Error(error || "Couldn't load users.");
        setIsAdmin(true);
        setUsers(data.users);
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
    setPasswordEntered(adminPassword);
    fetchUsers(query, adminPassword);
  }, [adminPassword, checkingPassword, fetchUsers, query]);

  const runSearch = useCallback(() => {
    if (!isAdmin) return;
    fetchUsers(query, passwordEntered);
  }, [isAdmin, fetchUsers, query, passwordEntered]);

  const performAction = useCallback(
    async (
      uid: string,
      action: "ban" | "suspend" | "unban" | "set-plan" | "reset-usage" | "revoke-sessions",
      extra?: { reason?: string; until?: string; plan?: string; expiresAt?: string | null }
    ) => {
      setActionTarget(uid);
      try {
        const token = await getToken();
        const { ok, error } = await fetchJson(`/api/admin/users/${encodeURIComponent(uid)}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            "x-admin-password": passwordEntered,
          },
          body: JSON.stringify({ action, ...extra }),
        });
        if (!ok) throw new Error(error || "Action failed.");
        setPendingAction(null);
        setReasonDraft("");
        setUntilDraft("");
        fetchUsers(query, passwordEntered);
      } catch (err) {
        alert(err instanceof Error ? err.message : "Action failed.");
      } finally {
        setActionTarget(null);
      }
    },
    [getToken, passwordEntered, fetchUsers, query]
  );

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
          <ShieldCheck size={20} className="text-primary" /> User Management
        </h1>
        <p className="text-sm text-text-secondary mb-6">Search by email or UID, then ban, suspend, or unban.</p>

        <div className="flex gap-2 mb-6">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && runSearch()}
            placeholder="Search email or UID"
            className="flex-1 rounded-card bg-black/[0.03] border border-border px-3 py-2 text-sm focus:outline-none focus:border-primary/50"
          />
          <button onClick={runSearch} className="px-4 py-2 rounded-card glass hover:border-black/15 flex items-center gap-2 text-sm">
            <Search size={14} /> Search
          </button>
        </div>

        {fetching && (
          <div className="flex items-center gap-2 text-sm text-text-secondary">
            <Loader2 size={14} className="animate-spin" /> Loading users…
          </div>
        )}
        {listError && !fetching && <p className="text-sm text-rose">{listError}</p>}
        {!fetching && users && users.length === 0 && <p className="text-sm text-text-secondary">No matching users.</p>}

        {!fetching && users && users.length > 0 && (
          <div className="space-y-3">
            {users.map((u) => (
              <div key={u.uid} className="glass rounded-card p-4">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
                  <div>
                    <p className="text-sm font-semibold">{u.email || u.uid}</p>
                    <p className="text-xs text-text-secondary font-mono">{u.uid}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {u.moderation.status === "banned" && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-rose/20 text-rose">Banned</span>
                    )}
                    {u.moderation.status === "suspended" && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400">
                        Suspended until {u.moderation.until ? new Date(u.moderation.until).toLocaleDateString() : "—"}
                      </span>
                    )}
                    {u.moderation.status === "active" && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-emerald/20 text-emerald">Active</span>
                    )}
                    <span className="text-xs text-text-secondary">{u.plan} plan</span>
                  </div>
                </div>
                {u.moderation.reason && u.moderation.status !== "active" && (
                  <p className="text-xs text-text-secondary mb-2">Reason: {u.moderation.reason}</p>
                )}

                {pendingAction?.uid === u.uid ? (
                  <div className="mt-2 space-y-2 border-t border-border pt-3">
                    {pendingAction.type === "set-plan" ? (
                      <>
                        <div className="flex gap-2">
                          <select
                            value={planDraft}
                            onChange={(e) => setPlanDraft(e.target.value as any)}
                            className="flex-1 rounded-card bg-black/[0.03] border border-border px-3 py-2 text-xs focus:outline-none focus:border-primary/50"
                          >
                            <option value="free">Free</option>
                            <option value="standard">Standard</option>
                            <option value="pro">Pro</option>
                          </select>
                          {planDraft !== "free" && (
                            <input
                              type="number"
                              min={0}
                              value={planDaysDraft}
                              onChange={(e) => setPlanDaysDraft(Number(e.target.value))}
                              placeholder="Days (0 = never expires)"
                              className="w-40 rounded-card bg-black/[0.03] border border-border px-3 py-2 text-xs focus:outline-none focus:border-primary/50"
                            />
                          )}
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() =>
                              performAction(u.uid, "set-plan", {
                                plan: planDraft,
                                expiresAt:
                                  planDraft !== "free" && planDaysDraft > 0
                                    ? new Date(Date.now() + planDaysDraft * 86400000).toISOString()
                                    : null,
                              })
                            }
                            disabled={actionTarget === u.uid}
                            className="px-3 py-1.5 rounded-card bg-primary text-white text-xs font-semibold disabled:opacity-50"
                          >
                            {actionTarget === u.uid ? <Loader2 size={12} className="animate-spin" /> : "Apply"}
                          </button>
                          <button onClick={() => setPendingAction(null)} className="px-3 py-1.5 rounded-card glass text-xs">
                            Cancel
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <input
                          type="text"
                          value={reasonDraft}
                          onChange={(e) => setReasonDraft(e.target.value)}
                          placeholder="Reason (shown to the user)"
                          className="w-full rounded-card bg-black/[0.03] border border-border px-3 py-2 text-xs focus:outline-none focus:border-primary/50"
                        />
                        {pendingAction.type === "suspend" && (
                          <input
                            type="date"
                            value={untilDraft}
                            onChange={(e) => setUntilDraft(e.target.value)}
                            className="w-full rounded-card bg-black/[0.03] border border-border px-3 py-2 text-xs focus:outline-none focus:border-primary/50"
                          />
                        )}
                        <div className="flex gap-2">
                          <button
                            onClick={() =>
                              performAction(u.uid, pendingAction.type, {
                                reason: reasonDraft,
                                until: pendingAction.type === "suspend" ? new Date(untilDraft).toISOString() : undefined,
                              })
                            }
                            disabled={actionTarget === u.uid || (pendingAction.type === "suspend" && !untilDraft)}
                            className="px-3 py-1.5 rounded-card bg-rose text-white text-xs font-semibold disabled:opacity-50"
                          >
                            {actionTarget === u.uid ? <Loader2 size={12} className="animate-spin" /> : "Confirm"}
                          </button>
                          <button onClick={() => setPendingAction(null)} className="px-3 py-1.5 rounded-card glass text-xs">
                            Cancel
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {u.moderation.status !== "banned" && (
                      <button
                        onClick={() => setPendingAction({ uid: u.uid, type: "ban" })}
                        className="px-3 py-1.5 rounded-card glass hover:border-rose/40 text-xs flex items-center gap-1.5 text-rose"
                      >
                        <Ban size={12} /> Ban
                      </button>
                    )}
                    {u.moderation.status === "active" && (
                      <button
                        onClick={() => setPendingAction({ uid: u.uid, type: "suspend" })}
                        className="px-3 py-1.5 rounded-card glass hover:border-amber-400/40 text-xs flex items-center gap-1.5 text-amber-400"
                      >
                        <Clock size={12} /> Suspend
                      </button>
                    )}
                    {u.moderation.status !== "active" && (
                      <button
                        onClick={() => performAction(u.uid, "unban")}
                        disabled={actionTarget === u.uid}
                        className="px-3 py-1.5 rounded-card glass hover:border-emerald/40 text-xs flex items-center gap-1.5 text-emerald disabled:opacity-50"
                      >
                        {actionTarget === u.uid ? <Loader2 size={12} className="animate-spin" /> : <ShieldCheck size={12} />} Unban
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setPlanDraft((u.plan as any) || "free");
                        setPlanDaysDraft(30);
                        setPendingAction({ uid: u.uid, type: "set-plan" });
                      }}
                      className="px-3 py-1.5 rounded-card glass hover:border-primary/40 text-xs flex items-center gap-1.5 text-primary"
                    >
                      <Tag size={12} /> Change plan
                    </button>
                    <button
                      onClick={() => performAction(u.uid, "reset-usage")}
                      disabled={actionTarget === u.uid}
                      className="px-3 py-1.5 rounded-card glass hover:border-white/30 text-xs flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <RotateCcw size={12} /> Reset usage
                    </button>
                    <button
                      onClick={() => {
                        if (!confirm("Force sign-out on all devices for this user?")) return;
                        performAction(u.uid, "revoke-sessions");
                      }}
                      disabled={actionTarget === u.uid}
                      className="px-3 py-1.5 rounded-card glass hover:border-white/30 text-xs flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <LogOut size={12} /> Revoke sessions
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}
