"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { RefreshCw, Undo2, BadgeCheck, StickyNote } from "lucide-react";
import AdminShell, { useAdminApi } from "@/components/admin/AdminShell";
import { Badge, Card, Modal, Notice, Spinner, Stat, TableWrap, btn, btnDanger, btnPrimary, fmtDate, inputCls, td, th, useFlash, usd } from "@/components/admin/ui";

interface Pay {
  id: string; uid: string | null; plan: string; state: string; status: string; credited: boolean; amountUsd: number; orderId: string;
  updatedAt: string | null; refund: { at: string | null; by: string | null; amountUsd: number; reason: string | null; revokedAccess: boolean } | null;
  manualCredit: { by: string | null } | null; note: string | null; dismissed: boolean;
}
interface Summary { days: number; scanned: number; truncated: boolean; paidCount: number; grossUsd: number; refundedCount: number; refundedUsd: number; failedCount: number; commissionUsd: number; netUsd: number; commission: { commissionPercent: number; flatFeeUsd: number; label: string } }

const TABS = [["", "All"], ["paid", "Paid"], ["failed", "Failed"], ["expired", "Expired"], ["partially_paid", "Partial"], ["refunded", "Refunded"]] as const;
const tone = (s: string) => (s === "paid" ? "good" : s === "refunded" ? "info" : s === "partially_paid" ? "warn" : "bad");

function PaymentsBody() {
  const api = useAdminApi();
  const [rows, setRows] = useState<Pay[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [state, setState] = useState("");
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [modal, setModal] = useState<{ kind: "refund" | "note"; p: Pay } | null>(null);
  const [msg, flash, clear] = useFlash();
  const seq = useRef(0);
  const [comm, setComm] = useState({ commissionPercent: "0", flatFeeUsd: "0", label: "" });
  const [commBusy, setCommBusy] = useState(false);

  const page = useCallback(async (reset: boolean, cur: string | null, st: string) => {
    const id = ++seq.current;
    setLoading(true);
    const p = new URLSearchParams({ limit: "50" });
    if (st) p.set("state", st);
    if (cur && !reset) p.set("cursor", cur);
    if (reset) p.set("summary", "1");
    const r = await api(`/api/admin/payments?${p}`);
    if (id !== seq.current) return;
    setLoading(false);
    if (!r.ok) return flash("error", r.error || "Failed to load payments.");
    setRows((prev) => (reset ? r.data.items : [...prev, ...r.data.items]));
    setCursor(r.data.nextCursor);
    if (r.data.summary) { setSummary(r.data.summary); setComm({ commissionPercent: String(r.data.summary.commission.commissionPercent), flatFeeUsd: String(r.data.summary.commission.flatFeeUsd), label: r.data.summary.commission.label }); }
  }, [api, flash]);

  useEffect(() => { page(true, null, state); }, [state, page]);

  async function act(id: string, body: Record<string, unknown>, ok: string) {
    const r = await api(`/api/admin/payments/${encodeURIComponent(id)}`, { method: "POST", body });
    if (!r.ok) { flash("error", r.error || "Action failed."); return false; }
    flash("success", ok); setModal(null); page(true, null, state); return true;
  }

  async function saveCommission() {
    setCommBusy(true);
    const r = await api("/api/admin/commerce", { method: "PUT", body: { commissionPercent: Number(comm.commissionPercent), flatFeeUsd: Number(comm.flatFeeUsd), label: comm.label } });
    setCommBusy(false);
    if (!r.ok) return flash("error", r.error || "Save failed.");
    flash("success", "Commission saved."); page(true, null, state);
  }

  async function backfill() {
    const r = await api("/api/admin/payments", { method: "POST", body: { action: "backfill" } });
    if (!r.ok) return flash("error", r.error || "Backfill failed.");
    flash("success", `Upgraded ${r.data.updated} older records.`); page(true, null, state);
  }

  return (
    <div className="space-y-5">
      {msg && <Notice kind={msg.kind} onClose={clear}>{msg.text}</Notice>}

      {summary && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <Stat label={`Gross (${summary.days}d)`} value={usd(summary.grossUsd)} sub={`${summary.paidCount} paid`} />
            <Stat label="Refunded" value={usd(summary.refundedUsd)} sub={`${summary.refundedCount} refunds`} />
            <Stat label={summary.commission.label} value={usd(summary.commissionUsd)} sub={`${summary.commission.commissionPercent}% + $${summary.commission.flatFeeUsd}`} />
            <Stat label="Net" value={usd(summary.netUsd)} />
            <Stat label="Failed / expired" value={summary.failedCount} />
          </div>
          {summary.truncated && <p className="text-[11px] text-amber-500">Showing the most recent {summary.scanned.toLocaleString()} records in the window — figures are a lower bound.</p>}
        </>
      )}

      <Card title="Commission / fees" right={<Badge>applied to the summary above</Badge>}>
        <div className="grid sm:grid-cols-4 gap-2 items-end">
          <label className="text-[11px] text-text-secondary">Label<input className={`${inputCls} mt-1`} value={comm.label} onChange={(e) => setComm({ ...comm, label: e.target.value })} maxLength={60} /></label>
          <label className="text-[11px] text-text-secondary">Commission %<input className={`${inputCls} mt-1`} inputMode="decimal" value={comm.commissionPercent} onChange={(e) => setComm({ ...comm, commissionPercent: e.target.value })} /></label>
          <label className="text-[11px] text-text-secondary">Flat fee per payment ($)<input className={`${inputCls} mt-1`} inputMode="decimal" value={comm.flatFeeUsd} onChange={(e) => setComm({ ...comm, flatFeeUsd: e.target.value })} /></label>
          <button className={btnPrimary} onClick={saveCommission} disabled={commBusy}>{commBusy ? <Spinner /> : null} Save</button>
        </div>
      </Card>

      <div className="flex flex-wrap items-center gap-1.5">
        {TABS.map(([v, label]) => <button key={v} onClick={() => setState(v)} className={`${btn} ${state === v ? "!border-primary !text-primary" : ""}`}>{label}</button>)}
        <span className="flex-1" />
        <button className={btn} onClick={() => page(true, null, state)}><RefreshCw size={12} /> Refresh</button>
        <button className={btn} onClick={backfill} title="One-time: makes records from before this panel appear in the list">Upgrade older records</button>
      </div>

      <TableWrap>
        <table className="w-full text-xs">
          <thead><tr className="border-b border-border"><th className={th}>When</th><th className={th}>Status</th><th className={th}>Plan</th><th className={th}>Amount</th><th className={th}>Account</th><th className={th}>Details</th><th className={th}></th></tr></thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id} className={`border-b border-border last:border-0 align-top ${p.dismissed ? "opacity-50" : ""}`}>
                <td className={td}>{fmtDate(p.updatedAt)}</td>
                <td className={td}><Badge tone={tone(p.state)}>{p.state}</Badge>{p.manualCredit && <p className="text-[10px] text-text-secondary mt-0.5">credited by {p.manualCredit.by}</p>}</td>
                <td className={td}>{p.plan}</td>
                <td className={td}>{usd(p.amountUsd)}{p.refund && <p className="text-[10px] text-text-secondary">refunded {usd(p.refund.amountUsd)}</p>}</td>
                <td className={`${td} font-mono text-[10px]`}>{p.uid ? `${p.uid.slice(0, 10)}…` : "—"}</td>
                <td className={td}>
                  <p className="font-mono text-[10px] text-text-secondary">{p.id}</p>
                  {p.refund?.reason && <p className="text-[11px]">“{p.refund.reason}”{p.refund.revokedAccess ? " · access revoked" : ""}</p>}
                  {p.note && <p className="text-[11px] text-text-secondary">{p.note}</p>}
                </td>
                <td className={td}>
                  <div className="flex flex-wrap gap-1">
                    {p.credited && !p.refund && <button className={btn} onClick={() => setModal({ kind: "refund", p })}><Undo2 size={12} /> Refund</button>}
                    {p.refund && !p.refund.revokedAccess && p.uid && <button className={btn} onClick={() => confirm("Take back the 30 days of access this payment bought?") && act(p.id, { action: "revoke-access" }, "Access revoked.")}>Revoke access</button>}
                    {!p.credited && !p.refund && p.uid && (p.plan === "standard" || p.plan === "pro") && <button className={btn} onClick={() => confirm(`Grant 30 days of ${p.plan} to this account?`) && act(p.id, { action: "credit" }, "Payment credited.")}><BadgeCheck size={12} /> Credit</button>}
                    <button className={btn} onClick={() => setModal({ kind: "note", p })}><StickyNote size={12} /> Note</button>
                  </div>
                </td>
              </tr>
            ))}
            {!rows.length && !loading && <tr><td className={`${td} text-center text-text-secondary py-8`} colSpan={7}>No transactions here.</td></tr>}
          </tbody>
        </table>
      </TableWrap>
      <div className="flex justify-center">{loading ? <Spinner /> : cursor ? <button className={btn} onClick={() => page(false, cursor, state)}>Load more</button> : null}</div>

      {modal?.kind === "refund" && <RefundModal p={modal.p} onClose={() => setModal(null)} onSubmit={(body) => act(modal.p.id, { action: "refund", ...body }, "Refund recorded.")} />}
      {modal?.kind === "note" && <NoteModal p={modal.p} onClose={() => setModal(null)} onSubmit={(body) => act(modal.p.id, { action: "note", ...body }, "Saved.")} />}
    </div>
  );
}

function RefundModal({ p, onClose, onSubmit }: { p: Pay; onClose: () => void; onSubmit: (b: Record<string, unknown>) => Promise<boolean> }) {
  const [amount, setAmount] = useState(String(p.amountUsd)); const [reason, setReason] = useState(""); const [revoke, setRevoke] = useState(true); const [busy, setBusy] = useState(false);
  return (
    <Modal title="Refund payment" onClose={onClose}>
      <div className="space-y-3 text-sm">
        <Notice kind="info">This records the refund and (optionally) removes the access. <strong>Send the money back from your NOWPayments dashboard</strong> — crypto refunds can&apos;t be issued from here.</Notice>
        <label className="text-[11px] text-text-secondary block">Amount (USD, max {usd(p.amountUsd)})<input className={`${inputCls} mt-1`} inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} /></label>
        <label className="text-[11px] text-text-secondary block">Reason<input className={`${inputCls} mt-1`} maxLength={300} value={reason} onChange={(e) => setReason(e.target.value)} /></label>
        <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={revoke} onChange={(e) => setRevoke(e.target.checked)} /> Also take back the 30 days of access this payment bought</label>
        <div className="flex justify-end gap-2"><button className={btn} onClick={onClose}>Cancel</button>
          <button className={btnDanger} disabled={busy} onClick={async () => { setBusy(true); await onSubmit({ amountUsd: Number(amount), reason, revokeAccess: revoke }); setBusy(false); }}>{busy ? <Spinner /> : null} Record refund</button></div>
      </div>
    </Modal>
  );
}

function NoteModal({ p, onClose, onSubmit }: { p: Pay; onClose: () => void; onSubmit: (b: Record<string, unknown>) => Promise<boolean> }) {
  const [note, setNote] = useState(p.note || ""); const [dismissed, setDismissed] = useState(p.dismissed); const [busy, setBusy] = useState(false);
  return (
    <Modal title="Note on payment" onClose={onClose}>
      <div className="space-y-3 text-sm">
        <textarea className={`${inputCls} min-h-[90px]`} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Internal note (e.g. customer emailed, resolved)" />
        <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={dismissed} onChange={(e) => setDismissed(e.target.checked)} /> Mark as handled (greys it out)</label>
        <div className="flex justify-end gap-2"><button className={btn} onClick={onClose}>Cancel</button><button className={btnPrimary} disabled={busy} onClick={async () => { setBusy(true); await onSubmit({ note, dismissed }); setBusy(false); }}>Save</button></div>
      </div>
    </Modal>
  );
}

export default function AdminPaymentsPage() {
  return (
    <AdminShell title="Payments & transactions" subtitle="Manage payments, refunds and failed transactions, and track commission. Handles any volume.">
      <PaymentsBody />
    </AdminShell>
  );
}
