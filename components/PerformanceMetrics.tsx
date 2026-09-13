"use client";

import { Lock } from "lucide-react";
import { AuditResult } from "@/lib/types";

/**
 * The actual Lighthouse metrics now render as a real module card (see
 * lib/audit-modules.ts buildLighthouseModule + components/AuditModules.tsx)
 * alongside every other audit module, instead of this separate stats
 * block. This component's only remaining job is the locked-plan notice
 * for when no real-browser pass was run this time.
 */
export default function PerformanceMetrics({ result }: { result: AuditResult }) {
  const isPro = result._usage?.plan === "pro";

  if (!result.pageSpeedLocked) return null;
  if (!isPro) return null; // free/anon plans never get the option — no point showing a lock message for a feature they can't reach

  const reason =
    result.pageSpeedLockReason === "weekly_limit"
      ? "This plan's weekly real-browser (Lighthouse) audit quota has already been used."
      : "A real-browser (Lighthouse) pass wasn't requested for this audit.";

  return (
    <section className="px-4 sm:px-6">
      <div className="max-w-4xl mx-auto glass rounded-card p-4 sm:p-6 flex items-center gap-3 text-sm text-text-secondary">
        <Lock size={16} className="shrink-0 text-primary" />
        <p>Lab performance metrics not included: {reason}</p>
      </div>
    </section>
  );
}

