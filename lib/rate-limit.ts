import { adminDb } from "./firebase/admin";
import { DEFAULT_PLAN, PlanId, planLimit, ANON_DAILY_LIMIT } from "./plans";
import { FieldValue, Timestamp } from "firebase-admin/firestore";

function todayKey(): string {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD (UTC)
}

export interface DecodedIdentity {
  uid: string;
  email: string | null;
  emailVerified: boolean;
}

/**
 * Ensures a users/{uid} document exists (first-login bootstrap). Never
 * downgrades an existing plan — safe to call on every authenticated
 * request.
 *
 * Deliberately does nothing for an unverified account: we don't want
 * Firestore filling up with a document per throwaway/never-verified
 * signup. The record is created the first time a request comes in from
 * an account whose email is actually verified — which also means an
 * account that never verifies never accumulates any usage/plan state at
 * all, and a stale Firebase Auth entry for it can be cleaned up freely
 * (see /api/cron/cleanup-unverified) without touching Firestore.
 */
export async function ensureUserDoc(identity: DecodedIdentity, displayName?: string | null): Promise<void> {
  if (!identity.emailVerified) return;

  const db = adminDb();
  const ref = db.collection("users").doc(identity.uid);
  const snap = await ref.get();
  if (!snap.exists) {
    await ref.set({
      email: identity.email,
      displayName: displayName || null,
      plan: DEFAULT_PLAN,
      planExpiresAt: null,
      createdAt: FieldValue.serverTimestamp(),
    });
  }
}

/**
 * Resolves the EFFECTIVE plan for a user document: a manually-granted
 * paid plan (Standard/Pro) reverts to Free automatically once
 * `planExpiresAt` has passed, without needing any background job — the
 * expiry is just checked at read time. `planExpiresAt` is set manually
 * in Firestore when an admin approves a 30 or 365-day access request
 * (see README: "Approving a plan upgrade").
 */
function effectivePlan(data: FirebaseFirestore.DocumentData | undefined): { plan: PlanId; expiresAt: Date | null; expired: boolean } {
  if (!data) return { plan: DEFAULT_PLAN, expiresAt: null, expired: false };

  const rawPlan = data.plan as PlanId | undefined;
  const plan: PlanId = rawPlan && ["free", "standard", "pro"].includes(rawPlan) ? rawPlan : DEFAULT_PLAN;

  const rawExpiry = data.planExpiresAt;
  const expiresAt: Date | null =
    rawExpiry instanceof Timestamp ? rawExpiry.toDate() : rawExpiry ? new Date(rawExpiry) : null;

  if (plan !== "free" && expiresAt && expiresAt.getTime() < Date.now()) {
    return { plan: DEFAULT_PLAN, expiresAt, expired: true };
  }

  return { plan, expiresAt, expired: false };
}

export async function getUserPlan(uid: string): Promise<PlanId> {
  const db = adminDb();
  const snap = await db.collection("users").doc(uid).get();
  return effectivePlan(snap.data()).plan;
}

export interface UsageResult {
  allowed: boolean;
  used: number;
  limit: number;
  remaining: number;
  plan: PlanId;
  planExpiresAt: string | null;
  planExpired: boolean;
}

/**
 * Atomically checks today's usage against the account's plan limit and,
 * if allowed, increments the counter. Uses a Firestore transaction so
 * concurrent requests from the same account can't race past the limit.
 */
export async function checkAndIncrementUsage(uid: string): Promise<UsageResult> {
  const db = adminDb();
  const userRef = db.collection("users").doc(uid);
  const usageRef = db.collection("usage").doc(uid);
  const today = todayKey();

  return db.runTransaction(async (tx) => {
    const [userSnap, usageSnap] = await Promise.all([tx.get(userRef), tx.get(usageRef)]);

    const { plan, expiresAt, expired } = effectivePlan(userSnap.data());
    const limit = planLimit(plan);

    let used = 0;
    if (usageSnap.exists) {
      const data = usageSnap.data()!;
      used = data.date === today ? (data.count as number) || 0 : 0;
    }

    if (used >= limit) {
      return {
        allowed: false,
        used,
        limit,
        remaining: 0,
        plan,
        planExpiresAt: expiresAt ? expiresAt.toISOString() : null,
        planExpired: expired,
      };
    }

    const nextUsed = used + 1;
    tx.set(usageRef, { date: today, count: nextUsed, updatedAt: FieldValue.serverTimestamp() }, { merge: true });

    return {
      allowed: true,
      used: nextUsed,
      limit,
      remaining: Math.max(0, limit - nextUsed),
      plan,
      planExpiresAt: expiresAt ? expiresAt.toISOString() : null,
      planExpired: expired,
    };
  });
}

/** Read-only usage lookup for the account page — does not increment. */
export async function getUsageSnapshot(uid: string): Promise<UsageResult> {
  const db = adminDb();
  const [userSnap, usageSnap] = await Promise.all([
    db.collection("users").doc(uid).get(),
    db.collection("usage").doc(uid).get(),
  ]);

  const { plan, expiresAt, expired } = effectivePlan(userSnap.data());
  const limit = planLimit(plan);
  const today = todayKey();

  let used = 0;
  if (usageSnap.exists) {
    const data = usageSnap.data()!;
    used = data.date === today ? (data.count as number) || 0 : 0;
  }

  return {
    allowed: used < limit,
    used,
    limit,
    remaining: Math.max(0, limit - used),
    plan,
    planExpiresAt: expiresAt ? expiresAt.toISOString() : null,
    planExpired: expired,
  };
}

export interface DailyFeatureUsageResult {
  allowed: boolean;
  used: number;
  limit: number;
  remaining: number;
}

/**
 * Generic atomic daily counter for a named feature (e.g. "promo-copy",
 * "banner-image"), separate from the main audit quota. Same
 * transaction-based pattern as the audit quota, so it's equally
 * un-bypassable — enforced server-side, keyed by uid, not by anything
 * the client controls.
 */
export async function checkAndIncrementFeatureUsage(
  uid: string,
  feature: string,
  limit: number
): Promise<DailyFeatureUsageResult> {
  const db = adminDb();
  const ref = db.collection("feature_usage").doc(`${uid}_${feature}`);
  const today = todayKey();

  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);

    let used = 0;
    if (snap.exists) {
      const data = snap.data()!;
      used = data.date === today ? (data.count as number) || 0 : 0;
    }

    if (used >= limit) {
      return { allowed: false, used, limit, remaining: 0 };
    }

    const nextUsed = used + 1;
    tx.set(ref, { date: today, count: nextUsed, updatedAt: FieldValue.serverTimestamp() }, { merge: true });

    return { allowed: true, used: nextUsed, limit, remaining: Math.max(0, limit - nextUsed) };
  });
}

function weekKey(): string {
  const d = new Date();
  const day = (d.getUTCDay() + 6) % 7; // Monday = 0
  d.setUTCDate(d.getUTCDate() - day);
  return d.toISOString().slice(0, 10);
}

/**
 * Atomic weekly counter for a named feature (e.g. "pagespeed"), keyed by
 * uid, resetting every Monday UTC. Same transaction pattern as
 * checkAndIncrementFeatureUsage, just weekly instead of daily.
 */
export async function checkAndIncrementWeeklyFeatureUsage(
  uid: string,
  feature: string,
  limit: number
): Promise<DailyFeatureUsageResult> {
  const db = adminDb();
  const ref = db.collection("feature_usage_weekly").doc(`${uid}_${feature}`);
  const week = weekKey();

  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);

    let used = 0;
    if (snap.exists) {
      const data = snap.data()!;
      used = data.week === week ? (data.count as number) || 0 : 0;
    }

    if (used >= limit) {
      return { allowed: false, used, limit, remaining: 0 };
    }

    const nextUsed = used + 1;
    tx.set(ref, { week, count: nextUsed, updatedAt: FieldValue.serverTimestamp() }, { merge: true });

    return { allowed: true, used: nextUsed, limit, remaining: Math.max(0, limit - nextUsed) };
  });
}

export interface AnonUsageResult {
  allowed: boolean;
  used: number;
  limit: number;
  remaining: number;
}

/**
 * Atomic per-IP daily quota for visitors with no account at all.
 * Un-bypassable in the sense that matters here: it's enforced server-side
 * in a Firestore transaction keyed by a hashed IP, not by anything the
 * client controls (no cookie, no localStorage flag, no client-supplied
 * identifier) — clearing site data or opening a private window doesn't
 * reset it, only a genuinely different IP does.
 */
export async function checkAndIncrementAnonymousUsage(ipHash: string): Promise<AnonUsageResult> {
  const db = adminDb();
  const ref = db.collection("anon_usage").doc(ipHash);
  const today = todayKey();
  const limit = ANON_DAILY_LIMIT;

  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);

    let used = 0;
    if (snap.exists) {
      const data = snap.data()!;
      used = data.date === today ? (data.count as number) || 0 : 0;
    }

    if (used >= limit) {
      return { allowed: false, used, limit, remaining: 0 };
    }

    const nextUsed = used + 1;
    tx.set(ref, { date: today, count: nextUsed, updatedAt: FieldValue.serverTimestamp() }, { merge: true });

    return { allowed: true, used: nextUsed, limit, remaining: Math.max(0, limit - nextUsed) };
  });
}
