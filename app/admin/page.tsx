"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
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
  UserPlus,
  Activity as ActivityIcon,
  DollarSign,
  AlertTriangle,
  Gauge,
  Database,
  KeyRound,
  Download,
  Filter,
  RefreshCw,
  Info,
} from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useAuth } from "@/context/AuthContext";
import { PLANS, PlanId } from "@/lib/plans";
import { fetchJson } from "@/lib/fetch-json";
import PasswordInput from "@/components/PasswordInput";

/** Shared by every tab below that offers a CSV export — quotes/escapes
 * per RFC 4180 and triggers a client-side download, no server round
 * trip needed since the data's already loaded in the tab. */
function downloadCsv(filename: string, rows: Record<string, string | number | boolean | null>[]) {
  if (rows.length === 0) return;
  const headers = Object.keys(rows[0]);
  const escape = (v: unknown) => {
    const s = v === null || v === undefined ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [headers.join(","), ...rows.map((r) => headers.map((h) => escape(r[h])).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** As requested: "YY:MM:HH:MM:SS" — 2-digit year, 2-digit month, then
 * hour:minute:second, colon-separated throughout (note this isn't a
 * standard date format — there's no day component — but it's exactly
 * the field order/format asked for). */
function formatYyMmHhMmSs(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  const yy = pad(d.getFullYear() % 100);
  const mm = pad(d.getMonth() + 1);
  const hh = pad(d.getHours());
  const min = pad(d.getMinutes());
  const ss = pad(d.getSeconds());
  return `${yy}:${mm}:${hh}:${min}:${ss}`;
}

function ExportCsvButton({ onExport, label = "Export CSV" }: { onExport: () => void; label?: string }) {
  return (
    <button
      onClick={onExport}
      className="px-3 py-2 rounded-card glass hover:border-[rgb(var(--color-text-primary)/0.2)] flex items-center gap-1.5 text-xs font-semibold shrink-0"
      title="Download the current list as a CSV file"
    >
      <Download size={13} /> {label}
    </button>
  );
}

type Tab = "dashboard" | "codes" | "users" | "audits" | "announcement" | "activity" | "api-keys";

const TABS: { id: Tab; label: string; icon: any }[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "codes", label: "Redeem Codes", icon: Tag },
  { id: "users", label: "Users", icon: ShieldCheck },
  { id: "audits", label: "Audits", icon: Gauge },
  { id: "api-keys", label: "API Keys", icon: KeyRound },
  { id: "announcement", label: "Announcement", icon: Megaphone },
  { id: "activity", label: "Activity", icon: History },
];

/* ── shared types ─────────────────────────────────────────────────── */
interface DailyStatPoint {
  date: string;
  newUsers: number;
  audits: number;
  failedAudits: number;
  rateLimitHits: number;
  revenueCents: number;
}
interface AdminStats {
  totalUsers: number;
  byPlan: { free: number; standard: number; pro: number };
  banned: number;
  suspended: number;
  redeemCodes: { total: number; active: number; totalRedemptions: number };
  newUsersToday: number;
  newUsersThisWeek: number;
  newUsersThisMonth: number;
  activeUsers: number;
  paidUsers: number;
  estimatedMrrCents: number;
  totalAudits: number;
  failedAudits: number;
  rateLimitHits: number;
  dailyStats: DailyStatPoint[];
  retention: { collection: string; suggestedTtlDays: number; note: string }[];
}
interface AuditListItem {
  id: string;
  url: string;
  uid: string | null;
  email: string | null;
  plan: string;
  score: number | null;
  status: "success" | "failed";
  error: string | null;
  createdAt: string | null;
}
interface RedeemCodeDoc {
  code: string;
  active: boolean;
  plan: PlanId;
  durationDays: number;
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
  startsAt?: string | null;
  endsAt?: string | null;
  showCountdown?: boolean;
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
  create_redeem_code: "Created redeem code",
  bulk_create_redeem_codes: "Bulk-generated redeem codes",
  enable_redeem_code: "Enabled redeem code",
  disable_redeem_code: "Disabled redeem code",
  delete_redeem_code: "Deleted redeem code",
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
            <PasswordInput
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && verifyPassword()}
              placeholder="Password"
              autoFocus
              className="w-full rounded-card bg-[rgb(var(--color-text-primary)/0.045)] border border-border px-3 py-2 text-sm mb-3 focus:outline-none focus:border-primary/50"
              disabled={checkingPassword}
            />
            {passwordError && <p className="text-xs text-rose mb-3">{passwordError}</p>}
            <button
              onClick={verifyPassword}
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
                tab === t.id ? "bg-primary text-white" : "glass hover:border-[rgb(var(--color-text-primary)/0.2)] text-text-secondary"
              }`}
            >
              <t.icon size={13} /> {t.label}
            </button>
          ))}
        </div>

        {tab === "dashboard" && <DashboardTab getToken={getToken} passwordEntered={passwordEntered} />}
        {tab === "codes" && <CodesTab getToken={getToken} passwordEntered={passwordEntered} />}
        {tab === "users" && <UsersTab getToken={getToken} passwordEntered={passwordEntered} />}
        {tab === "audits" && <AuditsTab getToken={getToken} passwordEntered={passwordEntered} />}
        {tab === "api-keys" && <ApiKeysTab getToken={getToken} passwordEntered={passwordEntered} />}
        {tab === "announcement" && <AnnouncementTab getToken={getToken} passwordEntered={passwordEntered} />}
        {tab === "activity" && <ActivityTab getToken={getToken} passwordEntered={passwordEntered} />}
      </main>
      <Footer />
    </>
  );
}

/* ── tiny dependency-free trend chart (SVG) ──────────────────────────── */
function TrendChart({ points, label, color }: { points: number[]; label: string; color: string }) {
  const w = 320;
  const h = 64;
  const max = Math.max(1, ...points);
  const stepX = w / Math.max(1, points.length - 1);
  const path = points.map((v, i) => `${i === 0 ? "M" : "L"} ${(i * stepX).toFixed(1)} ${(h - (v / max) * h).toFixed(1)}`).join(" ");
  return (
    <div className="glass rounded-card p-4">
      <p className="text-xs text-text-secondary mb-2">{label} — last 14 days</p>
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-16" preserveAspectRatio="none">
        <path d={path} fill="none" stroke={color} strokeWidth={2} />
      </svg>
      <p className="text-xs text-text-secondary/60 mt-1">
        {points.reduce((a, b) => a + b, 0)} total · today {points[points.length - 1] ?? 0}
      </p>
    </div>
  );
}

/* ══════════════════════════ DASHBOARD TAB ══════════════════════════ */
function DashboardTab({ getToken, passwordEntered }: { getToken: () => Promise<string | null>; passwordEntered: string }) {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState("");
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);

  const [searchQ, setSearchQ] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<UserListItem[] | null>(null);

  const fetchStats = useCallback(async () => {
    setFetching(true);
    setError("");
    try {
      const token = await getToken();
      const { ok, data, error } = await fetchJson<{ stats: AdminStats }>("/api/admin/stats", {
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), "x-admin-password": passwordEntered },
      });
      if (!ok || !data) throw new Error(error || "Couldn't load stats.");
      setStats(data.stats);
      setLastRefreshed(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setFetching(false);
    }
  }, [getToken, passwordEntered]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const runBloomSearch = useCallback(async () => {
    if (!searchQ.trim()) {
      setSearchResults(null);
      return;
    }
    setSearching(true);
    try {
      const token = await getToken();
      const { ok, data } = await fetchJson<{ users: UserListItem[] }>(`/api/admin/search?q=${encodeURIComponent(searchQ)}`, {
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), "x-admin-password": passwordEntered },
      });
      setSearchResults(ok && data ? data.users : []);
    } finally {
      setSearching(false);
    }
  }, [searchQ, getToken, passwordEntered]);

  if (fetching) return <Loader2 size={16} className="animate-spin text-text-secondary" />;
  if (error) return <p className="text-sm text-rose">{error}</p>;
  if (!stats) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-2 -mt-1">
        <p className="text-xs text-text-secondary">
          {lastRefreshed ? `Updated ${formatYyMmHhMmSs(lastRefreshed)}` : ""}
        </p>
        <button
          onClick={fetchStats}
          disabled={fetching}
          className="px-3 py-1.5 rounded-card glass hover:border-[rgb(var(--color-text-primary)/0.2)] flex items-center gap-1.5 text-xs font-semibold disabled:opacity-50"
        >
          {fetching ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />} Refresh
        </button>
      </div>
      <div className="flex justify-end -mt-4">
        <button
          onClick={() => {
            navigator.clipboard?.writeText(JSON.stringify(stats, null, 2));
          }}
          className="px-3 py-1.5 rounded-card glass hover:border-[rgb(var(--color-text-primary)/0.2)] flex items-center gap-1.5 text-xs font-semibold"
          title="Copy the full stats object as JSON"
        >
          <Copy size={12} /> Copy as JSON
        </button>
      </div>
      <div>
        <p className="text-xs text-text-secondary mb-2 font-semibold">Users</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <StatCard icon={ShieldCheck} label="Total users" value={stats.totalUsers} />
          <StatCard icon={ActivityIcon} label="Active users (30d)" value={stats.activeUsers} />
          <StatCard icon={UserPlus} label="New today" value={stats.newUsersToday} />
          <StatCard icon={UserPlus} label="New this week" value={stats.newUsersThisWeek} />
          <StatCard icon={UserPlus} label="New this month" value={stats.newUsersThisMonth} />
          <StatCard icon={Ban} label="Banned" value={stats.banned} />
          <StatCard icon={Clock} label="Suspended" value={stats.suspended} />
          <StatCard icon={ShieldCheck} label="Free plan" value={stats.byPlan.free} />
          <StatCard icon={ShieldCheck} label="Standard plan" value={stats.byPlan.standard} />
          <StatCard icon={ShieldCheck} label="Pro plan" value={stats.byPlan.pro} />
        </div>
      </div>

      <div>
        <p className="text-xs text-text-secondary mb-2 font-semibold">Revenue &amp; codes</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <StatCard icon={DollarSign} label="Paid users" value={stats.paidUsers} />
          <StatCard icon={DollarSign} label="Est. MRR" value={`$${(stats.estimatedMrrCents / 100).toFixed(2)}`} />
          <StatCard icon={Tag} label="Redeem codes" value={stats.redeemCodes.total} />
          <StatCard icon={Tag} label="Active codes" value={stats.redeemCodes.active} />
          <StatCard icon={Tag} label="Total redemptions" value={stats.redeemCodes.totalRedemptions} />
        </div>
      </div>

      <div>
        <p className="text-xs text-text-secondary mb-2 font-semibold">Audits &amp; system health</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <StatCard icon={Gauge} label="Total audits" value={stats.totalAudits} />
          <StatCard icon={AlertTriangle} label="Failed audits" value={stats.failedAudits} />
          <StatCard icon={AlertTriangle} label="Rate-limit hits" value={stats.rateLimitHits} />
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <TrendChart points={stats.dailyStats.map((d) => d.newUsers)} label="New users" color="#22c55e" />
        <TrendChart points={stats.dailyStats.map((d) => d.audits)} label="Audits run" color="#38bdf8" />
        <TrendChart points={stats.dailyStats.map((d) => d.failedAudits)} label="Failed audits" color="#f43f5e" />
        <TrendChart points={stats.dailyStats.map((d) => d.rateLimitHits)} label="Rate-limit hits" color="#f59e0b" />
      </div>

      <div className="glass rounded-card p-5">
        <p className="text-sm font-semibold mb-3 flex items-center gap-2">
          <Search size={14} /> Bloom-filter user search
        </p>
        <div className="flex gap-2 mb-3">
          <input
            type="text"
            value={searchQ}
            onChange={(e) => setSearchQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && runBloomSearch()}
            placeholder="Exact email or UID"
            className="flex-1 rounded-card bg-[rgb(var(--color-text-primary)/0.045)] border border-border px-3 py-2 text-sm focus:outline-none focus:border-primary/50"
          />
          <button onClick={runBloomSearch} className="px-4 py-2 rounded-card glass hover:border-[rgb(var(--color-text-primary)/0.2)] flex items-center gap-2 text-sm">
            {searching ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />} Search
          </button>
        </div>
        {searchResults && searchResults.length === 0 && <p className="text-xs text-text-secondary">No exact match found.</p>}
        {searchResults && searchResults.length > 0 && (
          <div className="space-y-2">
            {searchResults.map((u) => (
              <div key={u.uid} className="text-xs bg-[rgb(var(--color-text-primary)/0.045)] rounded-card p-2 flex justify-between gap-2">
                <span>{u.email || u.uid}</span>
                <span className="text-text-secondary font-mono">{u.uid}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="glass rounded-card p-5">
        <p className="text-sm font-semibold mb-3 flex items-center gap-2">
          <Database size={14} /> Firestore data retention
        </p>
        <div className="space-y-2">
          {stats.retention.map((r) => (
            <div key={r.collection} className="text-xs flex flex-wrap justify-between gap-2 border-b border-white/5 pb-2 last:border-0">
              <span className="font-mono">{r.collection}</span>
              <span className="text-text-secondary flex-1 min-w-[200px]">{r.note}</span>
              <span className="text-text-secondary">{r.suggestedTtlDays < 0 ? "No expiry" : `${r.suggestedTtlDays}d`}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════ CODES TAB ══════════════════════════ */
function CodesTab({ getToken, passwordEntered }: { getToken: () => Promise<string | null>; passwordEntered: string }) {
  const [codes, setCodes] = useState<RedeemCodeDoc[] | null>(null);
  const [fetching, setFetching] = useState(true);
  const [listError, setListError] = useState("");
  const [copiedCode, setCopiedCode] = useState("");
  const [codeFilter, setCodeFilter] = useState<"all" | "active" | "disabled" | "unredeemed">("all");

  const [customCode, setCustomCode] = useState("");
  const [plan, setPlan] = useState<PlanId>("pro");
  const [durationDays, setDurationDays] = useState(30);
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
      const { ok, data, error } = await fetchJson<{ codes: RedeemCodeDoc[] }>("/api/admin/redeem-codes", {
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
      const { ok, error } = await fetchJson("/api/admin/redeem-codes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          "x-admin-password": passwordEntered,
        },
        body: JSON.stringify({
          code: customCode.trim() || undefined,
          plan,
          durationDays,
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
  }, [creating, customCode, plan, durationDays, maxRedemptions, note, getToken, fetchCodes, passwordEntered]);

  const generateBatch = useCallback(async () => {
    if (generatingBatch) return;
    setGeneratingBatch(true);
    setBatchError("");
    setBatchResult(null);
    try {
      const token = await getToken();
      const { ok, data, error } = await fetchJson<{ codes: RedeemCodeDoc[] }>("/api/admin/redeem-codes/batch", {
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
      await fetchJson(`/api/admin/redeem-codes/${code}`, {
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
      await fetchJson(`/api/admin/redeem-codes/${code}`, {
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
              className="w-full rounded-card bg-[rgb(var(--color-text-primary)/0.045)] border border-border px-3 py-2 text-sm font-mono uppercase focus:outline-none focus:border-primary/50"
            />
          </div>
          <div>
            <label className="text-xs text-text-secondary block mb-1">Plan</label>
            <select
              value={plan}
              onChange={(e) => setPlan(e.target.value as PlanId)}
              className="w-full rounded-card bg-[rgb(var(--color-text-primary)/0.045)] border border-border px-3 py-2 text-sm focus:outline-none focus:border-primary/50"
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
              value={durationDays}
              onChange={(e) => setDurationDays(Number(e.target.value))}
              className="w-full rounded-card bg-[rgb(var(--color-text-primary)/0.045)] border border-border px-3 py-2 text-sm focus:outline-none focus:border-primary/50"
            />
          </div>
          <div>
            <label className="text-xs text-text-secondary block mb-1">Max redemptions</label>
            <input
              type="number"
              min={1}
              value={maxRedemptions}
              onChange={(e) => setMaxRedemptions(Number(e.target.value))}
              className="w-full rounded-card bg-[rgb(var(--color-text-primary)/0.045)] border border-border px-3 py-2 text-sm focus:outline-none focus:border-primary/50"
            />
          </div>
          <div className="col-span-2 sm:col-span-1">
            <label className="text-xs text-text-secondary block mb-1">Note (optional)</label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. YouTube giveaway"
              className="w-full rounded-card bg-[rgb(var(--color-text-primary)/0.045)] border border-border px-3 py-2 text-sm focus:outline-none focus:border-primary/50"
            />
          </div>
        </div>
        {createError && <p className="text-xs text-rose mb-3">{createError}</p>}
        <button
          onClick={createCode}
          disabled={creating}
          className="px-4 py-2 rounded-card bg-primary text-white text-sm font-semibold disabled:opacity-50 flex items-center gap-2"
        >
          {creating ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Create code
        </button>
      </div>

      <div className="glass rounded-card p-5 sm:p-6 mb-6">
        <span className="text-sm font-semibold mb-1 block">Generate giveaway batch</span>
        <p className="text-xs text-text-secondary mb-4">Creates N distinct single-use codes at once.</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
          <div>
            <label className="text-xs text-text-secondary block mb-1">How many</label>
            <input
              type="number"
              min={1}
              max={500}
              value={batchCount}
              onChange={(e) => setBatchCount(Number(e.target.value))}
              className="w-full rounded-card bg-[rgb(var(--color-text-primary)/0.045)] border border-border px-3 py-2 text-sm focus:outline-none focus:border-primary/50"
            />
          </div>
          <div>
            <label className="text-xs text-text-secondary block mb-1">Plan</label>
            <select
              value={batchPlan}
              onChange={(e) => setBatchPlan(e.target.value as PlanId)}
              className="w-full rounded-card bg-[rgb(var(--color-text-primary)/0.045)] border border-border px-3 py-2 text-sm focus:outline-none focus:border-primary/50"
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
              className="w-full rounded-card bg-[rgb(var(--color-text-primary)/0.045)] border border-border px-3 py-2 text-sm focus:outline-none focus:border-primary/50"
            />
          </div>
          <div>
            <label className="text-xs text-text-secondary block mb-1">Note (optional)</label>
            <input
              type="text"
              value={batchNote}
              onChange={(e) => setBatchNote(e.target.value)}
              placeholder="e.g. Launch giveaway"
              className="w-full rounded-card bg-[rgb(var(--color-text-primary)/0.045)] border border-border px-3 py-2 text-sm focus:outline-none focus:border-primary/50"
            />
          </div>
        </div>
        {batchError && <p className="text-xs text-rose mb-3">{batchError}</p>}
        <button
          onClick={generateBatch}
          disabled={generatingBatch}
          className="px-4 py-2 rounded-card bg-primary text-white text-sm font-semibold disabled:opacity-50 flex items-center gap-2"
        >
          {generatingBatch ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Generate {batchCount} codes
        </button>
        {batchResult && (
          <div className="mt-4 border-t border-border pt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-text-secondary">{batchResult.length} codes generated</span>
              <button
                onClick={() => navigator.clipboard?.writeText(batchResult!.join("\n"))}
                className="text-xs px-2 py-1 rounded-card glass hover:border-[rgb(var(--color-text-primary)/0.2)] flex items-center gap-1"
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

      {!fetching && codes && codes.length > 0 && (() => {
        const visibleCodes = codes.filter((c) => {
          if (codeFilter === "active") return c.active;
          if (codeFilter === "disabled") return !c.active;
          if (codeFilter === "unredeemed") return c.redemptions < c.maxRedemptions;
          return true;
        });
        return (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-1.5 px-3 py-2 rounded-card glass text-xs">
              <Filter size={13} className="text-text-secondary" />
              <select value={codeFilter} onChange={(e) => setCodeFilter(e.target.value as typeof codeFilter)} className="bg-transparent focus:outline-none">
                <option value="all">All codes</option>
                <option value="active">Active only</option>
                <option value="disabled">Disabled only</option>
                <option value="unredeemed">Unredeemed only</option>
              </select>
            </div>
            <ExportCsvButton
              onExport={() =>
                downloadCsv(
                  `audityxe-codes-${new Date().toISOString().slice(0, 10)}.csv`,
                  visibleCodes.map((c) => ({
                    code: c.code,
                    active: c.active,
                    plan: c.plan,
                    durationDays: c.durationDays,
                    redemptions: c.redemptions,
                    maxRedemptions: c.maxRedemptions,
                    expiresAt: c.expiresAt || "",
                    note: c.note || "",
                    createdAt: c.createdAt || "",
                  }))
                )
              }
            />
          </div>
          {visibleCodes.length === 0 && <p className="text-sm text-text-secondary mb-3">No codes match this filter.</p>}
        <div className="space-y-3">
          {visibleCodes.map((c) => (
            <div key={c.code} className="glass rounded-card p-4 flex flex-wrap items-center gap-3 justify-between">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => copyCode(c.code)}
                  className="font-mono text-sm font-semibold flex items-center gap-1.5 hover:text-primary"
                >
                  {c.code} {copiedCode === c.code ? <Check size={13} className="text-emerald" /> : <Copy size={13} />}
                </button>
                {!c.active && <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-text-secondary">Disabled</span>}
              </div>
              <div className="text-xs text-text-secondary flex flex-wrap gap-x-4 gap-y-1">
                <span>
                  {PLANS[c.plan]?.name ?? c.plan} · {c.durationDays}d
                </span>
                <span>
                  {c.redemptions}/{c.maxRedemptions} redeemed
                </span>
                {c.note && <span>"{c.note}"</span>}
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => toggleActive(c.code, !c.active)} className="p-2 rounded-card glass hover:border-[rgb(var(--color-text-primary)/0.2)]">
                  <Power size={14} className={c.active ? "text-emerald" : "text-text-secondary"} />
                </button>
                <button onClick={() => removeCode(c.code)} className="p-2 rounded-card glass hover:border-[rgb(var(--color-text-primary)/0.2)]">
                  <Trash2 size={14} className="text-rose" />
                </button>
              </div>
            </div>
          ))}
        </div>
        </>
        );
      })()}
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

  const [planFilter, setPlanFilter] = useState<"all" | "free" | "standard" | "pro">("all");
  const [sortBy, setSortBy] = useState<"newest" | "oldest">("newest");
  const visibleUsers = useMemo(() => {
    const filtered = (users || []).filter((u) => planFilter === "all" || u.plan === planFilter);
    return [...filtered].sort((a, b) => {
      const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return sortBy === "newest" ? tb - ta : ta - tb;
    });
  }, [users, planFilter, sortBy]);

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-6">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && fetchUsers(query)}
          placeholder="Search email or UID"
          className="flex-1 rounded-card bg-[rgb(var(--color-text-primary)/0.045)] border border-border px-3 py-2 text-sm focus:outline-none focus:border-primary/50"
        />
        <button onClick={() => fetchUsers(query)} className="px-4 py-2 rounded-card glass hover:border-[rgb(var(--color-text-primary)/0.2)] flex items-center gap-2 text-sm">
          <Search size={14} /> Search
        </button>
        <div className="flex items-center gap-1.5 px-3 py-2 rounded-card glass text-xs">
          <Filter size={13} className="text-text-secondary" />
          <select
            value={planFilter}
            onChange={(e) => setPlanFilter(e.target.value as typeof planFilter)}
            className="bg-transparent focus:outline-none"
          >
            <option value="all">All plans</option>
            <option value="free">Free</option>
            <option value="standard">Standard</option>
            <option value="pro">Pro</option>
          </select>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-2 rounded-card glass text-xs">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="bg-transparent focus:outline-none"
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
          </select>
        </div>
        {users && users.length > 0 && (
          <ExportCsvButton
            onExport={() =>
              downloadCsv(
                `audityxe-users-${new Date().toISOString().slice(0, 10)}.csv`,
                visibleUsers.map((u) => ({
                  uid: u.uid,
                  email: u.email || "",
                  displayName: u.displayName || "",
                  plan: u.plan,
                  moderationStatus: u.moderation.status,
                  createdAt: u.createdAt || "",
                }))
              )
            }
          />
        )}
      </div>

      {fetching && (
        <div className="flex items-center gap-2 text-sm text-text-secondary">
          <Loader2 size={14} className="animate-spin" /> Loading users…
        </div>
      )}
      {listError && !fetching && <p className="text-sm text-rose">{listError}</p>}
      {!fetching && users && visibleUsers.length === 0 && <p className="text-sm text-text-secondary">No matching users.</p>}

      {!fetching && users && visibleUsers.length > 0 && (
        <div className="space-y-3">
          {visibleUsers.map((u) => (
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
                <div className="mt-2 space-y-2 border-t border-border pt-3">
                  {pendingAction.type === "set-plan" ? (
                    <>
                      <div className="flex gap-2">
                        <select
                          value={planDraft}
                          onChange={(e) => setPlanDraft(e.target.value as any)}
                          className="flex-1 rounded-card bg-[rgb(var(--color-text-primary)/0.045)] border border-border px-3 py-2 text-xs focus:outline-none focus:border-primary/50"
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
                            className="w-40 rounded-card bg-[rgb(var(--color-text-primary)/0.045)] border border-border px-3 py-2 text-xs focus:outline-none focus:border-primary/50"
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
                        className="w-full rounded-card bg-[rgb(var(--color-text-primary)/0.045)] border border-border px-3 py-2 text-xs focus:outline-none focus:border-primary/50"
                      />
                      {pendingAction.type === "suspend" && (
                        <input
                          type="date"
                          value={untilDraft}
                          onChange={(e) => setUntilDraft(e.target.value)}
                          className="w-full rounded-card bg-[rgb(var(--color-text-primary)/0.045)] border border-border px-3 py-2 text-xs focus:outline-none focus:border-primary/50"
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
    </div>
  );
}

/* ══════════════════════════ AUDITS TAB ══════════════════════════ */
function AuditsTab({ getToken, passwordEntered }: { getToken: () => Promise<string | null>; passwordEntered: string }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"" | "success" | "failed">("");
  const [audits, setAudits] = useState<AuditListItem[] | null>(null);
  const [fetching, setFetching] = useState(true);
  const [listError, setListError] = useState("");
  const [actionId, setActionId] = useState<string | null>(null);
  const [minScore, setMinScore] = useState(0);
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "score-asc" | "score-desc">("newest");

  const fetchAudits = useCallback(
    async (q: string, s: string) => {
      setFetching(true);
      setListError("");
      try {
        const token = await getToken();
        const params = new URLSearchParams({ q, ...(s ? { status: s } : {}) });
        const { ok, data, error } = await fetchJson<{ audits: AuditListItem[] }>(`/api/admin/audits?${params}`, {
          headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), "x-admin-password": passwordEntered },
        });
        if (!ok || !data) throw new Error(error || "Couldn't load audits.");
        setAudits(data.audits);
      } catch (err) {
        setListError(err instanceof Error ? err.message : "Something went wrong.");
      } finally {
        setFetching(false);
      }
    },
    [getToken, passwordEntered]
  );

  useEffect(() => {
    fetchAudits("", "");
  }, [fetchAudits]);

  const rerun = useCallback(
    async (id: string) => {
      setActionId(id);
      try {
        const token = await getToken();
        const { ok, error } = await fetchJson(`/api/admin/audits/${id}`, {
          method: "POST",
          headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), "x-admin-password": passwordEntered },
        });
        if (!ok) throw new Error(error || "Re-run failed.");
        fetchAudits(query, status);
      } catch (err) {
        alert(err instanceof Error ? err.message : "Re-run failed.");
      } finally {
        setActionId(null);
      }
    },
    [getToken, passwordEntered, fetchAudits, query, status]
  );

  const remove = useCallback(
    async (id: string) => {
      if (!confirm("Delete this audit record? This can't be undone.")) return;
      setActionId(id);
      try {
        const token = await getToken();
        await fetchJson(`/api/admin/audits/${id}`, {
          method: "DELETE",
          headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), "x-admin-password": passwordEntered },
        });
        fetchAudits(query, status);
      } finally {
        setActionId(null);
      }
    },
    [getToken, passwordEntered, fetchAudits, query, status]
  );

  const visibleAudits = useMemo(() => {
    const filtered = (audits || []).filter((a) => (a.score ?? 0) >= minScore);
    return [...filtered].sort((a, b) => {
      if (sortBy === "score-asc") return (a.score ?? -1) - (b.score ?? -1);
      if (sortBy === "score-desc") return (b.score ?? -1) - (a.score ?? -1);
      const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return sortBy === "newest" ? tb - ta : ta - tb;
    });
  }, [audits, minScore, sortBy]);

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-3">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && fetchAudits(query, status)}
          placeholder="Search URL, email, or UID"
          className="flex-1 min-w-[200px] rounded-card bg-[rgb(var(--color-text-primary)/0.045)] border border-border px-3 py-2 text-sm focus:outline-none focus:border-primary/50"
        />
        <select
          value={status}
          onChange={(e) => {
            const v = e.target.value as "" | "success" | "failed";
            setStatus(v);
            fetchAudits(query, v);
          }}
          className="rounded-card bg-[rgb(var(--color-text-primary)/0.045)] border border-border px-3 py-2 text-sm focus:outline-none focus:border-primary/50"
        >
          <option value="">All statuses</option>
          <option value="success">Success</option>
          <option value="failed">Failed</option>
        </select>
        <button onClick={() => fetchAudits(query, status)} className="px-4 py-2 rounded-card glass hover:border-[rgb(var(--color-text-primary)/0.2)] flex items-center gap-2 text-sm">
          <Search size={14} /> Search
        </button>
        {audits && audits.length > 0 && (
          <ExportCsvButton
            onExport={() =>
              downloadCsv(
                `audityxe-audits-${new Date().toISOString().slice(0, 10)}.csv`,
                visibleAudits.map((a) => ({
                  url: a.url,
                  email: a.email || "",
                  uid: a.uid || "",
                  plan: a.plan,
                  score: a.score ?? "",
                  status: a.status,
                  error: a.error || "",
                  createdAt: a.createdAt || "",
                }))
              )
            }
          />
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="flex items-center gap-1.5 px-3 py-2 rounded-card glass text-xs">
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value as typeof sortBy)} className="bg-transparent focus:outline-none">
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="score-desc">Highest score first</option>
            <option value="score-asc">Lowest score first</option>
          </select>
        </div>
        <div className="flex items-center gap-2 px-3 py-2 rounded-card glass text-xs">
          <span className="text-text-secondary">Min score</span>
          <input
            type="range"
            min={0}
            max={10}
            step={1}
            value={minScore}
            onChange={(e) => setMinScore(Number(e.target.value))}
            className="w-24 accent-primary"
          />
          <span className="font-mono font-semibold w-4">{minScore}</span>
        </div>
      </div>

      {fetching && (
        <div className="flex items-center gap-2 text-sm text-text-secondary">
          <Loader2 size={14} className="animate-spin" /> Loading audits…
        </div>
      )}
      {listError && !fetching && <p className="text-sm text-rose">{listError}</p>}
      {!fetching && audits && visibleAudits.length === 0 && <p className="text-sm text-text-secondary">No matching audits.</p>}

      {!fetching && audits && visibleAudits.length > 0 && (
        <div className="space-y-3">
          {visibleAudits.map((a) => (
            <div key={a.id} className="glass rounded-card p-4">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate max-w-md">{a.url}</p>
                  <p className="text-xs text-text-secondary">
                    {a.email || a.uid || "anonymous"} · {a.plan} plan · {a.createdAt ? new Date(a.createdAt).toLocaleString() : "—"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {a.status === "success" ? (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-emerald/20 text-emerald">Score {a.score ?? "—"}</span>
                  ) : (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-rose/20 text-rose">Failed</span>
                  )}
                </div>
              </div>
              {a.error && <p className="text-xs text-rose mb-2">{a.error}</p>}
              <div className="flex gap-2">
                <button
                  onClick={() => rerun(a.id)}
                  disabled={actionId === a.id}
                  className="px-3 py-1.5 rounded-card glass hover:border-primary/40 text-xs flex items-center gap-1.5 text-primary disabled:opacity-50"
                >
                  {actionId === a.id ? <Loader2 size={12} className="animate-spin" /> : <RotateCcw size={12} />} Re-run
                </button>
                <button
                  onClick={() => remove(a.id)}
                  disabled={actionId === a.id}
                  className="px-3 py-1.5 rounded-card glass hover:border-rose/40 text-xs flex items-center gap-1.5 text-rose disabled:opacity-50"
                >
                  <Trash2 size={12} /> Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════ ANNOUNCEMENT TAB ══════════════════════════ */
function toLocalInputValue(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatCountdownPreview(msRemaining: number): string {
  if (msRemaining <= 0) return "0s";
  const totalSeconds = Math.floor(msRemaining / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

function AnnouncementTab({ getToken, passwordEntered }: { getToken: () => Promise<string | null>; passwordEntered: string }) {
  const [message, setMessage] = useState("");
  const [level, setLevel] = useState<"info" | "warning">("info");
  const [active, setActive] = useState(false);
  const [startsAt, setStartsAt] = useState(""); // datetime-local string, local tz
  const [endsAt, setEndsAt] = useState("");
  const [showCountdown, setShowCountdown] = useState(false);
  const [loadingState, setLoadingState] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saved, setSaved] = useState(false);
  const [previewNow, setPreviewNow] = useState(() => Date.now());

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
          setStartsAt(toLocalInputValue(data.announcement.startsAt));
          setEndsAt(toLocalInputValue(data.announcement.endsAt));
          setShowCountdown(!!data.announcement.showCountdown);
        }
      } finally {
        setLoadingState(false);
      }
    })();
  }, [getToken, passwordEntered]);

  // Ticks the live preview below the form — only runs while a countdown
  // is actually toggled on, so it's not burning a timer for nothing.
  useEffect(() => {
    if (!showCountdown || !endsAt) return;
    const id = setInterval(() => setPreviewNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [showCountdown, endsAt]);

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
          body: JSON.stringify({
            message,
            level,
            active: nextActive,
            startsAt: startsAt ? new Date(startsAt).toISOString() : null,
            endsAt: endsAt ? new Date(endsAt).toISOString() : null,
            showCountdown,
          }),
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
    [getToken, passwordEntered, message, level, startsAt, endsAt, showCountdown]
  );

  if (loadingState) return <Loader2 size={16} className="animate-spin text-text-secondary" />;

  return (
    <div className="glass rounded-card p-5 sm:p-6 max-w-lg">
      <p className="text-xs text-text-secondary mb-1.5 font-semibold">Live preview</p>
      <div
        className={`mb-5 flex items-center justify-center gap-2 px-4 py-2 rounded-card text-xs sm:text-sm text-center ${
          message.trim()
            ? level === "warning"
              ? "bg-amber/15 text-amber border border-amber/30"
              : "bg-primary/15 text-primary border border-primary/30"
            : "bg-white/5 text-text-secondary/50 border border-border"
        }`}
      >
        {level === "warning" ? <AlertTriangle size={14} className="shrink-0" /> : <Info size={14} className="shrink-0" />}
        <span>{message.trim() || "Your message will appear here as you type"}</span>
        {showCountdown && endsAt && (
          <span className="font-mono font-semibold opacity-80 shrink-0">
            · {formatCountdownPreview(new Date(endsAt).getTime() - previewNow)} left
          </span>
        )}
      </div>

      <label className="text-xs text-text-secondary block mb-1">Message</label>
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        maxLength={280}
        rows={3}
        placeholder="e.g. Scheduled maintenance tonight 11pm–1am UTC."
        className="w-full rounded-card bg-[rgb(var(--color-text-primary)/0.045)] border border-border px-3 py-2 text-sm mb-1 focus:outline-none focus:border-primary/50 resize-none"
      />
      <p className="text-xs text-text-secondary/60 mb-4">{message.length}/280</p>

      <label className="text-xs text-text-secondary block mb-1">Style</label>
      <select
        value={level}
        onChange={(e) => setLevel(e.target.value as "info" | "warning")}
        className="w-full rounded-card bg-[rgb(var(--color-text-primary)/0.045)] border border-border px-3 py-2 text-sm mb-4 focus:outline-none focus:border-primary/50"
      >
        <option value="info">Info (brand color)</option>
        <option value="warning">Warning (amber)</option>
      </select>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <label className="text-xs text-text-secondary block mb-1">Starts (optional)</label>
          <input
            type="datetime-local"
            value={startsAt}
            onChange={(e) => setStartsAt(e.target.value)}
            className="w-full rounded-card bg-[rgb(var(--color-text-primary)/0.045)] border border-border px-2.5 py-2 text-xs focus:outline-none focus:border-primary/50"
          />
        </div>
        <div>
          <label className="text-xs text-text-secondary block mb-1">Ends (optional)</label>
          <input
            type="datetime-local"
            value={endsAt}
            onChange={(e) => {
              setEndsAt(e.target.value);
              if (!e.target.value) setShowCountdown(false);
            }}
            className="w-full rounded-card bg-[rgb(var(--color-text-primary)/0.045)] border border-border px-2.5 py-2 text-xs focus:outline-none focus:border-primary/50"
          />
        </div>
      </div>
      <p className="text-xs text-text-secondary/60 mb-4">
        Both empty = shows as soon as you publish, stays up until you take it down. Auto-expiry at
        "Ends" happens on its own — visitors after that time never see it, no manual take-down needed.
      </p>

      <label className={`flex items-center gap-2 mb-1 text-xs ${endsAt ? "text-text-secondary" : "text-text-secondary/40"}`}>
        <input
          type="checkbox"
          checked={showCountdown}
          disabled={!endsAt}
          onChange={(e) => setShowCountdown(e.target.checked)}
          className="rounded"
        />
        Show a live countdown timer next to the message (ticks down to "Ends")
      </label>
      {!endsAt && <p className="text-xs text-text-secondary/40 mb-4">Set an "Ends" time to enable this.</p>}

      {saveError && <p className="text-xs text-rose mb-3">{saveError}</p>}
      {saved && <p className="text-xs text-emerald mb-3">Saved.</p>}

      <div className="flex gap-2">
        <button
          onClick={() => save(true)}
          disabled={saving || !message.trim()}
          className="flex-1 py-2 rounded-card bg-primary text-white text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
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
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [dateRange, setDateRange] = useState<"all" | "today" | "7d" | "30d">("all");

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

  const actionTypes = useMemo(() => Array.from(new Set((entries || []).map((e) => e.action))).sort(), [entries]);
  const visibleEntries = useMemo(() => {
    const cutoff =
      dateRange === "today" ? new Date().setHours(0, 0, 0, 0) : dateRange === "7d" ? Date.now() - 7 * 86400000 : dateRange === "30d" ? Date.now() - 30 * 86400000 : 0;
    return (entries || []).filter((e) => {
      if (actionFilter !== "all" && e.action !== actionFilter) return false;
      if (cutoff && (!e.at || new Date(e.at).getTime() < cutoff)) return false;
      return true;
    });
  }, [entries, actionFilter, dateRange]);

  if (fetching) return <Loader2 size={16} className="animate-spin text-text-secondary" />;
  if (error) return <p className="text-sm text-rose">{error}</p>;
  if (!entries || entries.length === 0) return <p className="text-sm text-text-secondary">No admin actions logged yet.</p>;

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-4">
        <div className="flex items-center gap-1.5 px-3 py-2 rounded-card glass text-xs">
          <Filter size={13} className="text-text-secondary" />
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="bg-transparent focus:outline-none"
          >
            <option value="all">All actions</option>
            {actionTypes.map((a) => (
              <option key={a} value={a}>
                {ACTION_LABELS[a] || a}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-1 px-1 py-1 rounded-card glass text-xs">
          {(["all", "today", "7d", "30d"] as const).map((r) => (
            <button
              key={r}
              onClick={() => setDateRange(r)}
              className={`px-2 py-1 rounded-[6px] ${dateRange === r ? "bg-primary text-white" : "text-text-secondary hover:text-text-primary"}`}
            >
              {r === "all" ? "All time" : r === "today" ? "Today" : r === "7d" ? "7 days" : "30 days"}
            </button>
          ))}
        </div>
        <ExportCsvButton
          onExport={() =>
            downloadCsv(
              `audityxe-activity-${new Date().toISOString().slice(0, 10)}.csv`,
              visibleEntries.map((e) => ({
                at: e.at || "",
                actorEmail: e.actorEmail,
                action: e.action,
                target: e.target || "",
                details: e.details || "",
              }))
            )
          }
        />
      </div>
      {visibleEntries.length === 0 && <p className="text-sm text-text-secondary">No matching entries.</p>}
      <div className="space-y-2">
        {visibleEntries.map((e) => (
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
    </div>
  );
}

/* ══════════════════════════ API KEYS TAB ══════════════════════════ */
interface ApiKeyRow {
  id: string;
  uid: string;
  email: string | null;
  label: string;
  keyPreview: string;
  createdAt: string | null;
  createdBy: string;
  lastUsedAt: string | null;
  revoked: boolean;
  revokedAt: string | null;
}

function ApiKeysTab({ getToken, passwordEntered }: { getToken: () => Promise<string | null>; passwordEntered: string }) {
  const [keys, setKeys] = useState<ApiKeyRow[] | null>(null);
  const [listError, setListError] = useState("");
  const [fetching, setFetching] = useState(true);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "revoked">("all");
  const [sortBy, setSortBy] = useState<"newest" | "last-used">("newest");

  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<UserListItem[] | null>(null);
  const [issuingUid, setIssuingUid] = useState<string | null>(null);
  const [labelDraft, setLabelDraft] = useState("");
  const [issueError, setIssueError] = useState("");
  const [justIssued, setJustIssued] = useState<{ rawKey: string; uid: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const fetchKeys = useCallback(async () => {
    setFetching(true);
    setListError("");
    try {
      const token = await getToken();
      const { ok, data, error } = await fetchJson<{ keys: ApiKeyRow[] }>("/api/admin/api-keys", {
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), "x-admin-password": passwordEntered },
      });
      if (!ok || !data) throw new Error(error || "Couldn't load API keys.");
      setKeys(data.keys);
    } catch (err) {
      setListError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setFetching(false);
    }
  }, [getToken, passwordEntered]);

  useEffect(() => {
    fetchKeys();
  }, [fetchKeys]);

  const searchUsers = useCallback(async () => {
    if (!query.trim()) {
      setSearchResults(null);
      return;
    }
    setSearching(true);
    try {
      const token = await getToken();
      const { ok, data } = await fetchJson<{ users: UserListItem[] }>(`/api/admin/users?q=${encodeURIComponent(query)}`, {
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), "x-admin-password": passwordEntered },
      });
      setSearchResults(ok && data ? data.users : []);
    } finally {
      setSearching(false);
    }
  }, [query, getToken, passwordEntered]);

  const issueKey = useCallback(
    async (u: UserListItem) => {
      setIssuingUid(u.uid);
      setIssueError("");
      setJustIssued(null);
      try {
        const token = await getToken();
        const { ok, data, error } = await fetchJson<{ rawKey: string; key: ApiKeyRow }>("/api/admin/api-keys", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            "x-admin-password": passwordEntered,
          },
          body: JSON.stringify({ uid: u.uid, email: u.email, label: labelDraft.trim() || `${u.email || u.uid}'s key` }),
        });
        if (!ok || !data) throw new Error(error || "Couldn't create key.");
        setJustIssued({ rawKey: data.rawKey, uid: u.uid });
        setLabelDraft("");
        fetchKeys();
      } catch (err) {
        setIssueError(err instanceof Error ? err.message : "Something went wrong.");
      } finally {
        setIssuingUid(null);
      }
    },
    [getToken, passwordEntered, labelDraft, fetchKeys]
  );

  const revokeKey = useCallback(
    async (id: string) => {
      if (!confirm("Revoke this API key? This can't be undone — the account would need a new key issued.")) return;
      setRevoking(id);
      try {
        const token = await getToken();
        const { ok, error } = await fetchJson(`/api/admin/api-keys/${id}`, {
          method: "DELETE",
          headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), "x-admin-password": passwordEntered },
        });
        if (!ok) throw new Error(error || "Couldn't revoke key.");
        fetchKeys();
      } catch (err) {
        alert(err instanceof Error ? err.message : "Something went wrong.");
      } finally {
        setRevoking(null);
      }
    },
    [getToken, passwordEntered, fetchKeys]
  );

  return (
    <div className="space-y-6">
      <div className="glass rounded-card p-5">
        <p className="text-sm font-semibold mb-1 flex items-center gap-2">
          <KeyRound size={14} /> Issue a new key
        </p>
        <p className="text-xs text-text-secondary mb-4">
          Search for an account, then issue. Only Pro-plan accounts are eligible — issuing fails
          otherwise. The raw key is shown exactly once below; copy it before navigating away.
        </p>
        <div className="flex gap-2 mb-3">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && searchUsers()}
            placeholder="Search email or UID"
            className="flex-1 rounded-card bg-[rgb(var(--color-text-primary)/0.045)] border border-border px-3 py-2 text-sm focus:outline-none focus:border-primary/50"
          />
          <input
            type="text"
            value={labelDraft}
            onChange={(e) => setLabelDraft(e.target.value)}
            placeholder="Label (optional)"
            className="w-48 rounded-card bg-[rgb(var(--color-text-primary)/0.045)] border border-border px-3 py-2 text-sm focus:outline-none focus:border-primary/50"
          />
          <button onClick={searchUsers} className="px-4 py-2 rounded-card glass hover:border-[rgb(var(--color-text-primary)/0.2)] flex items-center gap-2 text-sm">
            {searching ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />} Search
          </button>
        </div>

        {issueError && <p className="text-xs text-rose mb-3">{issueError}</p>}

        {justIssued && (
          <div className="rounded-card border border-emerald/40 bg-emerald/10 p-3 mb-3">
            <p className="text-xs font-semibold text-emerald mb-1">Key created — copy it now, it won't be shown again:</p>
            <div className="flex items-center gap-2">
              <code className="text-xs font-mono break-all">{justIssued.rawKey}</code>
              <button
                onClick={() => {
                  navigator.clipboard?.writeText(justIssued.rawKey);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1500);
                }}
                className="p-1.5 rounded-card glass hover:border-[rgb(var(--color-text-primary)/0.2)] shrink-0"
                title="Copy"
              >
                {copied ? <Check size={13} className="text-emerald" /> : <Copy size={13} />}
              </button>
            </div>
          </div>
        )}

        {searchResults && searchResults.length === 0 && <p className="text-xs text-text-secondary">No matching users.</p>}
        {searchResults && searchResults.length > 0 && (
          <div className="space-y-2">
            {searchResults.map((u) => (
              <div key={u.uid} className="flex flex-wrap items-center justify-between gap-2 rounded-card border border-border px-3 py-2">
                <div>
                  <p className="text-sm">{u.email || u.uid}</p>
                  <p className="text-xs text-text-secondary font-mono">{u.uid}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${u.plan === "pro" ? "bg-emerald/20 text-emerald" : "bg-white/10 text-text-secondary"}`}>
                    {u.plan} plan
                  </span>
                  <button
                    onClick={() => issueKey(u)}
                    disabled={u.plan !== "pro" || issuingUid === u.uid}
                    title={u.plan !== "pro" ? "Only Pro-plan accounts are eligible" : "Issue a key for this account"}
                    className="px-3 py-1.5 rounded-card bg-primary text-white text-xs font-semibold disabled:opacity-40 flex items-center gap-1.5"
                  >
                    {issuingUid === u.uid ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />} Issue key
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <p className="text-xs text-text-secondary font-semibold">Issued keys</p>
          {keys && keys.length > 0 && (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-card glass text-xs">
                <Filter size={12} className="text-text-secondary" />
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)} className="bg-transparent focus:outline-none">
                  <option value="all">All</option>
                  <option value="active">Active only</option>
                  <option value="revoked">Revoked only</option>
                </select>
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-card glass text-xs">
                <select value={sortBy} onChange={(e) => setSortBy(e.target.value as typeof sortBy)} className="bg-transparent focus:outline-none">
                  <option value="newest">Newest first</option>
                  <option value="last-used">Recently used first</option>
                </select>
              </div>
            </div>
          )}
        </div>
        {fetching && (
          <div className="flex items-center gap-2 text-sm text-text-secondary">
            <Loader2 size={14} className="animate-spin" /> Loading keys…
          </div>
        )}
        {listError && !fetching && <p className="text-sm text-rose">{listError}</p>}
        {!fetching && keys && keys.length === 0 && <p className="text-sm text-text-secondary">No keys issued yet.</p>}
        {!fetching && keys && keys.length > 0 && (() => {
          const visibleKeys = [...keys]
            .filter((k) => statusFilter === "all" || (statusFilter === "revoked" ? k.revoked : !k.revoked))
            .sort((a, b) => {
              if (sortBy === "last-used") {
                const ta = a.lastUsedAt ? new Date(a.lastUsedAt).getTime() : 0;
                const tb = b.lastUsedAt ? new Date(b.lastUsedAt).getTime() : 0;
                return tb - ta;
              }
              const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
              const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
              return tb - ta;
            });
          if (visibleKeys.length === 0) return <p className="text-sm text-text-secondary">No keys match this filter.</p>;
          return (
          <div className="space-y-2">
            {visibleKeys.map((k) => (
              <div key={k.id} className="glass rounded-card p-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold flex items-center gap-2">
                    {k.label}
                    {k.revoked && <span className="text-xs px-2 py-0.5 rounded-full bg-rose/20 text-rose">Revoked</span>}
                  </p>
                  <p className="text-xs text-text-secondary">
                    {k.email || k.uid} · ···{k.keyPreview} · issued by {k.createdBy}
                  </p>
                  <p className="text-xs text-text-secondary/70">
                    Last used: {k.lastUsedAt ? new Date(k.lastUsedAt).toLocaleString() : "never"}
                  </p>
                </div>
                {!k.revoked && (
                  <button
                    onClick={() => revokeKey(k.id)}
                    disabled={revoking === k.id}
                    className="p-2 rounded-card glass hover:border-[rgb(var(--color-text-primary)/0.2)]"
                    title="Revoke"
                  >
                    {revoking === k.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} className="text-rose" />}
                  </button>
                )}
              </div>
            ))}
          </div>
          );
        })()}
      </div>
    </div>
  );
}
