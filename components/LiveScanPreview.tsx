"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Eye, AlertTriangle, Activity } from "lucide-react";

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

export interface LiveScanPreviewProps {
  url: string;
  /** Real, server-reported checkpoints as the audit actually reaches
   * them (lib/analyze.ts's onProgress → the job's progress log) — not a
   * simulated step list. Only present for the background-job flow;
   * the synchronous default audit has no live channel to source this
   * from, so the overlay simply doesn't render without it. */
  progressLog?: string[];
  /** Present only when this scan is running as a background job — lets
   * this component offer the "notify me" push opt-in for exactly the
   * runs long enough that leaving the page is actually worth doing. */
  backgroundJob?: { jobId: string; token: string } | null;
}

export default function LiveScanPreview({ url, progressLog, backgroundJob }: LiveScanPreviewProps) {
  const src = toIframeSrc(url);
  const [loaded, setLoaded] = useState(false);
  const [assumedBlocked, setAssumedBlocked] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const logEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setLoaded(false);
    setAssumedBlocked(false);
    if (!src) return;
    timerRef.current = setTimeout(() => setAssumedBlocked(true), LOAD_GRACE_MS);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [src]);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [progressLog?.length]);

  if (!src) return null;

  return (
    <div className="space-y-2">
      <div className="relative w-full aspect-video sm:aspect-[16/8] rounded-card overflow-hidden border border-border bg-surface2">
        {/* View-only: pointer-events-none means this is purely a visual
            "here's your real site, actually loading" proof — nothing in
            it is clickable, scrollable, or focusable. The audit itself
            never reads anything back out of this iframe (cross-origin
            content isn't accessible to our JS anyway); it's shown for
            the same reason it was asked for, trust through visibility,
            not as a data source. Audityxe controls every pixel of what
            surrounds it (the overlays below) — the framed page itself
            has zero ability to affect anything outside its own box. */}
        <iframe
          key={src}
          src={src}
          title="Live preview of the site being audited (view only)"
          tabIndex={-1}
          aria-hidden="true"
          // allow-scripts only, deliberately WITHOUT allow-same-origin,
          // allow-top-navigation, allow-popups, or allow-forms: that
          // first combination together is the well-known sandbox-escape
          // pattern (a framed page can strip its own sandbox if it's
          // actually same-origin with the parent) — which would matter
          // here specifically if someone audits audityxe.vercel.app
          // itself. The rest are each independently capable of letting
          // the framed page hijack the parent tab, pop up new windows,
          // or submit data somewhere — none of which this decorative
          // preview needs. Leaving all of them off closes every one of
          // those off entirely, for every target, at the cost of some
          // SPA-heavy sites rendering slightly less completely in this
          // purely visual preview (the real audit's own fetch is
          // unaffected — this sandboxing only applies to this
          // decorative iframe).
          sandbox="allow-scripts"
          referrerPolicy="no-referrer"
          loading="eager"
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

        {/* Real, server-reported activity feed — Audityxe-controlled
            overlay showing the actual checks completing server-side as
            they happen, not a canned/simulated list. Positioned over the
            bottom-left of the same iframe so "the actual process" is
            visibly tied to "the site it's happening to". */}
        {progressLog && progressLog.length > 0 && (
          <div className="absolute bottom-2 left-2 right-2 sm:right-auto sm:max-w-[70%] max-h-24 overflow-y-auto rounded-lg bg-black/70 backdrop-blur-sm px-2.5 py-2 text-[10px] font-mono text-white/85 leading-relaxed">
            <div className="flex items-center gap-1.5 text-white/60 mb-1">
              <Activity size={10} className="animate-pulse" />
              Live audit activity
            </div>
            <AnimatePresence initial={false}>
              {progressLog.slice(-6).map((line, i) => (
                <motion.div key={`${i}-${line}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="truncate">
                  {line}
                </motion.div>
              ))}
            </AnimatePresence>
            <div ref={logEndRef} />
          </div>
        )}
      </div>

      {backgroundJob && (
        <div className="px-1">
          <p className="text-[11px] text-text-secondary">
            This audit is running in the background — you can leave this page or close the tab. We'll notify you the moment it finishes.
          </p>
        </div>
      )}
    </div>
  );
}
