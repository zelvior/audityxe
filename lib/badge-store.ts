import { adminDb } from "./firebase/admin";
import { FieldValue, Timestamp } from "firebase-admin/firestore";

/**
 * Minimal per-domain "last audit" record, used only to power the
 * embeddable badge (score + date). This is a deliberate, narrow
 * exception to Audityxe's usual zero-retention policy for full audit
 * results: we store nothing about the audit itself — no categories, no
 * fixes, no HTML, no requester identity — only the domain, its most
 * recent overall score, and when that audit ran. See /trust-center.
 */
export interface LastAuditRecord {
  host: string;
  overall: number;
  auditedAt: string; // ISO 8601
}

/**
 * Must be awaited by the caller before the API response is returned.
 * This is NOT truly fire-and-forget despite the name of the pattern it
 * replaced: on Vercel's serverless runtime, the function execution
 * environment can freeze the instant a response is returned, killing
 * any still-pending async work (like an un-awaited Firestore write)
 * before it completes — which was silently dropping every badge-score
 * save. Errors are still caught/logged rather than thrown, so a
 * Firestore hiccup here never fails the actual audit response.
 */
export async function saveLastAuditScore(host: string, overall: number): Promise<void> {
  const normalizedHost = host.trim().toLowerCase();
  if (!normalizedHost) return;

  try {
    await adminDb()
      .collection("badge_scores")
      .doc(normalizedHost)
      .set(
        {
          host: normalizedHost,
          overall,
          auditedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
  } catch (err) {
    console.warn(`[badge-store] failed to save score for ${normalizedHost}:`, err);
  }
}

export async function getLastAuditScore(host: string): Promise<LastAuditRecord | null> {
  const normalizedHost = host.trim().toLowerCase();
  if (!normalizedHost) return null;

  try {
    const snap = await adminDb().collection("badge_scores").doc(normalizedHost).get();
    if (!snap.exists) return null;

    const data = snap.data()!;
    const ts = data.auditedAt as Timestamp | undefined;
    if (typeof data.overall !== "number" || !ts) return null;

    return {
      host: normalizedHost,
      overall: data.overall,
      auditedAt: ts.toDate().toISOString(),
    };
  } catch (err) {
    console.warn(`[badge-store] failed to read score for ${normalizedHost}:`, err);
    return null;
  }
}
