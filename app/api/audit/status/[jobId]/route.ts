import { NextRequest, NextResponse } from "next/server";
import { getAuditJob } from "@/lib/audit-jobs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Polled by the live-preview iframe overlay (components/LiveScanPreview.tsx)
 * while a background job (started via /api/audit/start) is running, and
 * once more by the page that opens from a push-notification tap to fetch
 * the finished result. Requires the job's token as a query param — see
 * lib/audit-jobs.ts's getAuditJob for why (prevents guessing someone
 * else's job ID and reading their result).
 */
export async function GET(req: NextRequest, { params }: { params: { jobId: string } }) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.json({ error: "Missing token." }, { status: 400 });
  }

  const job = await getAuditJob(params.jobId, token);
  if (!job) {
    return NextResponse.json({ error: "Job not found, or token is invalid." }, { status: 404 });
  }

  return NextResponse.json({
    status: job.status,
    progress: job.progress,
    hostname: job.hostname,
    result: job.status === "done" ? job.result : null,
    error: job.status === "error" ? job.error : null,
  });
}
