import { NextRequest, NextResponse } from "next/server";
import { refreshSslLabsGrade, refreshMdnObservatoryGrade } from "@/lib/security-badges";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * The only place in the codebase that ever calls the live SSL Labs /
 * MDN Observatory APIs. Runs once a day (see vercel.json) so the badge
 * SVG routes never touch either third party directly — see
 * lib/security-badges.ts for the full reasoning. Same shared-secret
 * pattern as the existing cleanup-unverified cron.
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const expected = process.env.CRON_SECRET;

  if (!expected) {
    return NextResponse.json({ error: "CRON_SECRET is not configured." }, { status: 500 });
  }
  if (authHeader !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const [ssllabs, mdnObservatory] = await Promise.all([refreshSslLabsGrade(), refreshMdnObservatoryGrade()]);

  return NextResponse.json({ ok: ssllabs.ok && mdnObservatory.ok, ssllabs, mdnObservatory });
}
