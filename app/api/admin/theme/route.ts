import { NextRequest, NextResponse } from "next/server";
import { requireAuth, AuthError } from "@/lib/auth-server";
import { requireAdmin } from "@/lib/admin";
import { getSiteTheme, setSiteTheme } from "@/lib/site-theme";
import { logAdminAction } from "@/lib/admin-log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const identity = await requireAuth(req, { requireEmailVerified: true });
    await requireAdmin(identity, req);
    const themeId = await getSiteTheme();
    return NextResponse.json({ themeId });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.status });
    }
    const message = err instanceof Error ? err.message : "Failed to load theme.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const identity = await requireAuth(req, { requireEmailVerified: true });
    await requireAdmin(identity, req);
    const body = await req.json().catch(() => ({}));
    const themeId = typeof body?.themeId === "string" ? body.themeId : "";

    await setSiteTheme(themeId);
    await logAdminAction(identity.email || "unknown", "set_theme", null, themeId);

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.status });
    }
    const message = err instanceof Error ? err.message : "Failed to update theme.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
