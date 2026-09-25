"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Loader2, Eye, AlertTriangle } from "lucide-react";

/** Best-effort normalization only — this is a display iframe, not a
 * security boundary, and the real URL validation happens server-side
 * on the actual audit request. Returns null rather than guessing if
 * the result doesn't parse as an http(s) URL at all. */
function toIframeSrc(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const u = new URL(withProtocol);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    return u.toString();
  } catch {
    return null;
  }
}

// How long to wait for the iframe's load event before assuming this
// particular site won't render here (most commonly: it sends
// X-Frame-Options/CSP frame-ancestors that block being embedded at
// all — a real, common, and entirely legitimate security choice many
// sites make, not something Audityxe can or should override). There's
// no reliable way to detect *that specific* failure from JS — a
// blocked frame doesn't reject or throw, it just never paints — so a
// timeout is the only honest signal available.
const LOAD_GRACE_MS = 6000;

export default function LiveScanPreview({ url }: { url: string }) {
  const src = toIframeSrc(url);
  const [loaded, setLoaded] = useState(false);
  const [assumedBlocked, setAssumedBlocked] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setLoaded(false);
    setAssumedBlocked(false);
    if (!src) return;
    timerRef.current = setTimeout(() => setAssumedBlocked(true), LOAD_GRACE_MS);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [src]);

  if (!src) return null;

  return (
    <div className="relative w-full aspect-video sm:aspect-[16/8] rounded-card overflow-hidden border border-border bg-surface2">
      {/* View-only: pointer-events-none means this is purely a visual
          "here's your real site, actually loading" proof — nothing in
          it is clickable, scrollable, or focusable. The audit itself
          never reads anything back out of this iframe (cross-origin
          content isn't accessible to our JS anyway); it's shown for
          the same reason it was asked for, trust through visibility,
          not as a data source. */}
      <iframe
        key={src}
        src={src}
        title="Live preview of the site being audited (view only)"
        tabIndex={-1}
        aria-hidden="true"
        // allow-scripts only, deliberately WITHOUT allow-same-origin:
        // that combination together is the well-known sandbox-escape
        // pattern (a framed page can strip its own sandbox if it's
        // actually same-origin with the parent) — which would matter
        // here specifically if someone audits audityxe.vercel.app
        // itself. Leaving allow-same-origin off closes that off
        // entirely, for every target, at the cost of some SPA-heavy
        // sites rendering slightly less completely in this purely
        // visual preview (the real audit's own fetch is unaffected —
        // this sandboxing only applies to this decorative iframe).
        sandbox="allow-scripts"
        className="absolute inset-0 w-full h-full pointer-events-none border-0"
        style={{ colorScheme: "normal" }}
        onLoad={() => {
          setLoaded(true);
          if (timerRef.current) clearTimeout(timerRef.current);
        }}
      />

      {!loaded && !assumedBlocked && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-surface2/90 backdrop-blur-sm">
          <Loader2 size={22} className="animate-spin text-primary" />
          <p className="text-xs text-text-secondary">Loading {new URL(src).hostname} live…</p>
        </div>
      )}

      {assumedBlocked && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-surface2/95 backdrop-blur-sm px-6 text-center">
          <AlertTriangle size={20} className="text-amber" />
          <p className="text-xs text-text-secondary max-w-xs">
            A live visual preview isn't available for this site — it likely blocks being embedded
            (common, and unrelated to the audit itself). The audit is still running normally in the
            background.
          </p>
        </div>
      )}

      <div className="absolute top-2 left-2 flex items-center gap-1.5 px-2 py-1 rounded-full bg-black/60 backdrop-blur-sm text-[10px] font-mono text-white/90">
        <Eye size={11} />
        Live preview · view only
      </div>

      {loaded && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute bottom-2 right-2 flex items-center gap-1.5 px-2 py-1 rounded-full bg-emerald/90 text-[10px] font-mono text-white"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
          Loaded
        </motion.div>
      )}
    </div>
  );
}
