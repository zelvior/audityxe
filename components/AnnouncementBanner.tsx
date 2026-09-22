"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, AlertTriangle, Info } from "lucide-react";
import { fetchJson } from "@/lib/fetch-json";

interface Announcement {
  active: boolean;
  message: string;
  level: "info" | "warning";
  startsAt?: string | null;
  endsAt?: string | null;
  showCountdown?: boolean;
}

const DISMISS_KEY = "audityxe_announcement_dismissed";

interface CountdownUnit {
  label: string;
  value: number;
}

/** Breaks remaining time down into Y/Mo/D/H/M/S. "Every field optional":
 * a unit is only included once it (or something larger) is actually
 * nonzero — a countdown under a day never shows a "0d" or "0mo" — and
 * the breakdown is fully dynamic, recomputed every tick rather than
 * fixed to a format decided up front. Always keeps every unit down to
 * seconds once the largest nonzero one is found, so it reads as one
 * continuous ticking clock (e.g. "3d 04:12:33") rather than jumping
 * straight to "33s" a unit at a time. */
function getCountdownUnits(msRemaining: number): CountdownUnit[] {
  const totalSeconds = Math.max(0, Math.floor(msRemaining / 1000));
  const years = Math.floor(totalSeconds / 31_536_000);
  let rem = totalSeconds % 31_536_000;
  const months = Math.floor(rem / 2_592_000);
  rem %= 2_592_000;
  const days = Math.floor(rem / 86_400);
  rem %= 86_400;
  const hours = Math.floor(rem / 3_600);
  rem %= 3_600;
  const minutes = Math.floor(rem / 60);
  const seconds = rem % 60;

  const all: CountdownUnit[] = [
    { label: "y", value: years },
    { label: "mo", value: months },
    { label: "d", value: days },
    { label: "h", value: hours },
    { label: "m", value: minutes },
    { label: "s", value: seconds },
  ];
  const firstNonZero = all.findIndex((u) => u.value > 0);
  return firstNonZero === -1 ? [all[all.length - 1]] : all.slice(firstNonZero);
}

/** A single flip-style digit: the old value slides up and out while the
 * new one slides in from below, mimicking a mechanical flip clock. */
function FlipUnit({ unit }: { unit: CountdownUnit }) {
  return (
    <span className="inline-flex flex-col items-center">
      <span className="relative inline-block w-[1.9em] h-[1.3em] overflow-hidden rounded-[4px] bg-current/[0.08] ring-1 ring-current/10">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={unit.value}
            initial={{ y: "-100%", opacity: 0 }}
            animate={{ y: "0%", opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inset-0 flex items-center justify-center font-mono font-bold tabular-nums"
          >
            {String(unit.value).padStart(2, "0")}
          </motion.span>
        </AnimatePresence>
      </span>
      <span className="text-[0.55em] opacity-55 leading-none mt-0.5 uppercase tracking-wide">{unit.label}</span>
    </span>
  );
}

/** Live, beautifully-animated countdown to a fixed deadline, ticking
 * every second. Self-contained so AnnouncementBanner doesn't re-render
 * its whole tree once a second — only this small span does. */
function LiveCountdown({ endsAt, onExpire }: { endsAt: string; onExpire?: () => void }) {
  const deadline = useState(() => new Date(endsAt).getTime())[0];
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const remaining = deadline - now;
  useEffect(() => {
    if (remaining <= 0) onExpire?.();
  }, [remaining, onExpire]);
  if (remaining <= 0) return null;

  const units = getCountdownUnits(remaining);

  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex items-center gap-1 shrink-0"
      aria-label={`${units.map((u) => `${u.value}${u.label}`).join(" ")} left`}
    >
      {units.map((u, i) => (
        <span key={u.label} className="flex items-center gap-1">
          <FlipUnit unit={u} />
          {i < units.length - 1 && <span className="opacity-40 font-mono -mt-2.5">:</span>}
        </span>
      ))}
    </motion.span>
  );
}

export default function AnnouncementBanner() {
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    (async () => {
      const { ok, data } = await fetchJson<{ announcement: Announcement }>("/api/announcement");
      if (!ok || !data?.announcement?.active || !data.announcement.message) return;
      setAnnouncement(data.announcement);
      try {
        const dismissedFor = sessionStorage.getItem(DISMISS_KEY);
        if (dismissedFor === data.announcement.message) setDismissed(true);
      } catch {
        // sessionStorage unavailable (private browsing edge cases) — just show it.
      }
    })();
  }, []);

  if (!announcement || dismissed) return null;

  const isWarning = announcement.level === "warning";

  return (
    <div
      className={`sticky top-0 z-50 flex items-center justify-center gap-2 px-4 py-2 text-xs sm:text-sm text-center ${
        isWarning ? "bg-amber/15 text-amber border-b border-amber/30" : "bg-primary/15 text-primary border-b border-primary/30"
      }`}
    >
      {isWarning ? <AlertTriangle size={14} className="shrink-0" /> : <Info size={14} className="shrink-0" />}
      <span>{announcement.message}</span>
      {announcement.showCountdown && announcement.endsAt && (
        <LiveCountdown endsAt={announcement.endsAt} onExpire={() => setAnnouncement(null)} />
      )}
      <button
        onClick={() => {
          setDismissed(true);
          try {
            sessionStorage.setItem(DISMISS_KEY, announcement.message);
          } catch {}
        }}
        className="ml-2 opacity-70 hover:opacity-100 shrink-0"
        aria-label="Dismiss announcement"
      >
        <X size={14} />
      </button>
    </div>
  );
}
