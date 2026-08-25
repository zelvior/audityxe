import { NextRequest, NextResponse } from "next/server";
import { requireAuth, AuthError } from "@/lib/auth-server";
import { ensureUserDoc } from "@/lib/rate-limit";
import { updateDisplayNameOnRecord } from "@/lib/user-settings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest) {
  const contentLength = Number(req.headers.get("content-length") || 0);
  if (contentLength > 2048) {
    return NextResponse.json({ error: "Request body is too large." }, { status: 413 });
  }

  try {
    const identity = await requireAuth(req);
    await ensureUserDoc(identity);

    let body: { displayName?: string };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
    }

    if (body.displayName !== undefined && typeof body.displayName !== "string") {
      return NextResponse.json({ error: "Invalid display name." }, { status: 400 });
    }
    if (typeof body.displayName === "string" && body.displayName.length > 80) {
      return NextResponse.json({ error: "Display name is too long." }, { status: 400 });
    }

    if (body.displayName !== undefined) {
      await updateDisplayNameOnRecord(identity.uid, body.displayName.trim() || null);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    const message = err instanceof Error ? err.message : "Failed to update settings.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
