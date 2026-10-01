import { NextResponse } from "next/server";
import { getCachedSslLabsGrade } from "@/lib/security-badges";
import { gradeBadgeSvg, pendingBadgeSvg } from "@/lib/security-badge-svg";

export const runtime = "nodejs"; // needs the Firebase Admin SDK, not edge-compatible
export const dynamic = "force-dynamic"; // never statically prerendered — always a fresh Firestore-cache read, and must not attempt to run at build time with no Firebase creds available

/** Serves the cached grade written by app/api/cron/security-badges —
 * never calls api.ssllabs.com itself. See lib/security-badges.ts for
 * why: this is the fix for the badge that used to render broken. */
export async function GET() {
  const cached = await getCachedSslLabsGrade();
  const svg = cached
    ? gradeBadgeSvg({ label: "Qualys SSL Labs", grade: cached.grade, endpoints: cached.endpoints, checkedAt: cached.checkedAt })
    : pendingBadgeSvg("Qualys SSL Labs");

  return new NextResponse(svg, {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      // The underlying grade only changes once a day at most (cron
      // cadence) — a long edge/browser cache here is exactly what "the
      // request doesn't have to hit the url every single time" means at
      // the HTTP layer, on top of the Firestore-level cache already in
      // front of the SSL Labs API itself.
      "Cache-Control": "public, max-age=21600, s-maxage=21600",
    },
  });
}
