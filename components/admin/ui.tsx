"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AlertCircle, CheckCircle2, Loader2, X } from "lucide-react";

export const inputCls =
  "w-full rounded-card bg-[rgb(var(--color-text-primary)/0.045)] border border-border px-3 py-2 text-sm focus:outline-none focus:border-primary/50 disabled:opacity-50";
export const btn = "inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-btn text-xs font-semibold border border-border hover:border-primary hover:text-primary transition disabled:opacity-50 disabled:cursor-not-allowed";
export const btnPrimary = "inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-btn text-sm font-semibold bg-primary text-white hover:brightness-110 transition disabled:opacity-50 disabled:cursor-not-allowed";
export const btnDanger = "inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-btn text-xs font-semibold border border-rose/40 text-rose hover:bg-rose/10 transition disabled:opacity-50";

export function Spinner({ className = "" }: { className?: string }) {
  return <Loader2 size={16} className={`animate-spin text-text-secondary ${className}`} />;
}

export function Badge({ tone = "neutral", children }: { tone?: "neutral" | "good" | "warn" | "bad" | "info"; children: React.ReactNode }) {
  const t = { neutral: "bg-[rgb(var(--color-text-primary)/0.07)] text-text-secondary", good: "bg-emerald/15 text-emerald", warn: "bg-amber-400/15 text-amber-500", bad: "bg-rose/15 text-rose", info: "bg-primary/10 text-primary" }[tone];
  return <span className={`inline-block text-[10px] font-mono px-2 py-0.5 rounded-full whitespace-nowrap ${t}`}>{children}</span>;
}

export function Card({ title, right, children, className = "" }: { title?: string; right?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={`glass rounded-card p-4 sm:p-5 ${className}`}>
      {(title || right) && (
        <div className="flex items-center justify-between gap-3 mb-3">
          {title && <h2 className="font-display font-semibold text-sm">{title}</h2>}
          {right}
        </div>
      )}
      {children}
    </section>
  );
}

export function Stat({ label, value, sub }: { label: string; value: React.ReactNode; sub?: string }) {
  return (
    <div className="glass rounded-card p-3">
      <p className="text-[11px] text-text-secondary">{label}</p>
      <p className="text-xl font-display font-bold">{value}</p>
      {sub && <p className="text-[10px] text-text-secondary mt-0.5">{sub}</p>}
    </div>
  );
}

/** Scrolls sideways on narrow screens instead of breaking the layout. */
export function TableWrap({ children }: { children: React.ReactNode }) {
  return <div className="overflow-x-auto rounded-card border border-border">{children}</div>;
}
export const th = "text-left text-[11px] font-mono text-text-secondary px-3 py-2 whitespace-nowrap";
export const td = "px-3 py-2 align-middle";

export function Notice({ kind, children, onClose }: { kind: "error" | "success" | "info"; children: React.ReactNode; onClose?: () => void }) {
  const tone = kind === "error" ? "text-rose bg-rose/10 border-rose/30" : kind === "success" ? "text-emerald bg-emerald/10 border-emerald/30" : "text-text-secondary bg-[rgb(var(--color-text-primary)/0.05)] border-border";
  const Icon = kind === "error" ? AlertCircle : CheckCircle2;
  return (
    <div role={kind === "error" ? "alert" : "status"} className={`flex items-start gap-2 text-xs border rounded-card px-3 py-2 ${tone}`}>
      <Icon size={14} className="mt-0.5 shrink-0" />
      <span className="flex-1">{children}</span>
      {onClose && (
        <button onClick={onClose} aria-label="Dismiss" className="opacity-70 hover:opacity-100">
          <X size={13} />
        </button>
      )}
    </div>
  );
}

/** Auto-dismissing feedback line: `const [msg, flash, clear] = useFlash()`.
 * `flash` and `clear` keep a STABLE identity across renders — they are used as
 * dependencies of data-loading callbacks, and an unstable one would re-run
 * every load effect on every render (an infinite fetch loop). */
export function useFlash(ms = 4000): [{ kind: "error" | "success"; text: string } | null, (kind: "error" | "success", text: string) => void, () => void] {
  const [msg, setMsg] = useState<{ kind: "error" | "success"; text: string } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  const clear = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    setMsg(null);
  }, []);
  const flash = useCallback(
    (kind: "error" | "success", text: string) => {
      setMsg({ kind, text });
      if (timer.current) clearTimeout(timer.current);
      if (kind === "success") timer.current = setTimeout(() => setMsg(null), ms);
    },
    [ms]
  );
  return [msg, flash, clear];
}

export function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-label={title} className={`glass w-full ${wide ? "sm:max-w-2xl" : "sm:max-w-md"} max-h-[90vh] overflow-y-auto rounded-t-card sm:rounded-card p-5`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display font-semibold">{title}</h3>
          <button onClick={onClose} aria-label="Close" className="text-text-secondary hover:text-text-primary">
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export const fmtDate = (iso: string | null | undefined) => (iso ? new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "—");
export const fmtDay = (iso: string | null | undefined) => (iso ? new Date(iso).toLocaleDateString(undefined, { dateStyle: "medium" }) : "—");
export const usd = (n: number) => `${n < 0 ? "-" : ""}$${Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 })}`;
