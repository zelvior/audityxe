"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Plus, Search, Trash2, X, Eye, EyeOff, Star } from "lucide-react";
import AdminShell, { useAdminApi } from "@/components/admin/AdminShell";
import { Badge, Card, Notice, Spinner, TableWrap, btn, btnDanger, btnPrimary, fmtDay, inputCls, td, th, useFlash } from "@/components/admin/ui";

interface Prices { standard: number; pro: number; overridden: { standard: boolean; pro: boolean }; defaults: { standard: number; pro: number } }
interface Content { blocks: Record<string, string>; categories: string[] }
interface BlockDef { label: string; help: string; max: number }
interface Listing { host: string; submittedAt: string | null; hidden: boolean; featured: boolean; category: string | null; note: string | null }

function PricesCard() {
  const api = useAdminApi(); const [msg, flash, clear] = useFlash();
  const [prices, setPrices] = useState<Prices | null>(null); const [draft, setDraft] = useState({ standard: "", pro: "" }); const [busy, setBusy] = useState(false);
  const load = useCallback(async () => { const r = await api("/api/admin/content"); if (r.ok) { setPrices(r.data.prices); setDraft({ standard: String(r.data.prices.standard), pro: String(r.data.prices.pro) }); } else flash("error", r.error || "Failed to load."); }, [api, flash]);
  useEffect(() => { load(); }, [load]);
  async function save(plan: "standard" | "pro", value: number | null) {
    setBusy(true); const r = await api("/api/admin/content", { method: "PUT", body: { prices: { [plan]: value } } }); setBusy(false);
    if (!r.ok) return flash("error", r.error || "Save failed."); flash("success", value === null ? "Reset to default." : "Price updated — checkout and the pricing page use it now."); load();
  }
  if (!prices) return <Card title="Prices"><Spinner /></Card>;
  return (
    <Card title="Prices (USD per 30 days)">
      {msg && <div className="mb-3"><Notice kind={msg.kind} onClose={clear}>{msg.text}</Notice></div>}
      <div className="grid sm:grid-cols-2 gap-4">
        {(["standard", "pro"] as const).map((plan) => (
          <div key={plan}>
            <label className="text-[11px] text-text-secondary capitalize" htmlFor={`price-${plan}`}>{plan} {prices.overridden[plan] && <Badge tone="warn">custom</Badge>}</label>
            <div className="flex gap-2 mt-1">
              <input id={`price-${plan}`} className={inputCls} inputMode="decimal" value={draft[plan]} onChange={(e) => setDraft({ ...draft, [plan]: e.target.value })} />
              <button className={btnPrimary} disabled={busy || Number(draft[plan]) === prices[plan]} onClick={() => save(plan, Number(draft[plan]))}>Save</button>
              <button className={btn} disabled={busy || !prices.overridden[plan]} onClick={() => save(plan, null)}>Reset</button>
            </div>
            <p className="text-[10px] text-text-secondary mt-1">default ${prices.defaults[plan]}</p>
          </div>
        ))}
      </div>
      <p className="text-[11px] text-text-secondary mt-3">One-time crypto invoices use the new price immediately. Recurring subscription plans keep the price they were created with at NOWPayments — create a new plan there if you change a recurring price.</p>
    </Card>
  );
}

function TextCard() {
  const api = useAdminApi(); const [msg, flash, clear] = useFlash();
  const [content, setContent] = useState<Content | null>(null); const [defs, setDefs] = useState<Record<string, BlockDef>>({}); const [draft, setDraft] = useState<Record<string, string>>({}); const [cats, setCats] = useState<string[]>([]); const [newCat, setNewCat] = useState(""); const [busy, setBusy] = useState(false);
  const load = useCallback(async () => { const r = await api("/api/admin/content"); if (!r.ok) return flash("error", r.error || "Failed to load."); setContent(r.data.content); setDefs(r.data.blockDefs); setDraft(r.data.content.blocks); setCats(r.data.content.categories); }, [api, flash]);
  useEffect(() => { load(); }, [load]);
  async function save(body: Record<string, unknown>, ok: string) { setBusy(true); const r = await api("/api/admin/content", { method: "PUT", body }); setBusy(false); if (!r.ok) return flash("error", r.error || "Save failed."); flash("success", ok); load(); }
  if (!content) return <Card title="Site text & categories"><Spinner /></Card>;
  const dirtyBlocks = Object.keys(defs).filter((k) => (draft[k] || "") !== (content.blocks[k] || ""));
  return (
    <div className="space-y-5">
      <Card title="Site text">
        {msg && <div className="mb-3"><Notice kind={msg.kind} onClose={clear}>{msg.text}</Notice></div>}
        <div className="space-y-4">
          {Object.entries(defs).map(([key, def]) => (
            <div key={key}>
              <label className="text-xs font-semibold" htmlFor={`blk-${key}`}>{def.label}</label>
              <p className="text-[11px] text-text-secondary mb-1">{def.help} Plain text only — leave empty to hide.</p>
              <textarea id={`blk-${key}`} className={`${inputCls} min-h-[64px]`} maxLength={def.max} value={draft[key] || ""} onChange={(e) => setDraft({ ...draft, [key]: e.target.value })} />
              <p className="text-[10px] text-text-secondary text-right">{(draft[key] || "").length}/{def.max}</p>
            </div>
          ))}
        </div>
        <button className={`${btnPrimary} mt-3`} disabled={busy || !dirtyBlocks.length} onClick={() => save({ blocks: Object.fromEntries(dirtyBlocks.map((k) => [k, draft[k] || ""])) }, "Text updated.")}>Save text</button>
      </Card>
      <Card title="Categories" right={<span className="text-[11px] text-text-secondary">used to organise showcase listings</span>}>
        <div className="flex flex-wrap gap-1.5 mb-3">
          {cats.map((c) => <span key={c} className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full border border-border">{c}<button aria-label={`Remove ${c}`} onClick={() => setCats(cats.filter((x) => x !== c))}><X size={11} /></button></span>)}
          {!cats.length && <span className="text-xs text-text-secondary">No categories yet.</span>}
        </div>
        <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); const v = newCat.trim(); if (v && !cats.includes(v)) setCats([...cats, v]); setNewCat(""); }}>
          <input className={inputCls} placeholder="New category" maxLength={40} value={newCat} onChange={(e) => setNewCat(e.target.value)} aria-label="New category" />
          <button className={btn} type="submit"><Plus size={13} /> Add</button>
          <button className={btnPrimary} type="button" disabled={busy || JSON.stringify(cats) === JSON.stringify(content.categories)} onClick={() => save({ categories: cats }, "Categories saved.")}>Save categories</button>
        </form>
      </Card>
    </div>
  );
}

function ListingsCard() {
  const api = useAdminApi(); const [msg, flash, clear] = useFlash();
  const [rows, setRows] = useState<Listing[]>([]); const [cursor, setCursor] = useState<string | null>(null); const [loading, setLoading] = useState(true);
  const [q, setQ] = useState(""); const [vis, setVis] = useState(""); const [cats, setCats] = useState<string[]>([]); const seq = useRef(0);
  const fetchPage = useCallback(async (reset: boolean, cur: string | null) => {
    const id = ++seq.current; setLoading(true);
    const p = new URLSearchParams({ limit: "50" }); if (q.trim()) p.set("q", q.trim()); if (vis) p.set("visibility", vis); if (cur && !reset) p.set("cursor", cur);
    const r = await api(`/api/admin/listings?${p}`); if (id !== seq.current) return; setLoading(false);
    if (!r.ok) return flash("error", r.error || "Failed to load listings.");
    setRows((prev) => (reset ? r.data.items : [...prev, ...r.data.items])); setCursor(r.data.nextCursor);
  }, [api, q, vis, flash]);
  useEffect(() => {
    fetchPage(true, null);
    // Re-query when a filter changes; typing in the search box waits for Enter.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vis]);
  useEffect(() => { api("/api/admin/content").then((r) => r.ok && setCats(r.data.content.categories)); }, [api]);
  async function act(host: string, body: Record<string, unknown>) {
    const r = await api(`/api/admin/listings/${encodeURIComponent(host)}`, { method: "POST", body });
    if (!r.ok) return flash("error", r.error || "Action failed.");
    if (body.action === "delete") setRows((x) => x.filter((l) => l.host !== host));
    else fetchPage(true, null);
  }
  return (
    <Card title="Showcase listings">
      {msg && <div className="mb-3"><Notice kind={msg.kind} onClose={clear}>{msg.text}</Notice></div>}
      <form className="flex flex-wrap gap-2 mb-3" onSubmit={(e) => { e.preventDefault(); fetchPage(true, null); }}>
        <div className="relative flex-1 min-w-[200px]"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" /><input className={`${inputCls} pl-9`} placeholder="Search by domain prefix — Enter" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search listings" /></div>
        <select className={`${inputCls} !w-auto`} value={vis} onChange={(e) => setVis(e.target.value)} aria-label="Filter listings"><option value="">All</option><option value="featured">Featured</option><option value="hidden">Hidden</option></select>
      </form>
      <TableWrap>
        <table className="w-full text-xs">
          <thead><tr className="border-b border-border"><th className={th}>Site</th><th className={th}>Added</th><th className={th}>Category</th><th className={th}>State</th><th className={th}></th></tr></thead>
          <tbody>
            {rows.map((l) => (
              <tr key={l.host} className="border-b border-border last:border-0">
                <td className={td}><a href={`https://${l.host}`} target="_blank" rel="noopener noreferrer" className="font-semibold hover:text-primary">{l.host}</a></td>
                <td className={td}>{fmtDay(l.submittedAt)}</td>
                <td className={td}><select aria-label={`Category for ${l.host}`} className={`${inputCls} !w-auto py-1`} value={l.category || ""} onChange={(e) => act(l.host, { action: "set-category", category: e.target.value || null })}><option value="">—</option>{cats.map((c) => <option key={c} value={c}>{c}</option>)}</select></td>
                <td className={td}><div className="flex gap-1">{l.featured && <Badge tone="warn">featured</Badge>}{l.hidden && <Badge tone="bad">hidden</Badge>}{!l.featured && !l.hidden && <Badge tone="good">live</Badge>}</div></td>
                <td className={td}>
                  <div className="flex gap-1">
                    <button className={btn} title={l.featured ? "Unfeature" : "Feature"} onClick={() => act(l.host, { action: l.featured ? "unfeature" : "feature" })}><Star size={12} /></button>
                    <button className={btn} title={l.hidden ? "Show" : "Hide"} onClick={() => act(l.host, { action: l.hidden ? "unhide" : "hide" })}>{l.hidden ? <Eye size={12} /> : <EyeOff size={12} />}</button>
                    <button className={btnDanger} title="Delete" onClick={() => confirm(`Delete ${l.host} from the showcase?`) && act(l.host, { action: "delete" })}><Trash2 size={12} /></button>
                  </div>
                </td>
              </tr>
            ))}
            {!rows.length && !loading && <tr><td className={`${td} text-center text-text-secondary py-8`} colSpan={5}>No listings.</td></tr>}
          </tbody>
        </table>
      </TableWrap>
      <div className="flex justify-center mt-3">{loading ? <Spinner /> : cursor ? <button className={btn} onClick={() => fetchPage(false, cursor)}>Load more</button> : null}</div>
    </Card>
  );
}

export default function AdminContentPage() {
  return (
    <AdminShell title="Content management" subtitle="Prices, site text, categories and showcase listings. Banners are managed on the Banner page.">
      <div className="space-y-5">
        <Card title="Banners"><p className="text-xs text-text-secondary">The site-wide announcement banner has its own editor. <Link href="/admin/announcement" className="text-primary hover:underline">Open the banner editor →</Link></p></Card>
        <PricesCard />
        <TextCard />
        <ListingsCard />
      </div>
    </AdminShell>
  );
}
