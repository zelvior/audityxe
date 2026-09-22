import { NextResponse } from "next/server";
import { getAnnouncement, isAnnouncementLive } from "@/lib/announcement";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
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
