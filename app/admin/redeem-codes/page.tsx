"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, Plus, Copy, Trash2, Power, Tag, Check } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useAuth } from "@/context/AuthContext";
import { PLANS, PlanId } from "@/lib/plans";
import PasswordInput from "@/components/PasswordInput";
import { fetchJson } from "@/lib/fetch-json";

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

export default function AdminRedeemCodesPage() {
  const { user, loading, getToken } = useAuth();
  const router = useRouter();
  const [codes, setCodes] = useState<RedeemCodeDoc[] | null>(null);
  const [listError, setListError] = useState("");
  const [fetching, setFetching] = useState(true);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [denyReason, setDenyReason] = useState("");
  const [copiedCode, setCopiedCode] = useState("");

  const [adminPassword, setAdminPassword] = useState("");
  const [passwordEntered, setPasswordEntered] = useState(""); // last value actually submitted
  const [passwordError, setPasswordError] = useState("");
  const [checkingPassword, setCheckingPassword] = useState(false);

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

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login?redirect=/admin/redeem-codes");
    }
  }, [loading, user, router]);

  const fetchCodes = useCallback(
    async (passwordOverride?: string) => {
      if (!user) return;
      const pw = passwordOverride ?? passwordEntered;
      setFetching(true);
      setListError("");
      try {
        const token = await getToken();
        const { ok, status, data, error } = await fetchJson<{ codes: RedeemCodeDoc[]; code?: string }>(
          "/api/admin/redeem-codes",
          {
            headers: {
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
              "x-admin-password": pw,
            },
          }
        );
        if (status === 403) {
          const errCode = (data as any)?.code;
          if (errCode === "NOT_ADMIN") {
            setDenyReason(
              `Signed in as ${user.email || "unknown email"} — this address isn't in ADMIN_EMAILS. Add it (comma-separated) in your Vercel env vars and redeploy.`
            );
            return;
          }
          // Wrong/missing password — email is admin, let them retry.
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
        if (!ok || !data) throw new Error(error || "Couldn't load redeem codes.");
        setIsAdmin(true);
        setCodes(data.codes);
      } catch (err) {
        setListError(err instanceof Error ? err.message : "Something went wrong.");
      } finally {
        setFetching(false);
        setCheckingPassword(false);
      }
    },
    [user, getToken, passwordEntered]
  );

  const submitPassword = useCallback(() => {
    if (!adminPassword.trim() || checkingPassword) return;
    setCheckingPassword(true);
    setPasswordError("");
    setPasswordEntered(adminPassword);
    fetchCodes(adminPassword);
  }, [adminPassword, checkingPassword, fetchCodes]);

  useEffect(() => {
    if (!denyReason) return;
    const t = setTimeout(() => router.replace("/account"), 6000);
    return () => clearTimeout(t);
  }, [denyReason, router]);

  const createCode = useCallback(async () => {
    if (creating) return;
    setCreating(true);
    setCreateError("");
    try {
      const token = await getToken();
      const { ok, data, error } = await fetchJson<{ code: RedeemCodeDoc }>("/api/admin/redeem-codes", {
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
      if (!ok || !data) throw new Error(error || "Couldn't create code.");
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
        body: JSON.stringify({
          count: batchCount,
          plan: batchPlan,
          durationDays: batchDurationDays,
          note: batchNote.trim() || null,
        }),
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
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          "x-admin-password": passwordEntered,
        },
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

  // Nothing about the admin panel — no form, no list, no field names —
  // renders until the correct admin password has been supplied.
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
          <Tag size={20} className="text-primary" /> Redeem Codes
        </h1>
        <p className="text-sm text-text-secondary mb-6">
          For giveaways and comps — create a code here and it's instantly redeemable at /account for
          free plan access. No manual Firestore edits.
        </p>

        <div className="glass rounded-card p-5 sm:p-6 mb-8">
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

        <div className="glass rounded-card p-5 sm:p-6 mb-8">
          <span className="text-sm font-semibold mb-1 block">Generate giveaway batch</span>
          <p className="text-xs text-text-secondary mb-4">
            Creates N distinct single-use codes at once — e.g. 50 codes for a YouTube giveaway, one per winner.
          </p>
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
                  onClick={() => navigator.clipboard?.writeText(batchResult.join("\n"))}
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

        {!fetching && codes && codes.length === 0 && (
          <p className="text-sm text-text-secondary">No codes yet — create one above.</p>
        )}

        {!fetching && codes && codes.length > 0 && (
          <div className="space-y-3">
            {codes.map((c) => (
              <div key={c.code} className="glass rounded-card p-4 flex flex-wrap items-center gap-3 justify-between">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => copyCode(c.code)}
                    className="font-mono text-sm font-semibold flex items-center gap-1.5 hover:text-primary"
                    title="Copy code"
                  >
                    {c.code} {copiedCode === c.code ? <Check size={13} className="text-emerald" /> : <Copy size={13} />}
                  </button>
                  {!c.active && <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-text-secondary">Disabled</span>}
                </div>
                <div className="text-xs text-text-secondary flex flex-wrap gap-x-4 gap-y-1">
                  <span>
                    {PLANS[c.plan]?.name ?? c.plan} · {c.durationDays}d
                  </span>
                  <span>{c.redemptions}/{c.maxRedemptions} redeemed</span>
                  {c.note && <span>"{c.note}"</span>}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleActive(c.code, !c.active)}
                    className="p-2 rounded-card glass hover:border-[rgb(var(--color-text-primary)/0.2)]"
                    title={c.active ? "Disable" : "Enable"}
                  >
                    <Power size={14} className={c.active ? "text-emerald" : "text-text-secondary"} />
                  </button>
                  <button
                    onClick={() => removeCode(c.code)}
                    className="p-2 rounded-card glass hover:border-[rgb(var(--color-text-primary)/0.2)]"
                    title="Delete"
                  >
                    <Trash2 size={14} className="text-rose" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}
