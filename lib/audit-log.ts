import { adminDb } from "./firebase/admin";
import { FieldValue, Query, QueryDocumentSnapshot, Timestamp } from "firebase-admin/firestore";
import { incrementCounter, recordDailyEvent } from "./counters";

export interface AuditLogInput {
  url: string;
  uid: string | null;
  email: string | null;
  plan: string;
  score: number | null;
  status: "success" | "failed";
  error?: string;
}

/** Bounded, append-only history row per audit run. Powers Audit
 * Management (list/search/status/re-run/delete) and the total/failed
 * audit counters — counters themselves live in `counters/global` +
 * `dailyStats/{date}` (see lib/counters.ts) so admin totals never
 * require scanning this collection, only Audit Management's list view
 * reads from it directly (bounded page, see listAuditsForAdmin). */
export async function logAuditRecord(input: AuditLogInput): Promise<void> {
  const db = adminDb();
  await db.collection("audits").add({
    url: input.url.slice(0, 2048),
    uid: input.uid,
    email: input.email,
    plan: input.plan,
    score: input.score,
    status: input.status,
    error: input.error ? input.error.slice(0, 500) : null,
    createdAt: FieldValue.serverTimestamp(),
  });

  if (input.status === "success") {
    incrementCounter("totalAuditsAllTime").catch(() => {});
    recordDailyEvent("audits").catch(() => {});
  } else {
    incrementCounter("totalAuditsAllTime").catch(() => {});
    incrementCounter("failedAuditsAllTime").catch(() => {});
    recordDailyEvent("audits").catch(() => {});
    recordDailyEvent("failedAudits").catch(() => {});
  }
}

export interface AuditListItem {
  id: string;
  url: string;
  uid: string | null;
  email: string | null;
  plan: string;
  score: number | null;
  status: "success" | "failed";
  error: string | null;
  createdAt: string | null;
}

function toItem(doc: QueryDocumentSnapshot): AuditListItem {
  const d = doc.data();
  return {
    id: doc.id,
    url: d.url || "",
    uid: d.uid || null,
    email: d.email || null,
    plan: d.plan || "free",
    score: typeof d.score === "number" ? d.score : null,
    status: d.status === "failed" ? "failed" : "success",
    error: d.error || null,
    createdAt: d.createdAt instanceof Timestamp ? d.createdAt.toDate().toISOString() : d.createdAt || null,
  };
}

/** Lists recent audits for Audit Management, newest first. `status`
 * filters server-side (indexed); free-text `query` matches URL/email/uid
 * client-side over a bounded page — same pattern as listUsersForAdmin. */
export async function listAuditsForAdmin(opts: {
  query?: string;
  status?: "success" | "failed";
  limit?: number;
}): Promise<AuditListItem[]> {
  const db = adminDb();
  const cappedLimit = Math.min(Math.max(1, opts.limit || 50), 100);

  let q: Query = db.collection("audits").orderBy("createdAt", "desc");
  if (opts.status) q = q.where("status", "==", opts.status);
  const snap = await q.limit(500).get();

  const query = (opts.query || "").trim().toLowerCase();
  const items: AuditListItem[] = [];
  for (const doc of snap.docs) {
    const item = toItem(doc);
    if (
      query &&
      !(
        item.url.toLowerCase().includes(query) ||
        item.email?.toLowerCase().includes(query) ||
        item.uid?.toLowerCase().includes(query)
      )
    ) {
      continue;
    }
    items.push(item);
    if (items.length >= cappedLimit) break;
  }
  return items;
}

export async function getAuditForAdmin(id: string): Promise<AuditListItem | null> {
  const snap = await adminDb().collection("audits").doc(id).get();
  if (!snap.exists) return null;
  return toItem(snap as QueryDocumentSnapshot);
}

export async function deleteAuditRecord(id: string): Promise<void> {
  await adminDb().collection("audits").doc(id).delete();
}

/** Total/failed audit counts via cheap server-side count() aggregation
 * queries — no document reads, scales to any collection size. */
export async function getAuditCounts(): Promise<{ total: number; failed: number }> {
  const db = adminDb();
  const [totalSnap, failedSnap] = await Promise.all([
    db.collection("audits").count().get(),
    db.collection("audits").where("status", "==", "failed").count().get(),
  ]);
  return { total: totalSnap.data().count, failed: failedSnap.data().count };
}
