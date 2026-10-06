import { Timestamp } from "firebase-admin/firestore";
import { adminDb } from "./firebase/admin";
import {
  EffectivePolicy,
  EffectiveRetention,
  RetentionRunSummary,
  StoredRetention,
  RetentionUpdate,
  cutoffFor,
  resolveRetention,
  validateRetentionUpdate,
} from "./retention-core";

type AnyDb = any;

const CONFIG = ["config", "retention"] as const;
const STATUS = ["config", "retention_status"] as const;
const PAGE = 400; // < Firestore's 500-writes-per-batch limit

export async function getStoredRetention(db: AnyDb = adminDb()): Promise<StoredRetention | null> {
  const snap = await db.collection(CONFIG[0]).doc(CONFIG[1]).get();
  return snap.exists ? (snap.data() as StoredRetention) : null;
}

export async function getRetention(db: AnyDb = adminDb()): Promise<EffectiveRetention> {
  return resolveRetention(await getStoredRetention(db));
}

export async function saveRetention(update: RetentionUpdate, actorEmail: string, db: AnyDb = adminDb()): Promise<{ ok: true; retention: EffectiveRetention } | { ok: false; error: string }> {
  const current = await getStoredRetention(db);
  const v = validateRetentionUpdate(update, current);
  if (!v.ok) return v;
  const value: StoredRetention = { ...v.value, updatedAt: new Date().toISOString(), updatedBy: actorEmail };
  await db.collection(CONFIG[0]).doc(CONFIG[1]).set(value);
  return { ok: true, retention: resolveRetention(value) };
}

export async function getRetentionStatus(db: AnyDb = adminDb()): Promise<RetentionRunSummary | null> {
  const snap = await db.collection(STATUS[0]).doc(STATUS[1]).get();
  return snap.exists ? (snap.data() as RetentionRunSummary) : null;
}

function cutoffValue(policy: EffectivePolicy, now: Date): string | Timestamp {
  const c = cutoffFor(policy, now);
  return policy.fieldType === "timestamp" ? Timestamp.fromDate(new Date(c)) : c;
}

/** Deletes everything past `policy`'s cutoff, page by page. Reads exactly the
 * documents it deletes, so cost stays proportional to what's removed. */
export async function drainPolicy(db: AnyDb, policy: EffectivePolicy, opts: { maxPages?: number; now?: Date } = {}): Promise<{ deleted: number; capped: boolean }> {
  const maxPages = opts.maxPages ?? 10;
  const cutoff = cutoffValue(policy, opts.now || new Date());
  let deleted = 0;
  for (let page = 0; page < maxPages; page++) {
    const snap = await db.collection(policy.collection).where(policy.field, "<", cutoff).limit(PAGE).get();
    if (snap.empty) return { deleted, capped: false };
    const batch = db.batch();
    for (const d of snap.docs) batch.delete(d.ref);
    await batch.commit();
    deleted += snap.size;
    if (snap.size < PAGE) return { deleted, capped: false };
  }
  return { deleted, capped: true };
}

/** App-side runner — the same rules the Cloudflare Worker applies. Used by the
 * admin "Run now" button when no worker URL is configured, and by
 * /api/cron/retention. Persists a summary the admin page displays. */
export async function runRetention(opts: { db?: AnyDb; source?: "app" | "worker"; maxPages?: number; now?: Date } = {}): Promise<RetentionRunSummary> {
  const db = opts.db || adminDb();
  const cfg = await getRetention(db);
  const results: RetentionRunSummary["results"] = {};
  for (const p of cfg.policies) {
    if (!p.enabled) { results[p.id] = { ok: true, skipped: "disabled" }; continue; }
    try {
      const r = await drainPolicy(db, p, { maxPages: opts.maxPages, now: opts.now });
      results[p.id] = { ok: true, deleted: r.deleted, ...(r.capped ? { skipped: "more remain — will continue on the next run" } : {}) };
    } catch (err) {
      results[p.id] = { ok: false, error: err instanceof Error ? err.message.slice(0, 300) : String(err).slice(0, 300) };
    }
  }
  results.unverifiedUsers = { ok: true, skipped: "handled by the Cloudflare Worker (Firebase Auth cleanup)" };
  const summary: RetentionRunSummary = { ranAt: (opts.now || new Date()).toISOString(), source: opts.source || "app", results };
  await db.collection(STATUS[0]).doc(STATUS[1]).set(summary);
  return summary;
}

export interface PolicyStats {
  id: string;
  total: number | null;
  eligible: number | null;
  oldest: string | null;
  error?: string;
}

/** On-demand size/eligibility numbers via count() aggregation (billed ~1 read
 * per 1,000 index entries, no document reads). Never run on page load. */
export async function collectStats(db: AnyDb = adminDb(), now: Date = new Date()): Promise<PolicyStats[]> {
  const cfg = await getRetention(db);
  return Promise.all(
    cfg.policies.map(async (p): Promise<PolicyStats> => {
      try {
        const col = db.collection(p.collection);
        const [total, eligible, oldestSnap] = await Promise.all([
          col.count().get(),
          col.where(p.field, "<", cutoffValue(p, now)).count().get(),
          col.orderBy(p.field, "asc").limit(1).get(),
        ]);
        const first = oldestSnap.docs[0]?.data()?.[p.field];
        const oldest = first instanceof Timestamp ? first.toDate().toISOString() : typeof first === "string" ? first : null;
        return { id: p.id, total: total.data().count, eligible: eligible.data().count, oldest };
      } catch (err) {
        return { id: p.id, total: null, eligible: null, oldest: null, error: err instanceof Error ? err.message.slice(0, 160) : "count failed" };
      }
    })
  );
}

export interface WorkerTrigger { ok: boolean; status?: number; body?: unknown; error?: string }

/** Asks the Cloudflare Worker to run its cleanup right now (POST /run). */
export async function triggerWorker(): Promise<WorkerTrigger> {
  const url = (process.env.RETENTION_WORKER_URL || "").replace(/\/$/, "");
  const secret = process.env.CLEANUP_SHARED_SECRET || "";
  if (!url || !secret) return { ok: false, error: "RETENTION_WORKER_URL / CLEANUP_SHARED_SECRET aren't set." };
  try {
    const res = await fetch(`${url}/run`, { method: "POST", headers: { "x-cleanup-secret": secret }, signal: AbortSignal.timeout(50_000) });
    const body = await res.json().catch(() => null);
    return { ok: res.ok, status: res.status, body };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Worker unreachable." };
  }
}
