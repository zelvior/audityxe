"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Search, Settings2, ShieldCheck, MailCheck, LogOut, RotateCcw } from "lucide-react";
import AdminShell, { useAdminApi } from "@/components/admin/AdminShell";
import { Badge, Card, Modal, Notice, Spinner, TableWrap, btn, btnDanger, btnPrimary, fmtDate, fmtDay, inputCls, td, th, useFlash } from "@/components/admin/ui";

interface Row {
  uid: string; email: string | null; displayName: string | null; plan: string; planExpiresAt: string | null;
  moderation: { status: "active" | "suspended" | "banned"; reason: string | null; until: string | null };
  createdAt: string | null; lastActiveAt: string | null;
  limits: { dailyAudits: number | null; perMinute: number | null; note: string | null } | null;
}
interface Detail extends Row {
  usage: { used: number; limit: number };
  auth: { emailVerified: boolean; disabled: boolean; providers: string[]; lastSignInTime: string | null } | null;
  auditCount: number | null;
  recentPayments: { id: string; plan: string; amountUsd: number; status: string; at: string | null }[];
}

const statusTone = (s: string) => (s === "banned" ? "bad" : s === "suspended" ? "warn" : "good");

function UserModal({ uid, onClose, onChanged }: { uid: string; onClose: () => void; onChanged: () => void }) {
  const api = useAdminApi();
  const [d, setD] = useState<Detail | null>(null);
  const [msg, flash, clear] = useFlash();
  const [busy, setBusy] = useState("");
  const [daily, setDaily] = useState(""); const [perMin, setPerMin] = useState(""); const [note, setNote] = useState("");
  const [plan, setPlan] = useState("free"); const [expires, setExpires] = useState("");
  const [reason, setReason] = useState(""); const [until, setUntil] = useState("");

  const load = useCallback(async () => {
    const r = await api(`/api/admin/users/${encodeURIComponent(uid)}`);
    if (!r.ok) return flash("error", r.error || "Failed to load user.");
    const u: Detail = r.data.user;
    setD(u); setDaily(u.limits?.dailyAudits?.toString() ?? ""); setPerMin(u.limits?.perMinute?.toString() ?? ""); setNote(u.limits?.note ?? "");
    setPlan(u.plan); setExpires(u.planExpiresAt ? u.planExpiresAt.slice(0, 10) : "");
  }, [api, uid, flash]);
  useEffect(() => { load(); }, [load]);

  async function act(action: string, body: Record<string, unknown> = {}, ok = "Done.") {
    setBusy(action); clear();
    const r = await api(`/api/admin/users/${encodeURIComponent(uid)}`, { method: "POST", body: { action, ...body } });
    setBusy("");
    if (!r.ok) return flash("error", r.error || "Action failed.");
    flash("success", ok); await load(); onChanged();
  }

  if (!d) return <Modal title="User" onClose={onClose} wide><div className="py-10 flex justify-center"><Spinner /></div></Modal>;
  const m = d.moderation;
  return (
    <Modal title={d.email || d.uid} onClose={onClose} wide>
      <div className="space-y-4 text-sm">
        {msg && <Notice kind={msg.kind} onClose={clear}>{msg.text}</Notice>}
        <div className="flex flex-wrap gap-1.5">
          <Badge tone="info">{d.plan}{d.planExpiresAt ? ` until ${fmtDay(d.planExpiresAt)}` : ""}</Badge>
          <Badge tone={statusTone(m.status)}>{m.status}</Badge>
          <Badge tone={d.auth?.emailVerified ? "good" : "warn"}>{d.auth?.emailVerified ? "email verified" : "email not verified"}</Badge>
          {d.auth?.disabled && <Badge tone="bad">auth disabled</Badge>}
          {d.limits && <Badge tone="info">custom limits</Badge>}
        </div>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
          <dt className="text-text-secondary">UID</dt><dd className="font-mono break-all">{d.uid}</dd>
          <dt className="text-text-secondary">Joined</dt><dd>{fmtDate(d.createdAt)}</dd>
          <dt className="text-text-secondary">Last active</dt><dd>{fmtDate(d.lastActiveAt)}</dd>
          <dt className="text-text-secondary">Sign-in methods</dt><dd>{d.auth?.providers.join(", ") || "—"}</dd>
          <dt className="text-text-secondary">Audits today</dt><dd>{d.usage.used} / {d.usage.limit}</dd>
          <dt className="text-text-secondary">Audits all-time</dt><dd>{d.auditCount ?? "—"}</dd>
        </dl>

        <Card title="Account">
          <div className="flex flex-wrap gap-2">
            <button className={btn} disabled={!!busy || d.auth?.emailVerified} onClick={() => act("verify-email", {}, "Email marked as verified.")}><MailCheck size={13} /> Verify email</button>
            <button className={btn} disabled={!!busy} onClick={() => act("revoke-sessions", {}, "All sessions revoked.")}><LogOut size={13} /> Sign out everywhere</button>
            <button className={btn} disabled={!!busy} onClick={() => act("reset-usage", {}, "Today's usage reset.")}><RotateCcw size={13} /> Reset today&apos;s usage</button>
          </div>
        </Card>

        <Card title="Plan">
          <div className="flex flex-wrap items-end gap-2">
            <label className="text-[11px] text-text-secondary">Plan
              <select className={`${inputCls} mt-1`} value={plan} onChange={(e) => setPlan(e.target.value)}><option value="free">Free</option><option value="standard">Standard</option><option value="pro">Pro</option></select>
            </label>
            <label className="text-[11px] text-text-secondary">Expires (blank = never)
              <input type="date" className={`${inputCls} mt-1`} value={expires} onChange={(e) => setExpires(e.target.value)} disabled={plan === "free"} />
            </label>
            <button className={btnPrimary} disabled={!!busy} onClick={() => act("set-plan", { plan, expiresAt: plan === "free" || !expires ? null : new Date(`${expires}T23:59:59Z`).toISOString() }, "Plan updated.")}>Apply</button>
          </div>
        </Card>

        <Card title="Custom quota & rate limits">
          <p className="text-[11px] text-text-secondary mb-2">Overrides this user&apos;s plan. Leave a field empty to use the default. Takes effect within 30 seconds.</p>
          <div className="grid sm:grid-cols-3 gap-2">
            <label className="text-[11px] text-text-secondary">Audits per day<input className={`${inputCls} mt-1`} inputMode="numeric" placeholder="plan default" value={daily} onChange={(e) => setDaily(e.target.value)} /></label>
            <label className="text-[11px] text-text-secondary">Requests per minute<input className={`${inputCls} mt-1`} inputMode="numeric" placeholder="system default" value={perMin} onChange={(e) => setPerMin(e.target.value)} /></label>
            <label className="text-[11px] text-text-secondary">Note (internal)<input className={`${inputCls} mt-1`} maxLength={200} value={note} onChange={(e) => setNote(e.target.value)} /></label>
          </div>
          <div className="flex gap-2 mt-3">
            <button className={btnPrimary} disabled={!!busy} onClick={() => act("set-limits", { dailyAudits: daily.trim() === "" ? null : Number(daily), perMinute: perMin.trim() === "" ? null : Number(perMin), note }, "Limits saved.")}>Save limits</button>
            <button className={btn} disabled={!!busy || !d.limits} onClick={() => act("set-limits", { dailyAudits: null, perMinute: null }, "Limits cleared — plan defaults apply.")}>Clear overrides</button>
          </div>
        </Card>

        <Card title="Block / unblock">
          {m.status !== "active" && <p className="text-xs mb-2">Currently <strong>{m.status}</strong>{m.until ? ` until ${fmtDate(m.until)}` : ""}{m.reason ? ` — ${m.reason}` : ""}.</p>}
          <div className="grid sm:grid-cols-2 gap-2">
            <input className={inputCls} placeholder="Reason (shown in the log)" value={reason} onChange={(e) => setReason(e.target.value)} />
            <input type="datetime-local" className={inputCls} value={until} onChange={(e) => setUntil(e.target.value)} aria-label="Suspend until" />
          </div>
          <div className="flex flex-wrap gap-2 mt-3">
            <button className={btnDanger} disabled={!!busy || !until} onClick={() => act("suspend", { reason, until: new Date(until).toISOString() }, "User suspended.")}>Suspend until date</button>
            <button className={btnDanger} disabled={!!busy} onClick={() => confirm("Permanently block this account?") && act("ban", { reason }, "User banned.")}>Ban</button>
            <button className={btn} disabled={!!busy || m.status === "active"} onClick={() => act("unban", {}, "User unblocked.")}><ShieldCheck size={13} /> Unblock</button>
          </div>
        </Card>

        {d.recentPayments.length > 0 && (
          <Card title="Recent payments">
            <ul className="text-xs space-y-1">{d.recentPayments.map((p) => <li key={p.id} className="flex justify-between gap-3"><span>{p.plan} · ${p.amountUsd} · {p.status}</span><span className="text-text-secondary">{fmtDate(p.at)}</span></li>)}</ul>
          </Card>
        )}
      </div>
    </Modal>
  );
}

function UsersBody() {
  const api = useAdminApi();
  const [rows, setRows] = useState<Row[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [mode, setMode] = useState<"browse" | "search">("browse");
  const [degraded, setDegraded] = useState(false);
  const [total, setTotal] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState(""); const [plan, setPlan] = useState(""); const [status, setStatus] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const [msg, flash, clear] = useFlash();
  const seq = useRef(0);

  const fetchPage = useCallback(async (reset: boolean, cur: string | null) => {
    const id = ++seq.current;
    setLoading(true);
    const p = new URLSearchParams({ limit: "50" });
    if (q.trim()) p.set("q", q.trim());
    if (plan) p.set("plan", plan);
    if (status) p.set("status", status);
    if (cur && !reset) p.set("cursor", cur);
    if (reset) p.set("count", "1");
    const r = await api(`/api/admin/users?${p}`);
    if (id !== seq.current) return; // a newer request superseded this one
    setLoading(false);
    if (!r.ok) return flash("error", r.error || "Failed to load users.");
    setRows((prev) => (reset ? r.data.items : [...prev, ...r.data.items]));
    setCursor(r.data.nextCursor); setMode(r.data.mode); setDegraded(!!r.data.degraded);
    if (reset) setTotal(typeof r.data.total === "number" ? r.data.total : null);
  }, [api, q, plan, status, flash]);

  // Filters re-query immediately; typing in search waits for Enter/blur so we don't query per keystroke.
  useEffect(() => {
    fetchPage(true, null);
    // Re-query when a filter changes; typing in the search box waits for Enter.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan, status]);

  return (
    <div className="space-y-4">
      {msg && <Notice kind={msg.kind} onClose={clear}>{msg.text}</Notice>}
      <form className="flex flex-wrap gap-2" onSubmit={(e) => { e.preventDefault(); fetchPage(true, null); }}>
        <div className="relative flex-1 min-w-[220px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
          <input className={`${inputCls} pl-9`} placeholder="Search by email, name or UID — press Enter" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search users" />
        </div>
        <select className={`${inputCls} !w-auto`} value={plan} onChange={(e) => setPlan(e.target.value)} aria-label="Filter by plan"><option value="">All plans</option><option value="free">Free</option><option value="standard">Standard</option><option value="pro">Pro</option></select>
        <select className={`${inputCls} !w-auto`} value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter by status"><option value="">All statuses</option><option value="active">Active</option><option value="suspended">Suspended</option><option value="banned">Banned</option></select>
        <button className={btnPrimary} type="submit">Search</button>
      </form>
      <p className="text-[11px] text-text-secondary">
        {total !== null && mode === "browse" && !plan && !status ? `${total.toLocaleString()} users · ` : ""}{rows.length.toLocaleString()} shown{cursor ? " · more available" : ""}
        {degraded && " · filters are running without a Firestore index (still works; deploy firestore.indexes.json for faster filtered lists)"}
      </p>

      <TableWrap>
        <table className="w-full text-xs">
          <thead><tr className="border-b border-border"><th className={th}>User</th><th className={th}>Plan</th><th className={th}>Status</th><th className={th}>Limits</th><th className={th}>Joined</th><th className={th}></th></tr></thead>
          <tbody>
            {rows.map((u) => (
              <tr key={u.uid} className="border-b border-border last:border-0 hover:bg-[rgb(var(--color-text-primary)/0.03)]">
                <td className={td}><p className="font-semibold">{u.email || "(no email)"}</p><p className="text-[10px] text-text-secondary">{u.displayName || ""} <span className="font-mono">{u.uid.slice(0, 10)}…</span></p></td>
                <td className={td}><Badge tone="info">{u.plan}</Badge>{u.planExpiresAt && <p className="text-[10px] text-text-secondary mt-0.5">to {fmtDay(u.planExpiresAt)}</p>}</td>
                <td className={td}><Badge tone={statusTone(u.moderation.status)}>{u.moderation.status}</Badge></td>
                <td className={td}>{u.limits ? <Badge tone="warn">{[u.limits.dailyAudits !== null ? `${u.limits.dailyAudits}/day` : "", u.limits.perMinute !== null ? `${u.limits.perMinute}/min` : ""].filter(Boolean).join(" · ")}</Badge> : <span className="text-text-secondary">plan default</span>}</td>
                <td className={td}>{fmtDay(u.createdAt)}</td>
                <td className={td}><button className={btn} onClick={() => setOpen(u.uid)}><Settings2 size={12} /> Manage</button></td>
              </tr>
            ))}
            {!rows.length && !loading && <tr><td className={`${td} text-text-secondary text-center py-8`} colSpan={6}>No users match.</td></tr>}
          </tbody>
        </table>
      </TableWrap>
      <div className="flex justify-center">{loading ? <Spinner /> : cursor ? <button className={btn} onClick={() => fetchPage(false, cursor)}>Load more</button> : null}</div>
      {open && <UserModal uid={open} onClose={() => setOpen(null)} onChanged={() => fetchPage(true, null)} />}
    </div>
  );
}

export default function AdminUsersPage() {
  return (
    <AdminShell title="User management" subtitle="View, verify, block and manage users, with custom quotas and rate limits. Handles any number of users.">
      <UsersBody />
    </AdminShell>
  );
}
