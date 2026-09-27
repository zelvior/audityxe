import { NextRequest, NextResponse } from "next/server";
import { getAuditJob } from "@/lib/audit-jobs";
import { savePushSubscription, StoredPushSubscription } from "@/lib/push";
import { isTrustedOrigin } from "@/lib/security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Registers a browser's Web Push subscription against one specific
 * background audit job (see lib/audit-jobs.ts, lib/push.ts). Requires
 * the job's token (the same one returned once from /api/audit/start) so
 * this can't be used to subscribe to notifications for someone else's
 * job by guessing its ID.
 */
export async function POST(req: NextRequest) {
  if (!isTrustedOrigin(req)) {
    return NextResponse.json({ error: "Cross-site request rejected." }, { status: 403 });
  }

  let body: { jobId?: string; token?: string; subscription?: StoredPushSubscription };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { jobId, token, subscription } = body;
  if (!jobId || !token || !subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
    return NextResponse.json({ error: "Missing jobId, token, or subscription." }, { status: 400 });
  }

  const job = await getAuditJob(jobId, token);
  if (!job) {
    return NextResponse.json({ error: "Job not found, or token is invalid." }, { status: 404 });
  }
  // A job that's already finished by the time the subscribe request
  // lands (a slow permission-prompt round trip on a fast audit) has no
  // one left to notify — tell the caller plainly rather than silently
  // storing a subscription nothing will ever read.
  if (job.status !== "running") {
    return NextResponse.json({ error: "This audit already finished — nothing to notify you about.", alreadyDone: true }, { status: 409 });
  }

  await savePushSubscription(jobId, token, subscription);
  return NextResponse.json({ ok: true });
}
