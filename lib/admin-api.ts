import { NextRequest, NextResponse } from "next/server";
import { requireAuth, AuthError } from "./auth-server";
import { requireAdmin } from "./admin";
import type { DecodedIdentity } from "./rate-limit";

/** Shared gate for every admin API route: verified Firebase session + email on
 * the ADMIN_EMAILS allowlist + the admin password header. */
export async function adminGate(req: NextRequest): Promise<DecodedIdentity> {
  const identity = await requireAuth(req, { requireEmailVerified: true });
  await requireAdmin(identity, req);
  return identity;
}

export function adminFail(err: unknown, fallback = "Request failed.", status = 500): NextResponse {
  if (err instanceof AuthError) return NextResponse.json({ error: err.message, code: err.code }, { status: err.status });
  return NextResponse.json({ error: err instanceof Error ? err.message : fallback }, { status });
}

/** Clamp a query-string page size. */
export function pageSize(req: NextRequest, fallback = 50, max = 200): number {
  const n = Number(req.nextUrl.searchParams.get("limit"));
  return Number.isFinite(n) && n > 0 ? Math.min(Math.floor(n), max) : fallback;
}
