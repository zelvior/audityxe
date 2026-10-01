import { NextRequest, NextResponse } from "next/server";
import { deleteExpiredAuditJobs } from "@/lib/audit-jobs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Prunes background audit job documents (lib/audit-jobs.ts) older than
 * their 24h TTL. These are short-lived working data for the "leave the
 * page, get notified when it's ready" flow, not an audit history feature
 * (lib/audit-log.ts already covers that permanently) — so unlike
 * cleanup-unverified this can run frequently and just deletes anything
 * past its TTL, no grace-period judgment calls needed.
 *
 * NOT scheduled via Vercel Cron (removed from vercel.json) — this task
 * now runs on a Cloudflare Worker instead (see /cloudflare-worker in the
 * repo root), specifically because Vercel's Hobby plan caps cron
 * triggers at once/day while this job was meant to run every 4 hours,
 * and Cloudflare's free tier has no such limit. This route is kept as a
 * manual/fallback trigger only: protected by the same shared secret,
 * callable directly if you want to run this project without Cloudflare
 * at all, or to force a run without waiting for the Worker's schedule.
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const expected = process.env.CRON_SECRET;

  if (!expected) {
    return NextResponse.json({ error: "CRON_SECRET is not configured." }, { status: 500 });
  }
  if (authHeader !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    // Firestore's `.limit(500)` per call means a large backlog needs
    // several passes to fully clear — loop until a pass deletes nothing.
    let totalDeleted = 0;
    let deletedThisPass: number;
    do {
      deletedThisPass = await deleteExpiredAuditJobs();
      totalDeleted += deletedThisPass;
    } while (deletedThisPass > 0);

    return NextResponse.json({ ok: true, deleted: totalDeleted });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Cleanup failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
