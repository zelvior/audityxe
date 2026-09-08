"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2,
  LayoutDashboard,
  Tag,
  ShieldCheck,
  Megaphone,
  History,
  Ban,
  Clock,
  Search,
  RotateCcw,
  LogOut,
  Plus,
  Copy,
  Trash2,
  Power,
  Check,
} from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useAuth } from "@/context/AuthContext";
import { PLANS, PlanId } from "@/lib/plans";
import { fetchJson } from "@/lib/fetch-json";

type Tab = "dashboard" | "codes" | "users" | "announcement" | "activity";

const TABS: { id: Tab; label: string; icon: any }[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "codes", label: "Discount Codes", icon: Tag },
  { id: "users", label: "Users", icon: ShieldCheck },
  { id: "announcement", label: "Announcement", icon: Megaphone },
  { id: "activity", label: "Activity", icon: History },
];

/* ── shared types ─────────────────────────────────────────────────── */
interface AdminStats {
  totalUsers: number;
  byPlan: { free: number; standard: number; pro: number };
  banned: number;
  suspended: number;
  discountCodes: { total: number; active: number; totalRedemptions: number };
}
interface DiscountCodeDoc {
  code: string;
  type: "plan_grant" | "percent_off";
  active: boolean;
  plan: PlanId;
  durationDays: number | null;
  percentOff: number | null;
  maxRedemptions: number;
  redemptions: number;
  expiresAt: string | null;
  perUserOnce: boolean;
  createdAt: string | null;
  note: string | null;
}
interface ModerationInfo {
  status: "active" | "suspended" | "banned";
  reason: string | null;
  until: string | null;
}
interface UserListItem {
  uid: string;
  email: string | null;
  displayName: string | null;
  plan: string;
  moderation: ModerationInfo;
  createdAt: string | null;
}
interface Announcement {
  active: boolean;
  message: string;
  level: "info" | "warning";
}
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
  bulk_create_discount_codes: "Bulk-generated discount codes",
  enable_discount_code: "Enabled discount code",
  disable_discount_code: "Disabled discount code",
  delete_discount_code: "Deleted discount code",
  user_ban: "Banned user",
  user_suspend: "Suspended user",
  user_unban: "Unbanned user",
  user_set_plan: "Changed plan for",
  user_reset_usage: "Reset usage for",
  user_revoke_sessions: "Revoked sessions for",
  set_announcement: "Published announcement",
  clear_announcement: "Took down announcement",
};

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

export default function AdminHubPage() {
  const { user, loading, getToken } = useAuth();
  const router = useRouter();

  const [denyReason, setDenyReason] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminPassword, setAdminPassword] = useState("");
  const [passwordEntered, setPasswordEntered] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [checkingPassword, setCheckingPassword] = useState(false);
  const [tab, setTab] = useState<Tab>("dashboard");

  useEffect(() => {
    if (!loading && !user) router.replace("/login?redirect=/admin");
  }, [loading, user, router]);

  useEffect(() => {
    if (!denyReason) return;
    const t = setTimeout(() => router.replace("/account"), 6000);
    return () => clearTimeout(t);
  }, [denyReason, router]);

  /* verify against any admin GET endpoint once */
  const verifyPassword = useCallback(async () => {
    if (!adminPassword.trim() || checkingPassword || !user) return;
    setCheckingPassword(true);
    setPasswordError("");
    try {
      const token = await getToken();
      const { ok, status, data, error } = await fetchJson<{ stats: AdminStats; code?: string }>("/api/admin/stats", {
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), "x-admin-password": adminPassword },
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
        setDenyReason("Your session couldn't be verified — try signing out and back in.");
        return;
      }
      if (!ok) throw new Error(error || "Something went wrong.");
      setIsAdmin(true);
      setPasswordEntered(adminPassword);
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setCheckingPassword(false);
    }
  }, [adminPassword, checkingPassword, user, getToken]);

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
            <input
              type="password"
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && verifyPassword()}
              placeholder="Password"
              autoFocus
              className="w-full rounded-card bg-white/5 border border-white/10 px-3 py-2 text-sm mb-3 focus:outline-none focus:border-primary/50"
              disabled={checkingPassword}
            />
            {passwordError && <p className="text-xs text-rose mb-3">{passwordError}</p>}
            <button
              onClick={verifyPassword}
              disabled={checkingPassword || !adminPassword.trim()}
              className="w-full py-2 rounded-card bg-primary text-black text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
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
        <h1 className="font-display font-bold text-2xl mb-1 flex items-center gap-2">
          <LayoutDashboard size={20} className="text-primary" /> Admin Dashboard
        </h1>
        <p className="text-sm text-text-secondary mb-6">Everything in one place — no more separate pages or logins.</p>

        <div className="flex flex-wrap gap-2 mb-8">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-3.5 py-2 rounded-card text-xs font-semibold flex items-center gap-1.5 transition ${
                tab === t.id ? "bg-primary text-black" : "glass hover:border-white/20 text-text-secondary"
              }`}
            >
              <t.icon size={13} /> {t.label}
            </button>
          ))}
        </div>

        {tab === "dashboard" && <DashboardTab getToken={getToken} passwordEntered={passwordEntered} />}
        {tab === "codes" && <CodesTab getToken={getToken} passwordEntered={passwordEntered} />}
        {tab === "users" && <UsersTab getToken={getToken} passwordEntered={passwordEntered} />}
        {tab === "announcement" && <AnnouncementTab getToken={getToken} passwordEntered={passwordEntered} />}
        {tab === "activity" && <ActivityTab getToken={getToken} passwordEntered={passwordEntered} />}
      </main>
      <Footer />
    </>
  );
}

/* ══════════════════════════ DASHBOARD TAB ══════════════════════════ */
function DashboardTab({ getToken, passwordEntered }: { getToken: () => Promise<string | null>; passwordEntered: string }) {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      setFetching(true);
      try {
        const token = await getToken();
        const { ok, data, error } = await fetchJson<{ stats: AdminStats }>("/api/admin/stats", {
          headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), "x-admin-password": passwordEntered },
        });
        if (!ok || !data) throw new Error(error || "Couldn't load stats.");
        setStats(data.stats);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong.");
      } finally {
        setFetching(false);
      }
    })();
  }, [getToken, passwordEntered]);

  if (fetching) return <Loader2 size={16} className="animate-spin text-text-secondary" />;
  if (error) return <p className="text-sm text-rose">{error}</p>;
  if (!stats) return null;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      <StatCard icon={ShieldCheck} label="Total users" value={stats.totalUsers} />
      <StatCard icon={ShieldCheck} label="Free plan" value={stats.byPlan.free} />
      <StatCard icon={ShieldCheck} label="Standard plan" value={stats.byPlan.standard} />
      <StatCard icon={ShieldCheck} label="Pro plan" value={stats.byPlan.pro} />
      <StatCard icon={Ban} label="Banned" value={stats.banned} />
      <StatCard icon={Clock} label="Suspended" value={stats.suspended} />
      <StatCard icon={Tag} label="Discount codes" value={stats.discountCodes.total} />
      <StatCard icon={Tag} label="Active codes" value={stats.discountCodes.active} />
      <StatCard icon={Tag} label="Total redemptions" value={stats.discountCodes.totalRedemptions} />
    </div>
  );
}

/* ══════════════════════════ CODES TAB ══════════════════════════ */
function CodesTab({ getToken, passwordEntered }: { getToken: () => Promise<string | null>; passwordEntered: string }) {
  const [codes, setCodes] = useState<DiscountCodeDoc[] | null>(null);
  const [fetching, setFetching] = useState(true);
  const [listError, setListError] = useState("");
  const [copiedCode, setCopiedCode] = useState("");

  const [customCode, setCustomCode] = useState("");
  const [codeType, setCodeType] = useState<"plan_grant" | "percent_off">("plan_grant");
  const [plan, setPlan] = useState<PlanId>("pro");
  const [durationDays, setDurationDays] = useState(30);
  const [percentOff, setPercentOff] = useState(20);
  const [maxRedemptions, setMaxRedemptions] = useState(1);
  const [note, setNote] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  const [batchCount, setBatchCount] = useState(10);
  const [batchPlan, setBatchPlan] = useState<PlanId>("pro");
  const [batchDurationDays, setBatchDurationDays] = useState(30);
  const [batchNote, setBatchNote] = useState("");
  const [generatingBatch, setGeneratingBatch] = useState(false);
  const [batchError, setBatchError] = useState("");
  const [batchResult, setBatchResult] = useState<string[] | null>(null);

  const fetchCodes = useCallback(async () => {
    setFetching(true);
    setListError("");
    try {
      const token = await getToken();
      const { ok, data, error } = await fetchJson<{ codes: DiscountCodeDoc[] }>("/api/admin/discount-codes", {
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), "x-admin-password": passwordEntered },
      });
      if (!ok || !data) throw new Error(error || "Couldn't load codes.");
      setCodes(data.codes);
    } catch (err) {
      setListError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setFetching(false);
    }
  }, [getToken, passwordEntered]);

  useEffect(() => {
    fetchCodes();
  }, [fetchCodes]);

  const createCode = useCallback(async () => {
    if (creating) return;
    setCreating(true);
    setCreateError("");
    try {
      const token = await getToken();
      const { ok, error } = await fetchJson("/api/admin/discount-codes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          "x-admin-password": passwordEntered,
        },
        body: JSON.stringify({
          code: customCode.trim() || undefined,
          type: codeType,
          plan,
          durationDays: codeType === "plan_grant" ? durationDays : undefined,
          percentOff: codeType === "percent_off" ? percentOff : undefined,
          maxRedemptions,
          note: note.trim() || null,
        }),
      });
      if (!ok) throw new Error(error || "Couldn't create code.");
      setCustomCode("");
      setNote("");
      fetchCodes();
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setCreating(false);
    }
  }, [creating, customCode, codeType, plan, durationDays, percentOff, maxRedemptions, note, getToken, fetchCodes, passwordEntered]);

  const generateBatch = useCallback(async () => {
    if (generatingBatch) return;
    setGeneratingBatch(true);
    setBatchError("");
    setBatchResult(null);
    try {
      const token = await getToken();
      const { ok, data, error } = await fetchJson<{ codes: DiscountCodeDoc[] }>("/api/admin/discount-codes/batch", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          "x-admin-password": passwordEntered,
        },
        body: JSON.stringify({ count: batchCount, plan: batchPlan, durationDays: batchDurationDays, note: batchNote.trim() || null }),
      });
      if (!ok || !data) throw new Error(error || "Couldn't generate codes.");
      setBatchResult(data.codes.map((c) => c.code));
      fetchCodes();
    } catch (err) {
      setBatchError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setGeneratingBatch(false);
    }
  }, [generatingBatch, batchCount, batchPlan, batchDurationDays, batchNote, getToken, fetchCodes, passwordEntered]);

  const toggleActive = useCallback(
    async (code: string, active: boolean) => {
      const token = await getToken();
      await fetchJson(`/api/admin/discount-codes/${code}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          "x-admin-password": passwordEntered,
        },
        body: JSON.stringify({ active }),
      });
      fetchCodes();
    },
    [getToken, fetchCodes, passwordEntered]
  );

  const removeCode = useCallback(
    async (code: string) => {
      if (!confirm(`Delete code "${code}"? This can't be undone.`)) return;
      const token = await getToken();
      await fetchJson(`/api/admin/discount-codes/${code}`, {
        method: "DELETE",
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), "x-admin-password": passwordEntered },
      });
      fetchCodes();
    },
    [getToken, fetchCodes, passwordEntered]
  );

  const copyCode = useCallback((code: string) => {
    navigator.clipboard?.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(""), 1500);
  }, []);

  return (
    <div>
      <div className="glass rounded-card p-5 sm:p-6 mb-6">
        <span className="text-sm font-semibold mb-4 block">Create new code</span>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-3">
          <div>
            <label className="text-xs text-text-secondary block mb-1">Code (optional)</label>
            <input
              type="text"
              value={customCode}
              onChange={(e) => setCustomCode(e.target.value)}
              placeholder="Auto-generate"
              className="w-full rounded-card bg-white/5 border border-white/10 px-3 py-2 text-sm font-mono uppercase focus:outline-none focus:border-primary/50"
            />
          </div>
          <div>
            <label className="text-xs text-text-secondary block mb-1">Type</label>
            <select
              value={codeType}
              onChange={(e) => setCodeType(e.target.value as "plan_grant" | "percent_off")}
              className="w-full rounded-card bg-white/5 border border-white/10 px-3 py-2 text-sm focus:outline-none focus:border-primary/50"
            >
              <option value="plan_grant">Plan grant (instant free access)</option>
              <option value="percent_off">Percent off (applied at checkout)</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-text-secondary block mb-1">Plan</label>
            <select
              value={plan}
              onChange={(e) => setPlan(e.target.value as PlanId)}
              className="w-full rounded-card bg-white/5 border border-white/10 px-3 py-2 text-sm focus:outline-none focus:border-primary/50"
            >
              <option value="standard">{PLANS.standard.name}</option>
              <option value="pro">{PLANS.pro.name}</option>
            </select>
          </div>
          {codeType === "plan_grant" ? (
            <div>
              <label className="text-xs text-text-secondary block mb-1">Duration (days)</label>
              <input
                type="number"
                min={1}
                value={durationDays}
                onChange={(e) => setDurationDays(Number(e.target.value))}
                className="w-full rounded-card bg-white/5 border border-white/10 px-3 py-2 text-sm focus:outline-none focus:border-primary/50"
              />
            </div>
          ) : (
            <div>
              <label className="text-xs text-text-secondary block mb-1">Percent off</label>
              <input
                type="number"
                min={1}
                max={100}
                value={percentOff}
                onChange={(e) => setPercentOff(Number(e.target.value))}
                className="w-full rounded-card bg-white/5 border border-white/10 px-3 py-2 text-sm focus:outline-none focus:border-primary/50"
              />
            </div>
          )}
          <div>
            <label className="text-xs text-text-secondary block mb-1">Max redemptions</label>
            <input
              type="number"
              min={1}
              value={maxRedemptions}
              onChange={(e) => setMaxRedemptions(Number(e.target.value))}
              className="w-full rounded-card bg-white/5 border border-white/10 px-3 py-2 text-sm focus:outline-none focus:border-primary/50"
            />
          </div>
          <div className="col-span-2 sm:col-span-1">
            <label className="text-xs text-text-secondary block mb-1">Note (optional)</label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. YouTube giveaway"
              className="w-full rounded-card bg-white/5 border border-white/10 px-3 py-2 text-sm focus:outline-none focus:border-primary/50"
            />
          </div>
        </div>
        {createError && <p className="text-xs text-rose mb-3">{createError}</p>}
        <button
          onClick={createCode}
          disabled={creating}
          className="px-4 py-2 rounded-card bg-primary text-black text-sm font-semibold disabled:opacity-50 flex items-center gap-2"
        >
          {creating ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Create code
        </button>
      </div>

      <div className="glass rounded-card p-5 sm:p-6 mb-6">
        <span className="text-sm font-semibold mb-1 block">Generate giveaway batch</span>
        <p className="text-xs text-text-secondary mb-4">Creates N distinct single-use plan-grant codes at once.</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
          <div>
            <label className="text-xs text-text-secondary block mb-1">How many</label>
            <input
              type="number"
              min={1}
              max={500}
              value={batchCount}
              onChange={(e) => setBatchCount(Number(e.target.value))}
              className="w-full rounded-card bg-white/5 border border-white/10 px-3 py-2 text-sm focus:outline-none focus:border-primary/50"
            />
          </div>
          <div>
            <label className="text-xs text-text-secondary block mb-1">Plan</label>
            <select
              value={batchPlan}
              onChange={(e) => setBatchPlan(e.target.value as PlanId)}
              className="w-full rounded-card bg-white/5 border border-white/10 px-3 py-2 text-sm focus:outline-none focus:border-primary/50"
            >
              <option value="standard">{PLANS.standard.name}</option>
              <option value="pro">{PLANS.pro.name}</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-text-secondary block mb-1">Duration (days)</label>
            <input
              type="number"
              min={1}
              value={batchDurationDays}
              onChange={(e) => setBatchDurationDays(Number(e.target.value))}
              className="w-full rounded-card bg-white/5 border border-white/10 px-3 py-2 text-sm focus:outline-none focus:border-primary/50"
            />
          </div>
          <div>
            <label className="text-xs text-text-secondary block mb-1">Note (optional)</label>
            <input
              type="text"
              value={batchNote}
              onChange={(e) => setBatchNote(e.target.value)}
              placeholder="e.g. Launch giveaway"
              className="w-full rounded-card bg-white/5 border border-white/10 px-3 py-2 text-sm focus:outline-none focus:border-primary/50"
            />
          </div>
        </div>
        {batchError && <p className="text-xs text-rose mb-3">{batchError}</p>}
        <button
          onClick={generateBatch}
          disabled={generatingBatch}
          className="px-4 py-2 rounded-card bg-primary text-black text-sm font-semibold disabled:opacity-50 flex items-center gap-2"
        >
          {generatingBatch ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Generate {batchCount} codes
        </button>
        {batchResult && (
          <div className="mt-4 border-t border-white/10 pt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-text-secondary">{batchResult.length} codes generated</span>
              <button
                onClick={() => navigator.clipboard?.writeText(batchResult!.join("\n"))}
                className="text-xs px-2 py-1 rounded-card glass hover:border-white/20 flex items-center gap-1"
              >
                <Copy size={11} /> Copy all
              </button>
            </div>
            <div className="max-h-40 overflow-y-auto font-mono text-xs text-text-secondary grid grid-cols-2 sm:grid-cols-3 gap-1">
              {batchResult.map((c) => (
                <span key={c}>{c}</span>
              ))}
            </div>
          </div>
        )}
      </div>

      {fetching && (
        <div className="flex items-center gap-2 text-sm text-text-secondary">
          <Loader2 size={14} className="animate-spin" /> Loading codes…
        </div>
      )}
      {listError && !fetching && <p className="text-sm text-rose">{listError}</p>}
      {!fetching && codes && codes.length === 0 && <p className="text-sm text-text-secondary">No codes yet.</p>}

      {!fetching && codes && codes.length > 0 && (
        <div className="space-y-3">
          {codes.map((c) => (
            <div key={c.code} className="glass rounded-card p-4 flex flex-wrap items-center gap-3 justify-between">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => copyCode(c.code)}
                  className="font-mono text-sm font-semibold flex items-center gap-1.5 hover:text-primary"
                >
                  {c.code} {copiedCode === c.code ? <Check size={13} className="text-emerald" /> : <Copy size={13} />}
                </button>
                {c.type === "percent_off" && <span className="text-xs px-2 py-0.5 rounded-full bg-emerald/20 text-emerald">% off</span>}
                {!c.active && <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-text-secondary">Disabled</span>}
              </div>
              <div className="text-xs text-text-secondary flex flex-wrap gap-x-4 gap-y-1">
                <span>
                  {PLANS[c.plan]?.name ?? c.plan}
                  {c.type === "percent_off" ? ` · ${c.percentOff}% off` : ` · ${c.durationDays}d`}
                </span>
                <span>
                  {c.redemptions}/{c.maxRedemptions} redeemed
                </span>
                {c.note && <span>"{c.note}"</span>}
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => toggleActive(c.code, !c.active)} className="p-2 rounded-card glass hover:border-white/20">
                  <Power size={14} className={c.active ? "text-emerald" : "text-text-secondary"} />
                </button>
                <button onClick={() => removeCode(c.code)} className="p-2 rounded-card glass hover:border-white/20">
                  <Trash2 size={14} className="text-rose" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════ USERS TAB ══════════════════════════ */
function UsersTab({ getToken, passwordEntered }: { getToken: () => Promise<string | null>; passwordEntered: string }) {
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState<UserListItem[] | null>(null);
  const [listError, setListError] = useState("");
  const [fetching, setFetching] = useState(true);
  const [actionTarget, setActionTarget] = useState<string | null>(null);
  const [reasonDraft, setReasonDraft] = useState("");
  const [untilDraft, setUntilDraft] = useState("");
  const [pendingAction, setPendingAction] = useState<{ uid: string; type: "ban" | "suspend" | "set-plan" } | null>(null);
  const [planDraft, setPlanDraft] = useState<"free" | "standard" | "pro">("pro");
  const [planDaysDraft, setPlanDaysDraft] = useState(30);

  const fetchUsers = useCallback(
    async (q: string) => {
      setFetching(true);
      setListError("");
      try {
        const token = await getToken();
        const { ok, data, error } = await fetchJson<{ users: UserListItem[] }>(`/api/admin/users?q=${encodeURIComponent(q)}`, {
          headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), "x-admin-password": passwordEntered },
        });
        if (!ok || !data) throw new Error(error || "Couldn't load users.");
        setUsers(data.users);
      } catch (err) {
        setListError(err instanceof Error ? err.message : "Something went wrong.");
      } finally {
        setFetching(false);
      }
    },
    [getToken, passwordEntered]
  );

  useEffect(() => {
    fetchUsers("");
  }, [fetchUsers]);

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
        fetchUsers(query);
      } catch (err) {
        alert(err instanceof Error ? err.message : "Action failed.");
      } finally {
        setActionTarget(null);
      }
    },
    [getToken, passwordEntered, fetchUsers, query]
  );

  return (
    <div>
      <div className="flex gap-2 mb-6">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && fetchUsers(query)}
          placeholder="Search email or UID"
          className="flex-1 rounded-card bg-white/5 border border-white/10 px-3 py-2 text-sm focus:outline-none focus:border-primary/50"
        />
        <button onClick={() => fetchUsers(query)} className="px-4 py-2 rounded-card glass hover:border-white/20 flex items-center gap-2 text-sm">
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
                  {u.moderation.status === "banned" && <span className="text-xs px-2 py-0.5 rounded-full bg-rose/20 text-rose">Banned</span>}
                  {u.moderation.status === "suspended" && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400">
                      Suspended until {u.moderation.until ? new Date(u.moderation.until).toLocaleDateString() : "—"}
                    </span>
                  )}
                  {u.moderation.status === "active" && <span className="text-xs px-2 py-0.5 rounded-full bg-emerald/20 text-emerald">Active</span>}
                  <span className="text-xs text-text-secondary">{u.plan} plan</span>
                </div>
              </div>
              {u.moderation.reason && u.moderation.status !== "active" && (
                <p className="text-xs text-text-secondary mb-2">Reason: {u.moderation.reason}</p>
              )}

              {pendingAction?.uid === u.uid ? (
                <div className="mt-2 space-y-2 border-t border-white/10 pt-3">
                  {pendingAction.type === "set-plan" ? (
                    <>
                      <div className="flex gap-2">
                        <select
                          value={planDraft}
                          onChange={(e) => setPlanDraft(e.target.value as any)}
                          className="flex-1 rounded-card bg-white/5 border border-white/10 px-3 py-2 text-xs focus:outline-none focus:border-primary/50"
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
                            placeholder="Days (0 = never)"
                            className="w-40 rounded-card bg-white/5 border border-white/10 px-3 py-2 text-xs focus:outline-none focus:border-primary/50"
                          />
                        )}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() =>
                            performAction(u.uid, "set-plan", {
                              plan: planDraft,
                              expiresAt: planDraft !== "free" && planDaysDraft > 0 ? new Date(Date.now() + planDaysDraft * 86400000).toISOString() : null,
                            })
                          }
                          disabled={actionTarget === u.uid}
                          className="px-3 py-1.5 rounded-card bg-primary text-black text-xs font-semibold disabled:opacity-50"
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
                        className="w-full rounded-card bg-white/5 border border-white/10 px-3 py-2 text-xs focus:outline-none focus:border-primary/50"
                      />
                      {pendingAction.type === "suspend" && (
                        <input
                          type="date"
                          value={untilDraft}
                          onChange={(e) => setUntilDraft(e.target.value)}
                          className="w-full rounded-card bg-white/5 border border-white/10 px-3 py-2 text-xs focus:outline-none focus:border-primary/50"
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
                          className="px-3 py-1.5 rounded-card bg-rose text-black text-xs font-semibold disabled:opacity-50"
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
    </div>
  );
}

/* ══════════════════════════ ANNOUNCEMENT TAB ══════════════════════════ */
function AnnouncementTab({ getToken, passwordEntered }: { getToken: () => Promise<string | null>; passwordEntered: string }) {
  const [message, setMessage] = useState("");
  const [level, setLevel] = useState<"info" | "warning">("info");
  const [active, setActive] = useState(false);
  const [loadingState, setLoadingState] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    (async () => {
      setLoadingState(true);
      try {
        const token = await getToken();
        const { ok, data } = await fetchJson<{ announcement: Announcement }>("/api/admin/announcement", {
          headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), "x-admin-password": passwordEntered },
        });
        if (ok && data) {
          setMessage(data.announcement.message);
          setLevel(data.announcement.level);
          setActive(data.announcement.active);
        }
      } finally {
        setLoadingState(false);
      }
    })();
  }, [getToken, passwordEntered]);

  const save = useCallback(
    async (nextActive: boolean) => {
      setSaving(true);
      setSaveError("");
      setSaved(false);
      try {
        const token = await getToken();
        const { ok, error } = await fetchJson("/api/admin/announcement", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            "x-admin-password": passwordEntered,
          },
          body: JSON.stringify({ message, level, active: nextActive }),
        });
        if (!ok) throw new Error(error || "Failed to save.");
        setActive(nextActive);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      } catch (err) {
        setSaveError(err instanceof Error ? err.message : "Something went wrong.");
      } finally {
        setSaving(false);
      }
    },
    [getToken, passwordEntered, message, level]
  );

  if (loadingState) return <Loader2 size={16} className="animate-spin text-text-secondary" />;

  return (
    <div className="glass rounded-card p-5 sm:p-6 max-w-lg">
      <label className="text-xs text-text-secondary block mb-1">Message</label>
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        maxLength={280}
        rows={3}
        placeholder="e.g. Scheduled maintenance tonight 11pm–1am UTC."
        className="w-full rounded-card bg-white/5 border border-white/10 px-3 py-2 text-sm mb-1 focus:outline-none focus:border-primary/50 resize-none"
      />
      <p className="text-xs text-text-secondary/60 mb-4">{message.length}/280</p>

      <label className="text-xs text-text-secondary block mb-1">Style</label>
      <select
        value={level}
        onChange={(e) => setLevel(e.target.value as "info" | "warning")}
        className="w-full rounded-card bg-white/5 border border-white/10 px-3 py-2 text-sm mb-4 focus:outline-none focus:border-primary/50"
      >
        <option value="info">Info (brand color)</option>
        <option value="warning">Warning (amber)</option>
      </select>

      {saveError && <p className="text-xs text-rose mb-3">{saveError}</p>}
      {saved && <p className="text-xs text-emerald mb-3">Saved.</p>}

      <div className="flex gap-2">
        <button
          onClick={() => save(true)}
          disabled={saving || !message.trim()}
          className="flex-1 py-2 rounded-card bg-primary text-black text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : active ? "Update & keep live" : "Publish"}
        </button>
        {active && (
          <button onClick={() => save(false)} disabled={saving} className="px-4 py-2 rounded-card glass text-sm font-semibold disabled:opacity-50">
            Take down
          </button>
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════ ACTIVITY TAB ══════════════════════════ */
function ActivityTab({ getToken, passwordEntered }: { getToken: () => Promise<string | null>; passwordEntered: string }) {
  const [entries, setEntries] = useState<LogEntry[] | null>(null);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      setFetching(true);
      try {
        const token = await getToken();
        const { ok, data, error } = await fetchJson<{ entries: LogEntry[] }>("/api/admin/activity", {
          headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), "x-admin-password": passwordEntered },
        });
        if (!ok || !data) throw new Error(error || "Couldn't load activity.");
        setEntries(data.entries);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong.");
      } finally {
        setFetching(false);
      }
    })();
  }, [getToken, passwordEntered]);

  if (fetching) return <Loader2 size={16} className="animate-spin text-text-secondary" />;
  if (error) return <p className="text-sm text-rose">{error}</p>;
  if (!entries || entries.length === 0) return <p className="text-sm text-text-secondary">No admin actions logged yet.</p>;

  return (
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
  );
}
