"use client";

import { Lock } from "lucide-react";
import Link from "next/link";
import { AuditResult } from "@/lib/types";

/**
 * The actual Lighthouse metrics now render as a real module card (see
 * lib/audit-modules.ts buildLighthouseModule + components/AuditModules.tsx)
 * alongside every other audit module, instead of this separate stats
 * block. This component's only remaining job is the locked-plan notice
 * for when no real-browser pass was run this time. Lighthouse/CrUX is
 * BYOK for every plan now, so this shows on every plan rather than
 * only Pro — the message just differs by reason.
 */
export default function PerformanceMetrics({ result }: { result: AuditResult }) {
  if (!result.pageSpeedLocked) return null;

  const reason =
    result.pageSpeedLockReason === "weekly_limit" ? (
      "This plan's weekly shared-key real-browser (Lighthouse) audit quota has already been used. Add your own free Google Cloud API key in Settings for unlimited real-browser passes with no weekly cap."
    ) : result.pageSpeedLockReason === "byok_required" ? (
      <>
        Lighthouse and CrUX are bring-your-own-key features — add a free Google Cloud API key in{" "}
        <Link href="/settings" className="text-primary hover:underline font-semibold">
          Settings
        </Link>{" "}
        to unlock them (2-minute setup, no billing required), or{" "}
        <Link href="/donate" className="text-primary hover:underline font-semibold">
          support Audityxe
        </Link>{" "}
        to help fund a free shared allowance for everyone.
      </>
    ) : (
      "A real-browser (Lighthouse) pass wasn't requested for this audit."
    );

  return (
    <section className="px-4 sm:px-6">
      <div className="max-w-4xl mx-auto glass rounded-card p-4 sm:p-6 flex items-center gap-3 text-sm text-text-secondary">
        <Lock size={16} className="shrink-0 text-primary" />
        <p>Lab performance metrics not included: {reason}</p>
      </div>
    </section>
  );
}

