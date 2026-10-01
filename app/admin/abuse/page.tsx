"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, Search, ShieldAlert, ShieldCheck, Ban, Undo2 } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PasswordInput from "@/components/PasswordInput";
import { useAuth } from "@/context/AuthContext";
import { fetchJson } from "@/lib/fetch-json";

interface BanDoc { kind: string; key: string; reason: string; until: string | null; auto: boolean; source: string; offense: number; createdAt: string }
interface EventDoc { id: string; type: string; severity: string; at: string; uid?: string | null; deviceId?: string | null; ipMasked?: string | null; score?: number | null; details?: string | null }
interface Overview { mode: string; bans: BanDoc[]; events: EventDoc[]; stats24h: Record<string, number> }
interface GNode { id: string; type: "uid" | "device" | "ip" | "fp"; label: string; sub?: string; seed?: boolean; banned?: boolean; admin?: boolean; risk?: string }
interface GraphRes { seed: { kind: string; key: string } | null; nodes: GNode[]; edges: { from: string; to: string }[]; risk: { score: number; level: string; reasons: { code: string; points: number; detail?: string }[] } | null; strikePoints: number; bans: BanDoc[]; truncated: boolean }

const COLORS: Record<string, string> = { uid: "#38bdf8", device: "#a78bfa", ip: "#f59e0b", fp: "#94a3b8" };

function GraphView({ g }: { g: GraphRes }) {
  const W = 640, H = 420, cx = W / 2, cy = H / 2;
  const seed = g.nodes.find((n) => n.seed);
  const rest = g.nodes.filter((n) => !n.seed);
  const pos = new Map<string, { x: number; y: number }>();
  if (seed) pos.set(seed.id, { x: cx, y: cy });
  const adj = new Set(g.edges.filter((e) => seed && (e.from === seed.id || e.to === seed.id)).flatMap((e) => [e.from, e.to]));
  const ring1 = rest.filter((n) => adj.has(n.id));
  const ring2 = rest.filter((n) => !adj.has(n.id));
  ring1.forEach((n, i) => pos.set(n.id, { x: cx + 120 * Math.cos((2 * Math.PI * i) / Math.max(ring1.length, 1)), y: cy + 120 * Math.sin((2 * Math.PI * i) / Math.max(ring1.length, 1)) }));
  ring2.forEach((n, i) => pos.set(n.id, { x: cx + 190 * Math.cos((2 * Math.PI * i) / Math.max(ring2.length, 1) + 0.3), y: cy + 175 * Math.sin((2 * Math.PI * i) / Math.max(ring2.length, 1) + 0.3) }));
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full rounded-card border border-border bg-[rgb(var(--color-text-primary)/0.03)]">
      {g.edges.map((e, i) => {
        const a = pos.get(e.from), b = pos.get(e.to);
        return a && b ? <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="currentColor" strokeOpacity={0.2} /> : null;
      })}
      {g.nodes.map((n) => {
        const p = pos.get(n.id);
        if (!p) return null;
        return (
          <g key={n.id}>
            <circle cx={p.x} cy={p.y} r={n.seed ? 12 : 8} fill={COLORS[n.type]} stroke={n.banned ? "#f43f5e" : n.admin ? "#10b981" : "none"} strokeWidth={3} />
            <text x={p.x} y={p.y + 22} textAnchor="middle" fontSize="9" fill="currentColor" opacity={0.75}>{n.label.slice(0, 22)}</text>
          </g>
        );
      })}
    </svg>
  );
}

export default function AdminAbusePage() {
  const { user, loading, getToken } = useAuth();
  const router = useRouter();
  const [denyReason, setDenyReason] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [pwInput, setPwInput] = useState("");
  const [pw, setPw] = useState("");
  const [pwError, setPwError] = useState("");
  const [busy, setBusy] = useState(false);
  const [ov, setOv] = useState<Overview | null>(null);
  const [q, setQ] = useState("");
  const [graph, setGraph] = useState<GraphRes | null>(null);
  const [kind, setKind] = useState("uid");
  const [target, setTarget] = useState("");
  const [hours, setHours] = useState("24");
  const [reason, setReason] = useState("");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (!loading && !user) router.replace("/login?redirect=/admin/abuse");
  }, [loading, user, router]);

  const call = useCallback(
    async (url: string, init?: RequestInit, password = pw) => {
      const token = await getToken();
      return fetchJson<any>(url, {
        ...init,
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), "x-admin-password": password },
      });
    },
    [getToken, pw]
  );

  const loadOverview = useCallback(
    async (password = pw) => {
      const r = await call("/api/admin/abuse", undefined, password);
      if (r.status === 403) {
        if (r.data?.code === "NOT_ADMIN") setDenyReason(`Signed in as ${user?.email || "unknown"} — this address isn't in ADMIN_EMAILS.`);
        else setPwError(r.error || "Incorrect admin password.");
        return false;
      }
      if (r.status === 429) { setPwError(r.error || "Too many attempts."); return false; }
      if (!r.ok) { setMsg(r.error || "Failed to load."); return false; }
      setOv(r.data);
      setIsAdmin(true);
      return true;
    },
    [call, pw, user?.email]
  );

  async function submitPassword() {
    if (!pwInput.trim() || busy) return;
    setBusy(true);
    setPwError("");
    setPw(pwInput);
    await loadOverview(pwInput);
    setBusy(false);
  }

  async function investigate(query = q) {
    if (!query.trim()) return;
    setBusy(true);
    const r = await call(`/api/admin/abuse?view=graph&q=${encodeURIComponent(query.trim())}`);
    setBusy(false);
    if (!r.ok) { setMsg(r.error || "Lookup failed."); return; }
    setGraph(r.data);
    setMsg(r.data.seed ? "" : "Nothing found for that query.");
  }

  async function act(action: "ban" | "unban" | "clear-strikes", k: string, t: string, extra?: Record<string, unknown>) {
    setBusy(true);
    setMsg("");
    const r = await call("/api/admin/abuse", { method: "POST", body: JSON.stringify({ action, kind: k, target: t, ...extra }) });
    setBusy(false);
    if (!r.ok) { setMsg(r.error || "Action failed."); return; }
    setMsg(`${action} ok`);
    loadOverview();
    if (graph?.seed) investigate(q || graph.seed.key);
  }

  if (loading || !user) return <main className="min-h-screen flex items-center justify-center"><Loader2 size={22} className="animate-spin text-text-secondary" /></main>;
  if (denyReason) return <main className="min-h-screen flex items-center justify-center px-4"><div className="glass rounded-card p-6 max-w-sm text-center"><p className="text-sm font-semibold mb-2 text-rose">Admin access denied</p><p className="text-xs text-text-secondary">{denyReason}</p></div></main>;

  if (!isAdmin) {
    return (
      <>
        <Header />
        <main className="min-h-screen flex items-center justify-center px-4">
          <div className="glass rounded-card p-6 w-full max-w-sm">
            <span className="text-sm font-semibold mb-3 block">Admin password required</span>
            <PasswordInput value={pwInput} onChange={(e) => setPwInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submitPassword()} placeholder="Password" autoFocus className="w-full rounded-card bg-[rgb(var(--color-text-primary)/0.045)] border border-border px-3 py-2 text-sm mb-3 focus:outline-none focus:border-primary/50" disabled={busy} />
            {pwError && <p className="text-xs text-rose mb-3">{pwError}</p>}
            <button onClick={submitPassword} disabled={busy || !pwInput.trim()} className="w-full py-2 rounded-card bg-primary text-white text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2">
              {busy ? <Loader2 size={14} className="animate-spin" /> : "Continue"}
            </button>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  const s = ov?.stats24h || {};
  return (
    <>
      <Header />
      <main className="min-h-screen pt-28 pb-20 px-4 max-w-4xl mx-auto">
        <Link href="/account" className="inline-flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary mb-6"><ArrowLeft size={16} /> Back to account</Link>
        <h1 className="font-display font-bold text-2xl mb-1 flex items-center gap-2"><ShieldAlert size={20} className="text-primary" /> Abuse Protection</h1>
        <p className="text-sm text-text-secondary mb-2">Mode: <span className="font-mono">{ov?.mode}</span> — admin accounts and any device/network an admin has used are never banned or limited.</p>
        {msg && <p className="text-xs text-primary mb-3">{msg}</p>}

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8">
          {[["Events (24h)", s.events], ["Auto-bans (24h)", s.autoBans], ["Blocked (24h)", s.blocked], ["Rate-limited (24h)", s.rateLimited], ["Critical (24h)", s.critical], ["Trial denied (24h)", s.trialDenied]].map(([k, v]) => (
            <div key={String(k)} className="glass rounded-card p-3"><p className="text-xs text-text-secondary">{k}</p><p className="text-xl font-display font-bold">{v ?? 0}</p></div>
          ))}
        </div>

        <h2 className="font-semibold text-sm mb-2">Investigate (email, UID, device id, IP)</h2>
        <div className="flex gap-2 mb-4">
          <input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && investigate()} placeholder="user@example.com · uid · device id · 203.0.113.7" className="flex-1 rounded-card bg-[rgb(var(--color-text-primary)/0.045)] border border-border px-3 py-2 text-sm focus:outline-none focus:border-primary/50" />
          <button onClick={() => investigate()} className="px-4 py-2 rounded-card glass flex items-center gap-2 text-sm"><Search size={14} /> Graph</button>
        </div>

        {graph && graph.seed && (
          <div className="mb-8 space-y-3">
            <GraphView g={graph} />
            <p className="text-[11px] text-text-secondary">Blue = account · purple = device · amber = network. Red ring = banned/suspended, green ring = admin-protected.{graph.truncated ? " (truncated)" : ""}</p>
            {graph.risk && (
              <div className="glass rounded-card p-3 text-xs">
                <p className="font-semibold mb-1">Risk {graph.risk.score}/100 ({graph.risk.level}) · strike points {graph.strikePoints}</p>
                {graph.risk.reasons.map((r) => <p key={r.code} className="text-text-secondary">+{r.points} {r.code}{r.detail ? ` — ${r.detail}` : ""}</p>)}
              </div>
            )}
            <div className="glass rounded-card p-3 space-y-2">
              {graph.nodes.map((n) => (
                <div key={n.id} className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="min-w-0"><span className="font-mono" style={{ color: COLORS[n.type] }}>{n.type}</span> {n.label}{n.sub ? <span className="text-text-secondary"> · {n.sub}</span> : null}
                    {n.banned && <span className="ml-2 text-rose">banned</span>}{n.admin && <span className="ml-2 text-emerald">admin</span>}{n.risk && n.risk !== "low" && <span className="ml-2 text-amber-400">{n.risk}</span>}</div>
                  {!n.admin && (
                    <div className="flex gap-1.5">
                      <button disabled={busy} onClick={() => act("ban", n.type, n.id.slice(n.id.indexOf(":") + 1), { hours: 24, reason: "Banned from graph review" })} className="px-2 py-1 rounded glass hover:text-rose flex items-center gap-1"><Ban size={11} /> 24h</button>
                      <button disabled={busy} onClick={() => act("unban", n.type, n.id.slice(n.id.indexOf(":") + 1))} className="px-2 py-1 rounded glass hover:text-emerald flex items-center gap-1"><Undo2 size={11} /> Unban</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <h2 className="font-semibold text-sm mb-2">Manual ban</h2>
        <div className="glass rounded-card p-3 mb-8 flex flex-wrap gap-2 text-sm">
          <select value={kind} onChange={(e) => setKind(e.target.value)} className="rounded-card bg-transparent border border-border px-2 py-1.5"><option value="uid">Account</option><option value="device">Device</option><option value="ip">IP</option><option value="fp">Fingerprint</option></select>
          <input value={target} onChange={(e) => setTarget(e.target.value)} placeholder="email / uid / device id / IP" className="flex-1 min-w-[180px] rounded-card bg-transparent border border-border px-2 py-1.5" />
          <select value={hours} onChange={(e) => setHours(e.target.value)} className="rounded-card bg-transparent border border-border px-2 py-1.5"><option value="1">1h</option><option value="24">24h</option><option value="168">7d</option><option value="720">30d</option><option value="permanent">Permanent</option></select>
          <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason" className="flex-1 min-w-[140px] rounded-card bg-transparent border border-border px-2 py-1.5" />
          <button disabled={busy || !target.trim()} onClick={() => act("ban", kind, target, { hours: hours === "permanent" ? null : Number(hours), reason })} className="px-3 py-1.5 rounded-card bg-rose/80 text-white font-semibold disabled:opacity-50">Ban</button>
          <button disabled={busy || !target.trim()} onClick={() => act("unban", kind, target)} className="px-3 py-1.5 rounded-card glass disabled:opacity-50">Unban</button>
        </div>

        <h2 className="font-semibold text-sm mb-2 flex items-center gap-2"><Ban size={14} /> Active bans ({ov?.bans.length || 0})</h2>
        <div className="glass rounded-card divide-y divide-border mb-8">
          {ov?.bans.length ? ov.bans.map((b) => (
            <div key={`${b.kind}_${b.key}`} className="p-3 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="min-w-0"><span className="font-mono">{b.kind}</span> <span className="font-mono text-text-secondary">{b.key.slice(0, 18)}</span> · {b.auto ? "auto" : "manual"} #{b.offense} · {b.until ? `until ${new Date(b.until).toLocaleString()}` : "permanent"}<p className="text-text-secondary truncate">{b.reason}</p></div>
              <button disabled={busy} onClick={() => act("unban", b.kind, b.key)} className="px-2 py-1 rounded glass hover:text-emerald flex items-center gap-1"><Undo2 size={11} /> Unban</button>
            </div>
          )) : <p className="p-3 text-xs text-text-secondary">No active bans.</p>}
        </div>

        <h2 className="font-semibold text-sm mb-2 flex items-center gap-2"><ShieldCheck size={14} /> Recent events</h2>
        <div className="glass rounded-card divide-y divide-border">
          {ov?.events.length ? ov.events.map((e) => (
            <div key={e.id} className="p-3 text-xs">
              <span className={e.severity === "critical" ? "text-rose" : e.severity === "high" ? "text-amber-400" : "text-text-secondary"}>{e.severity}</span>{" "}
              <span className="font-mono">{e.type}</span> <span className="text-text-secondary">{new Date(e.at).toLocaleString()} {e.ipMasked || ""} {e.uid ? `· ${e.uid.slice(0, 8)}…` : ""} {e.score != null ? `· score ${e.score}` : ""}</span>
              {e.details && <p className="text-text-secondary truncate">{e.details}</p>}
            </div>
          )) : <p className="p-3 text-xs text-text-secondary">No events yet.</p>}
        </div>
      </main>
      <Footer />
    </>
  );
}
