import { NextRequest, NextResponse } from "next/server";
import { requireAuth, AuthError } from "@/lib/auth-server";
import { requireAdmin } from "@/lib/admin";
import { getAnnouncement, setAnnouncement } from "@/lib/announcement";
import { logAdminAction } from "@/lib/admin-log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const identity = await requireAuth(req, { requireEmailVerified: true });
    await requireAdmin(identity, req);
    const announcement = await getAnnouncement();
    return NextResponse.json({ announcement });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.status });
    }
    const message = err instanceof Error ? err.message : "Failed to load announcement.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const identity = await requireAuth(req, { requireEmailVerified: true });
    await requireAdmin(identity, req);
    const body = await req.json().catch(() => ({}));
    const message = typeof body?.message === "string" ? body.message : "";
    const level = body?.level === "warning" ? "warning" : "info";
    const active = !!body?.active;
    const startsAt = typeof body?.startsAt === "string" && body.startsAt ? body.startsAt : null;
    const endsAt = typeof body?.endsAt === "string" && body.endsAt ? body.endsAt : null;

    await setAnnouncement(message, level, active, startsAt, endsAt);
    await logAdminAction(identity.email || "unknown", active ? "set_announcement" : "clear_announcement", null, message.slice(0, 100));

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.status });
    }
    const message = err instanceof Error ? err.message : "Failed to update announcement.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
