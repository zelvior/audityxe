import { adminDb } from "./firebase/admin";
import { FieldValue, Timestamp } from "firebase-admin/firestore";

export interface AdminLogEntry {
  id: string;
  actorEmail: string;
  action: string;
  target: string | null;
  details: string | null;
  at: string | null;
}

/** Fire-and-forget style but awaited — records who did what, to whom,
 * and when. Never throws into the caller: a logging failure should
 * never block or roll back the actual admin action. */
export async function logAdminAction(actorEmail: string, action: string, target: string | null, details?: string | null): Promise<void> {
  try {
    const db = adminDb();
    await db.collection("admin_audit_log").add({
      actorEmail,
      action,
      target: target || null,
      details: details ? details.replace(/[\x00-\x1F\x7F]/g, "").slice(0, 500) : null,
      at: FieldValue.serverTimestamp(),
    });
  } catch {
    // Logging is best-effort — never let it break the admin action itself.
  }
}

export async function listAdminLog(limit = 100): Promise<AdminLogEntry[]> {
  const db = adminDb();
  const cappedLimit = Math.min(Math.max(1, limit), 200);
  const snap = await db.collection("admin_audit_log").orderBy("at", "desc").limit(cappedLimit).get();
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      actorEmail: data.actorEmail || "unknown",
      action: data.action || "unknown",
      target: data.target || null,
      details: data.details || null,
      at: data.at instanceof Timestamp ? data.at.toDate().toISOString() : data.at || null,
    };
  });
}
