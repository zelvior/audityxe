"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, Plus, Copy, Trash2, Power, Tag, Check } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useAuth } from "@/context/AuthContext";
import { PLANS, PlanId } from "@/lib/plans";
import { fetchJson } from "@/lib/fetch-json";

interface DiscountCodeDoc {
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

export default function AdminDiscountCodesPage() {
  const { user, loading, getToken } = useAuth();
  const router = useRouter();
  const [codes, setCodes] = useState<DiscountCodeDoc[] | null>(null);
  const [listError, setListError] = useState("");
  const [fetching, setFetching] = useState(true);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [notAdminEmail, setNotAdminEmail] = useState(false);
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

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login?redirect=/admin/discount-codes");
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
        const { ok, status, data, error } = await fetchJson<{ codes: DiscountCodeDoc[]; code?: string }>(
          "/api/admin/discount-codes",
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
            setNotAdminEmail(true);
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
          setNotAdminEmail(true);
          return;
        }
        if (!ok || !data) throw new Error(error || "Couldn't load discount codes.");
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
    if (notAdminEmail) {
      router.replace("/account");
    }
  }, [notAdminEmail, router]);

  const createCode = useCallback(async () => {
    if (creating) return;
    setCreating(true);
    setCreateError("");
    try {
      const token = await getToken();
      const { ok, data, error } = await fetchJson<{ code: DiscountCodeDoc }>("/api/admin/discount-codes", {
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

  if (notAdminEmail) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <Loader2 size={22} className="animate-spin text-text-secondary" />
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
            <input
              type="password"
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submitPassword()}
              placeholder="Password"
              autoFocus
              className="w-full rounded-card bg-white/5 border border-white/10 px-3 py-2 text-sm mb-3 focus:outline-none focus:border-primary/50"
              disabled={checkingPassword}
            />
            {passwordError && <p className="text-xs text-rose mb-3">{passwordError}</p>}
            <button
              onClick={submitPassword}
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
        <Link href="/account" className="inline-flex items-center gap-2 text-sm text-text-secondary hover:text-white mb-6">
          <ArrowLeft size={16} /> Back to account
        </Link>

        <h1 className="font-display font-bold text-2xl mb-1 flex items-center gap-2">
          <Tag size={20} className="text-primary" /> Discount Codes
        </h1>
        <p className="text-sm text-text-secondary mb-6">
          Create a code here and it's instantly redeemable at /account — no manual Firestore edits.
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
                className="w-full rounded-card bg-white/5 border border-white/10 px-3 py-2 text-sm font-mono uppercase focus:outline-none focus:border-primary/50"
              />
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
                  <span>{PLANS[c.plan]?.name ?? c.plan} · {c.durationDays}d</span>
                  <span>{c.redemptions}/{c.maxRedemptions} redeemed</span>
                  {c.note && <span>"{c.note}"</span>}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleActive(c.code, !c.active)}
                    className="p-2 rounded-card glass hover:border-white/20"
                    title={c.active ? "Disable" : "Enable"}
                  >
                    <Power size={14} className={c.active ? "text-emerald" : "text-text-secondary"} />
                  </button>
                  <button
                    onClick={() => removeCode(c.code)}
                    className="p-2 rounded-card glass hover:border-white/20"
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
