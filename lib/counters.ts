import { adminDb } from "./firebase/admin";
import { FieldValue } from "firebase-admin/firestore";

/**
 * All-time, all-scale counters. A single doc with FieldValue.increment is
 * safe up to a few hundred writes/sec (Firestore's per-document write
 * limit) — comfortably enough for audit/rate-limit/signup volume here,
 * and avoids ever scanning a collection to compute a total.
 */
const GLOBAL_REF = () => adminDb().collection("counters").doc("global");

export type CounterField =
  | "totalAuditsAllTime"
  | "failedAuditsAllTime"
  | "rateLimitHitsAllTime"
  | "revenueCentsAllTime";

export async function incrementCounter(field: CounterField, by = 1): Promise<void> {
  await GLOBAL_REF().set({ [field]: FieldValue.increment(by) }, { merge: true });
}

export interface GlobalCounters {
  totalAuditsAllTime: number;
  failedAuditsAllTime: number;
  rateLimitHitsAllTime: number;
  revenueCentsAllTime: number;
}

export async function getGlobalCounters(): Promise<GlobalCounters> {
  const snap = await GLOBAL_REF().get();
  const d = snap.data() || {};
  return {
    totalAuditsAllTime: d.totalAuditsAllTime || 0,
    failedAuditsAllTime: d.failedAuditsAllTime || 0,
    rateLimitHitsAllTime: d.rateLimitHitsAllTime || 0,
    revenueCentsAllTime: d.revenueCentsAllTime || 0,
  };
}

function dayKey(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}

export type DailyField = "newUsers" | "audits" | "failedAudits" | "rateLimitHits" | "revenueCents";

/** Per-day bucket doc (`dailyStats/{YYYY-MM-DD}`) — cheap increments, used
 * to draw the dashboard trend charts without ever scanning event rows. */
export async function recordDailyEvent(field: DailyField, by = 1): Promise<void> {
  const ref = adminDb().collection("dailyStats").doc(dayKey());
  await ref.set({ date: dayKey(), [field]: FieldValue.increment(by), updatedAt: FieldValue.serverTimestamp() }, { merge: true });
}

export interface DailyStatPoint {
  date: string;
  newUsers: number;
  audits: number;
  failedAudits: number;
  rateLimitHits: number;
  revenueCents: number;
}

/** Reads the last N days of daily buckets (bounded, cheap — at most N doc
 * reads regardless of how large the platform grows). Missing days are
 * filled with zeroes so charts always render a continuous series. */
export async function getDailyStats(days: number): Promise<DailyStatPoint[]> {
  const db = adminDb();
  const dates: string[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - i);
    dates.push(dayKey(d));
  }
  const snaps = await Promise.all(dates.map((d) => db.collection("dailyStats").doc(d).get()));
  return snaps.map((snap, i) => {
    const d = snap.data() || {};
    return {
      date: dates[i],
      newUsers: d.newUsers || 0,
      audits: d.audits || 0,
      failedAudits: d.failedAudits || 0,
      rateLimitHits: d.rateLimitHits || 0,
      revenueCents: d.revenueCents || 0,
    };
  });
}
