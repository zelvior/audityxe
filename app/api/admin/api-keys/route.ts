import { NextRequest, NextResponse } from "next/server";
import { requireAuth, AuthError } from "@/lib/auth-server";
import { requireAdmin } from "@/lib/admin";
import { createApiKey, listApiKeys, ApiKeyError } from "@/lib/api-keys";
import { logAdminAction } from "@/lib/admin-log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const identity = await requireAuth(req, { requireEmailVerified: true });
    await requireAdmin(identity, req);
    const keys = await listApiKeys();
    return NextResponse.json({ keys });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.status });
    }
    const message = err instanceof Error ? err.message : "Failed to list API keys.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/** Issues a new key for a Pro-plan uid. The raw key is returned only
 * in this response — the admin panel must show/copy it immediately;
 * it can never be retrieved again afterward. */
export async function POST(req: NextRequest) {
  try {
    const identity = await requireAuth(req, { requireEmailVerified: true });
    await requireAdmin(identity, req);
    const body = await req.json().catch(() => ({}));

    const uid = typeof body?.uid === "string" ? body.uid.trim() : "";
    if (!uid) {
      return NextResponse.json({ error: "A target uid is required." }, { status: 400 });
    }
    const email = typeof body?.email === "string" ? body.email : null;
    const label = typeof body?.label === "string" ? body.label : "";

    const { rawKey, doc } = await createApiKey({
      uid,
      email,
      label,
      adminEmail: identity.email || "unknown",
    });

    await logAdminAction(identity.email || "unknown", "create_api_key", doc.id, `${doc.label} → ${email || uid}`);

    return NextResponse.json({ rawKey, key: doc });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.status });
    }
    if (err instanceof ApiKeyError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    const message = err instanceof Error ? err.message : "Failed to create API key.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
