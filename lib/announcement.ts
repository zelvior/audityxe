import { adminDb } from "./firebase/admin";
import { FieldValue } from "firebase-admin/firestore";

export type AnnouncementLevel = "info" | "warning";

export interface Announcement {
  active: boolean;
  message: string;
  level: AnnouncementLevel;
  updatedAt: string | null;
  /** ISO datetime the banner should start showing. Null = show
   * immediately once active. */
  startsAt: string | null;
  /** ISO datetime the banner should stop showing on its own, without
   * needing a manual "take down". Null = no auto-expiry. */
  endsAt: string | null;
  /** Optional — renders a live "Xh Ym Zs left" countdown next to the
   * message, ticking down to endsAt. Meaningless (and ignored) without
   * an endsAt set, since there's nothing to count down to. */
  showCountdown: boolean;
}

const DOC_PATH = ["site_config", "announcement"] as const;

/** Whether an announcement should actually be visible right now, given
 * its active flag and optional scheduling window. Shared by the public
 * API route (so visitors never see a not-yet-started or already-expired
 * banner) and the admin UI (so "live" reflects reality, not just the
 * active flag). */
export function isAnnouncementLive(a: Pick<Announcement, "active" | "startsAt" | "endsAt">, now: Date = new Date()): boolean {
  if (!a.active) return false;
  if (a.startsAt && now < new Date(a.startsAt)) return false;
  if (a.endsAt && now >= new Date(a.endsAt)) return false;
  return true;
}

export async function getAnnouncement(): Promise<Announcement> {
  const db = adminDb();
  const snap = await db.collection(DOC_PATH[0]).doc(DOC_PATH[1]).get();
  const data = snap.data();
  if (!data) return { active: false, message: "", level: "info", updatedAt: null, startsAt: null, endsAt: null, showCountdown: false };
  return {
    active: !!data.active,
    message: typeof data.message === "string" ? data.message : "",
    level: data.level === "warning" ? "warning" : "info",
    updatedAt: data.updatedAt?.toDate?.()?.toISOString?.() || null,
    startsAt: typeof data.startsAt === "string" ? data.startsAt : null,
    endsAt: typeof data.endsAt === "string" ? data.endsAt : null,
    showCountdown: !!data.showCountdown,
  };
}

export async function setAnnouncement(
  message: string,
  level: AnnouncementLevel,
  active: boolean,
  startsAt: string | null = null,
  endsAt: string | null = null,
  showCountdown: boolean = false
): Promise<void> {
  const cleaned = message.replace(/[\x00-\x1F\x7F]/g, "").trim().slice(0, 280);
  if (active && !cleaned) throw new Error("Message can't be empty while the announcement is active.");
  const normalize = (v: string | null) => {
    if (!v) return null;
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  };
  const startsAtNorm = normalize(startsAt);
  const endsAtNorm = normalize(endsAt);
  if (startsAtNorm && endsAtNorm && new Date(endsAtNorm) <= new Date(startsAtNorm)) {
    throw new Error("End time must be after the start time.");
  }
  const db = adminDb();
  await db
    .collection(DOC_PATH[0])
    .doc(DOC_PATH[1])
    .set({
      active,
      message: cleaned,
      level: level === "warning" ? "warning" : "info",
      updatedAt: FieldValue.serverTimestamp(),
      startsAt: startsAtNorm,
      endsAt: endsAtNorm,
      // A countdown with nothing to count down to is meaningless — never
      // persisted as true without an end time, regardless of what the
      // admin form sent, so a stale endsAt can never leave a countdown
      // silently on.
      showCountdown: showCountdown && !!endsAtNorm,
    });
}
