import { adminDb } from "./firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import { AuditResult } from "./types";

export interface StoredReport {
  id: string;
  uid: string;
  url: string;
  overall: number;
  result: AuditResult;
  createdAt: string; // ISO string
}

export interface StoredReportSummary {
  id: string;
  url: string;
  overall: number;
  createdAt: string;
}

/**
 * Saves a completed audit as a shareable, read-only report. Reports are
 * always readable via their id (that's the point — a shareable link),
 * but are only ever listed/discoverable through the owning account's
 * history, never through a public index.
 */
export async function saveReport(uid: string, result: AuditResult): Promise<string> {
  const db = adminDb();
  const ref = db.collection("reports").doc();
  await ref.set({
    uid,
    url: result.url,
    overall: result.overall,
    result,
    createdAt: FieldValue.serverTimestamp(),
  });
  return ref.id;
}

export async function getReport(id: string): Promise<StoredReport | null> {
  const db = adminDb();
  const snap = await db.collection("reports").doc(id).get();
  if (!snap.exists) return null;
  const data = snap.data()!;
  const createdAt = data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : new Date().toISOString();
  return {
    id: snap.id,
    uid: data.uid,
    url: data.url,
    overall: data.overall,
    result: data.result as AuditResult,
    createdAt,
  };
}

export async function listReportsForUser(uid: string, limit = 20): Promise<StoredReportSummary[]> {
  const db = adminDb();
  const snap = await db
    .collection("reports")
    .where("uid", "==", uid)
    .orderBy("createdAt", "desc")
    .limit(limit)
    .get();

  return snap.docs.map((doc) => {
    const data = doc.data();
    const createdAt = data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : new Date().toISOString();
    return { id: doc.id, url: data.url, overall: data.overall, createdAt };
  });
}
