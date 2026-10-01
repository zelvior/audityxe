import { NextRequest, NextResponse } from "next/server";
import { requireAuth, AuthError } from "@/lib/auth-server";
import { requireAdmin } from "@/lib/admin";
import { listAuditsForAdmin } from "@/lib/audit-log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const identity = await requireAuth(req, { requireEmailVerified: true });
    await requireAdmin(identity, req);
    const q = req.nextUrl.searchParams.get("q") || "";
    const status = req.nextUrl.searchParams.get("status");
    const audits = await listAuditsForAdmin({
      query: q,
      status: status === "success" || status === "failed" ? status : undefined,
    });
    return NextResponse.json({ audits });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.status });
    }
    const message = err instanceof Error ? err.message : "Failed to load audits.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
