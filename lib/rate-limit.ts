import { adminDb } from "./firebase/admin";
import { DEFAULT_PLAN, PlanId, planLimit } from "./plans";
import { FieldValue, Timestamp } from "firebase-admin/firestore";

function todayKey(): string {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD (UTC)
}

export interface DecodedIdentity {
  uid: string;
  email: string | null;
}

/**
 * Ensures a users/{uid} document exists (first-login bootstrap). Never
 * downgrades an existing plan — safe to call on every authenticated
 * request.
 */
export async function ensureUserDoc(identity: DecodedIdentity, displayName?: string | null): Promise<void> {
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
