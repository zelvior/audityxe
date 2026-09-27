import { randomBytes } from "crypto";
import { adminDb } from "./firebase/admin";
import { AuditResult } from "./types";

/**
 * Background audit jobs — lets a person close the tab or the whole
 * browser after starting an audit and still get the result (via a push
 * notification, see lib/push.ts) instead of the audit's output being
 * thrown away the moment the client that requested it disappears.
 *
 * The job document is the single source of truth for both the progress
 * log (polled by the live-preview iframe overlay, components/
 * LiveScanPreview.tsx) and the final result. A random per-job `token` —
 * separate from the Firestore document ID — is required on every read,
 * so a job ID leaking (e.g. in a browser history entry) doesn't let a
 * stranger read someone else's audit result; the token is only ever
 * returned once, in the create response, the same way a webhook secret
 * would be.
 */

export type AuditJobStatus = "running" | "done" | "error";

export interface AuditJobDoc {
  token: string;
  uid: string | null;
  status: AuditJobStatus;
  progress: string[];
  result: AuditResult | null;
  error: string | null;
  createdAt: string;
  updatedAt: string;
  // Denormalized for the push-notification copy (lib/push.ts) — avoids
  // a second read of `result` just to say "your audit of X is ready".
  hostname: string;
}

const COLLECTION = "auditJobs";
// Background jobs are inherently short-lived working data, not an
// audit history feature (that's lib/audit-log.ts) — old job docs are
// pruned by a scheduled cleanup (see /api/cron/cleanup-jobs) rather
// than kept forever.
const JOB_TTL_MS = 24 * 60 * 60 * 1000;

export async function createAuditJob(uid: string | null, hostname: string): Promise<{ jobId: string; token: string }> {
  const db = adminDb();
  const token = randomBytes(24).toString("hex");
  const now = new Date().toISOString();
  const doc: AuditJobDoc = {
    token,
    uid,
    status: "running",
    progress: ["Audit queued…"],
    result: null,
    error: null,
    createdAt: now,
    updatedAt: now,
    hostname,
  };
  const ref = await db.collection(COLLECTION).add(doc);
  return { jobId: ref.id, token };
}

export async function appendJobProgress(jobId: string, step: string): Promise<void> {
  const db = adminDb();
  const ref = db.collection(COLLECTION).doc(jobId);
  // Firestore has no atomic "append with a cap" primitive, so this reads
  // then writes — progress updates are infrequent (roughly one per
  // network check in a single audit, well under Firestore's per-document
  // write-rate limits) so the extra read is a non-issue here.
  const snap = await ref.get();
  if (!snap.exists) return;
  const existing = (snap.data() as AuditJobDoc).progress ?? [];
  // Cap the log rather than let a pathological retry loop grow it
  // unbounded — the last 40 steps are always more than enough to show
  // a meaningful live-activity feed.
  const next = [...existing, step].slice(-40);
  await ref.update({ progress: next, updatedAt: new Date().toISOString() });
}

export async function completeAuditJob(jobId: string, result: AuditResult): Promise<void> {
  const db = adminDb();
  await db.collection(COLLECTION).doc(jobId).update({
    status: "done",
    result,
    updatedAt: new Date().toISOString(),
  });
}

export async function failAuditJob(jobId: string, error: string): Promise<void> {
  const db = adminDb();
  await db.collection(COLLECTION).doc(jobId).update({
    status: "error",
    error,
    updatedAt: new Date().toISOString(),
  });
}

/** Ownership-checked read — returns null for a wrong/missing token so the
 * caller can respond identically to "doesn't exist" and "wrong token"
 * (never leak which one it was). */
export async function getAuditJob(jobId: string, token: string): Promise<AuditJobDoc | null> {
  const db = adminDb();
  const snap = await db.collection(COLLECTION).doc(jobId).get();
  if (!snap.exists) return null;
  const data = snap.data() as AuditJobDoc;
  if (data.token !== token) return null;
  return data;
}

/** Called by the scheduled cleanup route only — no per-request cost. */
export async function deleteExpiredAuditJobs(): Promise<number> {
  const db = adminDb();
  const cutoff = new Date(Date.now() - JOB_TTL_MS).toISOString();
  const snap = await db.collection(COLLECTION).where("createdAt", "<", cutoff).limit(500).get();
  if (snap.empty) return 0;
  const batch = db.batch();
  snap.docs.forEach((d) => batch.delete(d.ref));
  await batch.commit();
  return snap.size;
}
