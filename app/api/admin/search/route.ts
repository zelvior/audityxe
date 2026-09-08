import { NextRequest, NextResponse } from "next/server";
import { requireAuth, AuthError } from "@/lib/auth-server";
import { requireAdmin } from "@/lib/admin";
import { searchUsersBloom } from "@/lib/user-moderation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const identity = await requireAuth(req, { requireEmailVerified: true });
    await requireAdmin(identity, req);
    const q = req.nextUrl.searchParams.get("q") || "";
    const users = await searchUsersBloom(q);
    return NextResponse.json({ users });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.status });
    }
    const message = err instanceof Error ? err.message : "Search failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
