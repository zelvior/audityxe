"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Database, Play, RefreshCw, Save, Lock, AlertTriangle } from "lucide-react";
import AdminShell, { useAdminApi } from "@/components/admin/AdminShell";
import { Badge, Card, Notice, Spinner, TableWrap, btn, btnPrimary, fmtDate, inputCls, td, th, useFlash } from "@/components/admin/ui";

interface Policy { id: string; collection: string; field: string; fieldType: string; label: string; description: string; enabled: boolean; ttlDays: number; defaultTtlDays: number; locked?: boolean; sensitive?: boolean; minTtlDays: number; maxTtlDays: number }
interface Retention { policies: Policy[]; unverifiedUsers: { enabled: boolean; ttlDays: number } }
interface RunSummary { ranAt: string; source: string; results: Record<string, { ok: boolean; deleted?: number; skipped?: string; error?: string }> }
interface Stat { id: string; total: number | null; eligible: number | null; oldest: string | null; error?: string }

function RetentionBody() {
  const api = useAdminApi();
  const [data, setData] = useState<Retention | null>(null);
  const [draft, setDraft] = useState<Retention | null>(null);
  const [lastRun, setLastRun] = useState<RunSummary | null>(null);
  const [stats, setStats] = useState<Record<string, Stat>>({});
  const [workerConfigured, setWorkerConfigured] = useState(false);
  const [busy, setBusy] = useState<"" | "save" | "run" | "stats">("");
  const [msg, flash, clear] = useFlash();

  const load = useCallback(async (withStats = false) => {
    const r = await api(`/api/admin/retention${withStats ? "?stats=1" : ""}`);
    if (!r.ok) return flash("error", r.error || "Failed to load.");
    setData(r.data.retention);
    setDraft((d) => d ?? r.data.retention);
    setLastRun(r.data.lastRun);
    setWorkerConfigured(!!r.data.workerConfigured);
    if (r.data.stats) setStats(Object.fromEntries((r.data.stats as Stat[]).map((s) => [s.id, s])));
  }, [api, flash]);

  useEffect(() => { load(); }, [load]);

  const dirty = useMemo(() => JSON.stringify(data) !== JSON.stringify(draft), [data, draft]);

  const setPolicy = (id: string, patch: Partial<Policy>) =>
    setDraft((d) => (d ? { ...d, policies: d.policies.map((p) => (p.id === id ? { ...p, ...patch } : p)) } : d));

  async function save() {
    if (!draft || !data) return;
    setBusy("save");
    const policies: Record<string, { enabled: boolean; ttlDays?: number }> = {};
    for (const p of draft.policies) {
      const before = data.policies.find((x) => x.id === p.id)!;
      if (p.enabled !== before.enabled || p.ttlDays !== before.ttlDays) policies[p.id] = { enabled: p.enabled, ...(p.locked ? {} : { ttlDays: Number(p.ttlDays) }) };
    }
    const unverified = draft.unverifiedUsers.enabled !== data.unverifiedUsers.enabled || draft.unverifiedUsers.ttlDays !== data.unverifiedUsers.ttlDays ? { enabled: draft.unverifiedUsers.enabled, ttlDays: Number(draft.unverifiedUsers.ttlDays) } : undefined;
    const r = await api("/api/admin/retention", { method: "PUT", body: { policies, unverifiedUsers: unverified } });
    setBusy("");
    if (!r.ok) return flash("error", r.error || "Save failed.");
    setData(r.data.retention); setDraft(r.data.retention);
    flash("success", "Saved. The Cloudflare Worker applies this on its next run.");
  }

  async function run() {
    if (dirty && !confirm("You have unsaved changes — the run will use the SAVED settings. Continue?")) return;
    if (!confirm("Delete all data past its retention limit now? This can't be undone.")) return;
    setBusy("run");
    const r = await api("/api/admin/retention", { method: "POST", body: {} });
    setBusy("");
    if (!r.ok) return flash("error", r.error || "Run failed.");
    setLastRun(r.data.lastRun);
    flash("success", `Cleanup finished via the ${r.data.via === "worker" ? "Cloudflare Worker" : "app"}.`);
    load(true);
  }

  async function refreshStats() {
    setBusy("stats");
    await load(true);
    setBusy("");
  }

  if (!draft) return <div className="py-16 flex justify-center"><Spinner /></div>;
  const totalDeleted = lastRun ? Object.values(lastRun.results).reduce((n, r) => n + (r.deleted || 0), 0) : 0;

  return (
    <div className="space-y-5">
      {msg && <Notice kind={msg.kind} onClose={clear}>{msg.text}</Notice>}

      <Card title="How this works">
        <p className="text-xs text-text-secondary leading-relaxed">
          Old data is deleted automatically so Firestore never fills up. A scheduled <strong>Cloudflare Worker</strong> reads the limits you set
          here and removes anything older than its limit. Changes are applied on the Worker&apos;s next scheduled run (every few hours) — or press
          <em> Run cleanup now</em>. <Lock size={11} className="inline" /> Users, settings, redeem codes, the showcase and global counters can never be deleted by retention.
        </p>
        <div className="flex flex-wrap items-center gap-2 mt-3">
          <Badge tone={workerConfigured ? "good" : "warn"}>{workerConfigured ? "Worker connected" : "Worker URL not set — Run now uses the app"}</Badge>
          {lastRun ? <Badge tone="info">Last run {fmtDate(lastRun.ranAt)} · {lastRun.source} · {totalDeleted.toLocaleString()} deleted</Badge> : <Badge>No run recorded yet</Badge>}
        </div>
        {!workerConfigured && <p className="text-[11px] text-text-secondary mt-2">Set <code>RETENTION_WORKER_URL</code> and <code>CLEANUP_SHARED_SECRET</code> in Vercel to let this page trigger the Worker directly.</p>}
      </Card>

      <div className="flex flex-wrap gap-2">
        <button className={btnPrimary} onClick={save} disabled={!dirty || busy !== ""}>{busy === "save" ? <Spinner /> : <Save size={14} />} Save changes</button>
        <button className={btn} onClick={() => setDraft(data)} disabled={!dirty || busy !== ""}>Discard</button>
        <button className={btn} onClick={run} disabled={busy !== ""}>{busy === "run" ? <Spinner /> : <Play size={13} />} Run cleanup now</button>
        <button className={btn} onClick={refreshStats} disabled={busy !== ""}>{busy === "stats" ? <Spinner /> : <RefreshCw size={13} />} Refresh sizes</button>
      </div>

      <TableWrap>
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border"><th className={th}>On</th><th className={th}>Data</th><th className={th}>Keep for (days)</th><th className={th}>Size now</th><th className={th}>Over limit</th><th className={th}>Last run</th></tr>
          </thead>
          <tbody>
            {draft.policies.map((p) => {
              const s = stats[p.id]; const r = lastRun?.results[p.id];
              return (
                <tr key={p.id} className="border-b border-border last:border-0 align-top">
                  <td className={td}><input type="checkbox" aria-label={`Enable ${p.label}`} checked={p.enabled} onChange={(e) => setPolicy(p.id, { enabled: e.target.checked })} /></td>
                  <td className={td}>
                    <p className="font-semibold flex items-center gap-1.5">{p.label}{p.sensitive && <AlertTriangle size={12} className="text-amber-500" aria-label="Financial records" />}</p>
                    <p className="text-[11px] text-text-secondary max-w-md">{p.description}</p>
                    <p className="font-mono text-[10px] text-text-secondary mt-0.5">{p.collection}.{p.field}</p>
                  </td>
                  <td className={td}>
                    {p.locked ? <Badge>self-expiring</Badge> : (
                      <input type="number" aria-label={`${p.label} retention days`} className={`${inputCls} !w-24`} min={p.minTtlDays} max={p.maxTtlDays} step="any" value={p.ttlDays} onChange={(e) => setPolicy(p.id, { ttlDays: e.target.value === "" ? (0 as number) : Number(e.target.value) })} />
                    )}
                    {!p.locked && <p className="text-[10px] text-text-secondary mt-1">default {p.defaultTtlDays} · {p.minTtlDays}–{p.maxTtlDays}</p>}
                  </td>
                  <td className={`${td} font-mono`}>{s ? (s.error ? <span className="text-rose" title={s.error}>error</span> : s.total?.toLocaleString()) : "—"}</td>
                  <td className={`${td} font-mono`}>{s && !s.error ? <span className={s.eligible ? "text-amber-500" : ""}>{s.eligible?.toLocaleString()}</span> : "—"}</td>
                  <td className={td}>
                    {r ? (r.ok ? <Badge tone={r.skipped && r.skipped !== "disabled" ? "warn" : "good"}>{r.skipped ? r.skipped : `${(r.deleted || 0).toLocaleString()} deleted`}</Badge> : <Badge tone="bad">{r.error?.slice(0, 40) || "error"}</Badge>) : "—"}
                  </td>
                </tr>
              );
            })}
            <tr className="align-top">
              <td className={td}><input type="checkbox" aria-label="Enable unverified-account cleanup" checked={draft.unverifiedUsers.enabled} onChange={(e) => setDraft({ ...draft, unverifiedUsers: { ...draft.unverifiedUsers, enabled: e.target.checked } })} /></td>
              <td className={td}><p className="font-semibold">Unverified accounts</p><p className="text-[11px] text-text-secondary max-w-md">Firebase Auth accounts that never verified their email.</p></td>
              <td className={td}><input type="number" aria-label="Unverified accounts retention days" className={`${inputCls} !w-24`} min={1} max={90} value={draft.unverifiedUsers.ttlDays} onChange={(e) => setDraft({ ...draft, unverifiedUsers: { ...draft.unverifiedUsers, ttlDays: Number(e.target.value) } })} /></td>
              <td className={td}>—</td><td className={td}>—</td>
              <td className={td}>{lastRun?.results.unverifiedUsers ? <Badge tone={lastRun.results.unverifiedUsers.ok ? "good" : "bad"}>{lastRun.results.unverifiedUsers.skipped || `${lastRun.results.unverifiedUsers.deleted ?? 0} deleted`}</Badge> : "—"}</td>
            </tr>
          </tbody>
        </table>
      </TableWrap>
      <p className="text-[11px] text-text-secondary">&quot;Size now&quot; and &quot;Over limit&quot; use Firestore count queries and only run when you press <em>Refresh sizes</em>.</p>
    </div>
  );
}

export default function AdminRetentionPage() {
  return (
    <AdminShell title="Data retention" subtitle="Keep Firestore small: set how long each kind of data is kept. A Cloudflare Worker enforces it.">
      <RetentionBody />
    </AdminShell>
  );
}
