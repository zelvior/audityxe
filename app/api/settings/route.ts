import { NextRequest, NextResponse } from "next/server";
import { requireAuth, AuthError } from "@/lib/auth-server";
import { ensureUserDoc } from "@/lib/rate-limit";
import { getUserPreferences, updateUserPreferences, updateDisplayNameOnRecord } from "@/lib/user-settings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const identity = await requireAuth(req);
    await ensureUserDoc(identity);
    const prefs = await getUserPreferences(identity.uid);
    return NextResponse.json(prefs);
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    const message = err instanceof Error ? err.message : "Failed to load settings.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const contentLength = Number(req.headers.get("content-length") || 0);
  if (contentLength > 2048) {
    return NextResponse.json({ error: "Request body is too large." }, { status: 413 });
  }

  try {
    const identity = await requireAuth(req);

    let body: { defaultTone?: string; displayName?: string };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
    }

    if (body.defaultTone && !["constructive", "brutal"].includes(body.defaultTone)) {
      return NextResponse.json({ error: "Invalid tone value." }, { status: 400 });
    }
    if (body.displayName !== undefined && typeof body.displayName !== "string") {
      return NextResponse.json({ error: "Invalid display name." }, { status: 400 });
    }
    if (typeof body.displayName === "string" && body.displayName.length > 80) {
      return NextResponse.json({ error: "Display name is too long." }, { status: 400 });
    }

    if (body.defaultTone) {
      await updateUserPreferences(identity.uid, { defaultTone: body.defaultTone as "constructive" | "brutal" });
    }
    if (body.displayName !== undefined) {
      await updateDisplayNameOnRecord(identity.uid, body.displayName.trim() || null);
    }

    const prefs = await getUserPreferences(identity.uid);
    return NextResponse.json(prefs);
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    const message = err instanceof Error ? err.message : "Failed to update settings.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
