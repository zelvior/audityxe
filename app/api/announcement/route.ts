import { NextResponse } from "next/server";
import { getAnnouncement, isAnnouncementLive } from "@/lib/announcement";
import { getHotfixMessage } from "@/lib/ops";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  // The env-var hotfix message (AUDITYXE_HOTFIX_MESSAGE) is a zero-deploy,
  // zero-Firestore-dependency emergency override — it's meant to work even
  // if the database itself is the thing that's having a bad day, so it's
  // checked first and short-circuits before touching Firestore at all.
  // It always renders as a dismissible "warning" banner via the same
  // AnnouncementBanner UI as a normal DB-driven announcement.
  const hotfix = getHotfixMessage();
  if (hotfix) {
    return NextResponse.json({
      announcement: {
        active: true,
        message: hotfix,
        level: "warning",
        updatedAt: null,
        startsAt: null,
        endsAt: null,
        showCountdown: false,
      },
    });
  }

  try {
    const announcement = await getAnnouncement();
    // Scheduling is enforced server-side, not just hidden client-side —
    // a not-yet-started or already-expired announcement should never
    // even reach a visitor's browser.
    if (!isAnnouncementLive(announcement)) {
      return NextResponse.json({ announcement: { ...announcement, active: false } });
    }
    return NextResponse.json({ announcement });
  } catch {
    // Fail closed to "no announcement" rather than surfacing an error to
    // every visitor on the site if Firestore hiccups.
    return NextResponse.json({ announcement: { active: false, message: "", level: "info", updatedAt: null, startsAt: null, endsAt: null, showCountdown: false } });
  }
}
