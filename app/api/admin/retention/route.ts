import { NextRequest, NextResponse } from "next/server";
import { requireAuth, AuthError } from "@/lib/auth-server";
import { requireAdmin } from "@/lib/admin";
import { logAdminAction } from "@/lib/admin-log";
import { collectStats, getRetention, getRetentionStatus, runRetention, saveRetention, triggerWorker } from "@/lib/retention";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

async function gate(req: NextRequest) {
  const identity = await requireAuth(req, { requireEmailVerified: true });
  await requireAdmin(identity, req);
  return identity;
}
const fail = (err: unknown, fallback: string) =>
  err instanceof AuthError
    ? NextResponse.json({ error: err.message, code: err.code }, { status: err.status })
    : NextResponse.json({ error: err instanceof Error ? err.message : fallback }, { status: 500 });

/** GET — policies + last run. `?stats=1` adds live size numbers (count queries). */
export async function GET(req: NextRequest) {
  try {
    await gate(req);
    const [retention, lastRun] = await Promise.all([getRetention(), getRetentionStatus()]);
    const stats = req.nextUrl.searchParams.get("stats") === "1" ? await collectStats() : null;
    return NextResponse.json({
      retention,
      lastRun,
      stats,
      workerConfigured: !!(process.env.RETENTION_WORKER_URL && process.env.CLEANUP_SHARED_SECRET),
    });
  } catch (err) {
    return fail(err, "Failed to load retention settings.");
  }
}

/** PUT — update policies (validated against the server-side registry). */
export async function PUT(req: NextRequest) {
  try {
    const identity = await gate(req);
    const body = await req.json().catch(() => ({}));
    const result = await saveRetention({ policies: body?.policies, unverifiedUsers: body?.unverifiedUsers }, identity.email || "admin");
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
    await logAdminAction(identity.email || "admin", "retention_update", null, JSON.stringify({ policies: body?.policies, unverifiedUsers: body?.unverifiedUsers }).slice(0, 400));
    return NextResponse.json({ ok: true, retention: result.retention });
  } catch (err) {
    return fail(err, "Failed to save retention settings.");
  }
}

/** POST — run cleanup now: via the Cloudflare Worker when it's configured, otherwise in-app. */
export async function POST(req: NextRequest) {
  try {
    const identity = await gate(req);
    const body = await req.json().catch(() => ({}));
    const via: "worker" | "app" = body?.via === "app" ? "app" : process.env.RETENTION_WORKER_URL ? "worker" : "app";
    if (via === "worker") {
      const w = await triggerWorker();
      await logAdminAction(identity.email || "admin", "retention_run", "worker", w.ok ? "ok" : w.error || `HTTP ${w.status}`);
      if (!w.ok) return NextResponse.json({ error: w.error || `Worker returned HTTP ${w.status}.`, worker: w }, { status: 502 });
      return NextResponse.json({ ok: true, via, result: w.body, lastRun: await getRetentionStatus() });
    }
    const summary = await runRetention({ source: "app" });
    await logAdminAction(identity.email || "admin", "retention_run", "app", `${Object.values(summary.results).reduce((n, r) => n + (r.deleted || 0), 0)} deleted`);
    return NextResponse.json({ ok: true, via, result: summary, lastRun: summary });
  } catch (err) {
    return fail(err, "Retention run failed.");
  }
}
