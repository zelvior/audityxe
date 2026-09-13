import { adminDb } from "./firebase/admin";
import { FieldValue } from "firebase-admin/firestore";

export type AnnouncementLevel = "info" | "warning";

export interface Announcement {
  active: boolean;
  message: string;
  level: AnnouncementLevel;
  updatedAt: string | null;
}

const DOC_PATH = ["site_config", "announcement"] as const;

export async function getAnnouncement(): Promise<Announcement> {
  const db = adminDb();
  const snap = await db.collection(DOC_PATH[0]).doc(DOC_PATH[1]).get();
  const data = snap.data();
  if (!data) return { active: false, message: "", level: "info", updatedAt: null };
  return {
    active: !!data.active,
    message: typeof data.message === "string" ? data.message : "",
    level: data.level === "warning" ? "warning" : "info",
    updatedAt: data.updatedAt?.toDate?.()?.toISOString?.() || null,
  };
}

export async function setAnnouncement(message: string, level: AnnouncementLevel, active: boolean): Promise<void> {
  const cleaned = message.replace(/[\x00-\x1F\x7F]/g, "").trim().slice(0, 280);
  if (active && !cleaned) throw new Error("Message can't be empty while the announcement is active.");
  const db = adminDb();
  await db
    .collection(DOC_PATH[0])
    .doc(DOC_PATH[1])
    .set({ active, message: cleaned, level: level === "warning" ? "warning" : "info", updatedAt: FieldValue.serverTimestamp() });
}
