import { NextResponse } from "next/server";
import { getAnnouncement } from "@/lib/announcement";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const announcement = await getAnnouncement();
    return NextResponse.json({ announcement });
  } catch {
    // Fail closed to "no announcement" rather than surfacing an error to
    // every visitor on the site if Firestore hiccups.
    return NextResponse.json({ announcement: { active: false, message: "", level: "info", updatedAt: null } });
  }
}
