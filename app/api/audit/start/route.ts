import { NextRequest, NextResponse } from "next/server";
import { waitUntil } from "@vercel/functions";
import { runAudit } from "@/lib/analyze";
import { refundWeeklyFeatureUsage } from "@/lib/rate-limit";
import { saveLastAuditScore } from "@/lib/badge-store";
import { logAuditRecord } from "@/lib/audit-log";
import { resolveAuditRequest } from "@/lib/audit-request";
import { createAuditJob, appendJobProgress, completeAuditJob, failAuditJob } from "@/lib/audit-jobs";
import { sendAuditPush } from "@/lib/push";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Longer ceiling than the synchronous /api/audit — this is specifically
// for the audits expected to run long (deep crawl + Lighthouse), which is
// the whole reason the background-job flow exists. waitUntil() below
// keeps the underlying function alive past the point where the HTTP
// response object is sent, up to this same limit.
export const maxDuration = 300;

/**
 * The background-job counterpart to /api/audit: identical validation,
 * auth, and quota rules (both call resolveAuditRequest so there's no
 * risk of the two silently drifting), but instead of awaiting the full
 * audit and returning it in one response, this creates a job document
 * immediately, hands the actual work to waitUntil() (runs after the
 * response is already on the wire — Vercel keeps the function instance
 * alive for it, independent of whether the requesting browser tab is
 * still open), and returns just the job's {jobId, token} right away.
 *
 * The client then either polls GET /api/audit/status/{jobId}, or — if
 * the person opted in via the "notify me" button — just closes the tab
 * entirely and waits for the Web Push notification (lib/push.ts) that
 * fires once the job in `waitUntil()` below finishes.
 *
 * Uses @vercel/functions' waitUntil rather than Next's own `after()` —
 * this project is pinned to Next 14.2, and `after()` wasn't stabilized
 * until Next 15 (14.2 has no `unstable_after` export at all to fall back
 * to either). waitUntil is the framework-independent primitive Vercel's
 * own runtime provides for exactly this "keep working after the response
 * is sent" case, and needs no Next upgrade or experimental flag.
 */
export async function POST(req: NextRequest) {
  const resolved = await resolveAuditRequest(req);
  if (!resolved.ok) return resolved.response;
  const {
    url,
    competitorUrl,
    crawlMode,
    includePromo,
    promoLockReason,
    byok,
    includePageSpeed,
    pageSpeedLockReason,
    psiByokKey,
    cruxByokKey,
    consumedSharedPsiQuota,
    identity,
    plan,
    used,
    limit,
    remaining,
  } = resolved.data;

  let hostname: string;
  try {
    hostname = new URL(/^https?:\/\//i.test(url) ? url : `https://${url}`).hostname;
  } catch {
    hostname = url;
  }

  const { jobId, token } = await createAuditJob(identity?.uid ?? null, hostname);

  waitUntil(
    (async () => {
      try {
        const result = await runAudit(url, competitorUrl, {
          includePromo,
          promoLockReason,
          includePageSpeed,
          byok,
          psiByokKey,
          cruxByokKey,
          crawlMode,
          onProgress: (step) => {
            // Fire-and-forget on purpose — a slow/failed progress write
            // must never stall or fail the audit itself.
            appendJobProgress(jobId, step).catch(() => {});
          },
        });

        if (consumedSharedPsiQuota && identity && result.pageSpeed?.attempted && !result.pageSpeed?.fetched) {
          await refundWeeklyFeatureUsage(identity.uid, "pagespeed").catch(() => {});
        }
        await saveLastAuditScore(result.url, result.overall).catch(() => {});
        logAuditRecord({
          url: result.url,
          uid: identity?.uid || null,
          email: identity?.email || null,
          plan,
          score: result.overall,
          status: "success",
        }).catch(() => {});

        await completeAuditJob(jobId, { ...result, _usage: { used, limit, remaining, plan }, pageSpeedLockReason });
        await sendAuditPush(identity?.uid, { hostname, ok: true, score: result.overall, jobId, token }).catch(() => {});
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to fetch and analyze the site.";
        logAuditRecord({
          url,
          uid: identity?.uid || null,
          email: identity?.email || null,
          plan,
          score: null,
          status: "failed",
          error: message,
        }).catch(() => {});
        await failAuditJob(jobId, message).catch(() => {});
        await sendAuditPush(identity?.uid, { hostname, ok: false, jobId, token }).catch(() => {});
      }
    })()
  );

  return NextResponse.json({ jobId, token, hostname });
}
