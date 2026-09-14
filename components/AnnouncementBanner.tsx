"use client";

import { useEffect, useState } from "react";
import { X, AlertTriangle, Info } from "lucide-react";
import { fetchJson } from "@/lib/fetch-json";

interface Announcement {
  active: boolean;
  message: string;
  level: "info" | "warning";
  startsAt?: string | null;
  endsAt?: string | null;
}

const DISMISS_KEY = "audityxe_announcement_dismissed";

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
