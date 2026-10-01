import { NextRequest, NextResponse } from "next/server";
import { requireAuth, AuthError } from "@/lib/auth-server";
import { deleteAllUserData } from "@/lib/user-settings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Deletes all of the signed-in account's server-side data (user doc,
 * usage doc, every shared report). The client is responsible for
 * deleting the Firebase Auth account itself immediately after this
 * succeeds — see AuthContext.deleteAccount().
 */
export async function POST(req: NextRequest) {
  try {
    const identity = await requireAuth(req);
    await deleteAllUserData(identity.uid);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.status });
    }
    const message = err instanceof Error ? err.message : "Failed to delete account data.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
