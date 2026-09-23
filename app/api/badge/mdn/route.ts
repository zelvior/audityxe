import { NextResponse } from "next/server";
import { getCachedMdnObservatoryGrade } from "@/lib/security-badges";
import { gradeBadgeSvg, pendingBadgeSvg } from "@/lib/security-badge-svg";

export const runtime = "nodejs"; // needs the Firebase Admin SDK, not edge-compatible
export const dynamic = "force-dynamic"; // never statically prerendered — always a fresh Firestore-cache read, and must not attempt to run at build time with no Firebase creds available

/** Serves the cached grade written by app/api/cron/security-badges —
 * never calls observatory-api.mdn.mozilla.net itself. See
 * lib/security-badges.ts for why: this is the fix for the badge that
 * used to render broken. */
export async function GET() {
  const cached = await getCachedMdnObservatoryGrade();
  const svg = cached
    ? gradeBadgeSvg({
        label: "MDN HTTP Observatory",
        grade: cached.grade,
        subLabel: `Score: ${cached.score}`,
        checkedAt: cached.checkedAt,
      })
    : pendingBadgeSvg("MDN HTTP Observatory");

  return new NextResponse(svg, {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "public, max-age=21600, s-maxage=21600",
    },
  });
}
