import { NextRequest, NextResponse } from "next/server";
import { requireAuth, AuthError } from "@/lib/auth-server";
import { requireAdmin } from "@/lib/admin";
import { getAuditForAdmin, deleteAuditRecord, logAuditRecord } from "@/lib/audit-log";
import { logAdminAction } from "@/lib/admin-log";
import { runAudit } from "@/lib/analyze";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const identity = await requireAuth(req, { requireEmailVerified: true });
    await requireAdmin(identity, req);
    await deleteAuditRecord(params.id);
    await logAdminAction(identity.email || "unknown", "delete_audit", params.id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.status });
    }
    const message = err instanceof Error ? err.message : "Failed to delete audit.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/** Re-runs the audit's URL through the same engine used by the public
 * endpoint, admin-only and outside any user's daily quota, then logs a
 * fresh history row (the original row is left untouched). */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const identity = await requireAuth(req, { requireEmailVerified: true });
    await requireAdmin(identity, req);

    const existing = await getAuditForAdmin(params.id);
    if (!existing) {
      return NextResponse.json({ error: "Audit not found." }, { status: 404 });
    }

    try {
      const result = await runAudit(existing.url, undefined, { includePromo: false, includePageSpeed: false });
      await logAuditRecord({
        url: existing.url,
        uid: existing.uid,
        email: existing.email,
        plan: existing.plan,
        score: result.overall,
        status: "success",
      });
      await logAdminAction(identity.email || "unknown", "rerun_audit", existing.url, `score ${result.overall}`);
      return NextResponse.json({ ok: true, score: result.overall });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Re-run failed.";
      await logAuditRecord({
        url: existing.url,
        uid: existing.uid,
        email: existing.email,
        plan: existing.plan,
        score: null,
        status: "failed",
        error: message,
      });
      return NextResponse.json({ error: message }, { status: 502 });
    }
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.status });
    }
    const message = err instanceof Error ? err.message : "Failed to re-run audit.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
