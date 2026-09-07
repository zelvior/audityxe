import { adminDb, adminAuth } from "./firebase/admin";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { PlanId } from "./plans";

export type ModerationStatus = "active" | "suspended" | "banned";

export interface ModerationInfo {
  status: ModerationStatus;
  reason: string | null;
  until: string | null; // suspension end date, ISO — null for permanent ban / active
  actedAt: string | null;
  actedByEmail: string | null;
}

const EMPTY: ModerationInfo = { status: "active", reason: null, until: null, actedAt: null, actedByEmail: null };

function sanitizeReason(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const cleaned = raw.replace(/[\x00-\x1F\x7F]/g, "").trim().slice(0, 300);
  return cleaned || null;
}

/** Reads the current moderation state for a uid. Never throws — an
 * unreadable/missing doc is treated as "active" so a Firestore hiccup
 * never accidentally locks someone in or out. */
export function moderationFromUserData(data: FirebaseFirestore.DocumentData | undefined): ModerationInfo {
  if (!data?.moderation) return EMPTY;
  const m = data.moderation;
  const status: ModerationStatus = ["active", "suspended", "banned"].includes(m.status) ? m.status : "active";
  const until: Date | null = m.until instanceof Timestamp ? m.until.toDate() : m.until ? new Date(m.until) : null;

  // A suspension that has run past its end date is no longer in effect —
  // checked at read time, same pattern as plan expiry, no background job.
  if (status === "suspended" && until && until.getTime() < Date.now()) {
    return EMPTY;
  }

  return {
    status,
    reason: m.reason || null,
    until: until ? until.toISOString() : null,
    actedAt: m.actedAt instanceof Timestamp ? m.actedAt.toDate().toISOString() : m.actedAt || null,
    actedByEmail: m.actedByEmail || null,
  };
}

export async function getModerationStatus(uid: string): Promise<ModerationInfo> {
  const db = adminDb();
  const snap = await db.collection("users").doc(uid).get();
  return moderationFromUserData(snap.data());
}

async function findUidByEmail(uidOrEmail: string): Promise<string> {
  if (!uidOrEmail.includes("@")) return uidOrEmail;
  const user = await adminAuth().getUserByEmail(uidOrEmail);
  return user.uid;
}

export async function banUser(uidOrEmail: string, reason: string, actedByEmail: string): Promise<void> {
  const uid = await findUidByEmail(uidOrEmail);
  const db = adminDb();
  await db.collection("users").doc(uid).set(
    {
      moderation: {
        status: "banned",
        reason: sanitizeReason(reason),
        until: null,
        actedAt: FieldValue.serverTimestamp(),
        actedByEmail,
      },
    },
    { merge: true }
  );
  // Also disable the Firebase Auth account itself so even a cached/valid
  // ID token stops being mintable via refresh, not just blocked at the
  // API layer.
  await adminAuth().updateUser(uid, { disabled: true }).catch(() => {});
}

export async function suspendUser(
  uidOrEmail: string,
  untilIso: string,
  reason: string,
  actedByEmail: string
): Promise<void> {
  const parsed = new Date(untilIso);
  if (isNaN(parsed.getTime()) || parsed.getTime() <= Date.now()) {
    throw new Error("Suspension end date must be a valid date in the future.");
  }
  const uid = await findUidByEmail(uidOrEmail);
  const db = adminDb();
  await db.collection("users").doc(uid).set(
    {
      moderation: {
        status: "suspended",
        reason: sanitizeReason(reason),
        until: parsed.toISOString(),
        actedAt: FieldValue.serverTimestamp(),
        actedByEmail,
      },
    },
    { merge: true }
  );
}

export async function unbanUser(uidOrEmail: string, actedByEmail: string): Promise<void> {
  const uid = await findUidByEmail(uidOrEmail);
  const db = adminDb();
  await db.collection("users").doc(uid).set(
    {
      moderation: {
        status: "active",
        reason: null,
        until: null,
        actedAt: FieldValue.serverTimestamp(),
        actedByEmail,
      },
    },
    { merge: true }
  );
  await adminAuth().updateUser(uid, { disabled: false }).catch(() => {});
}

/** Admin override: directly set a user's plan and expiry (or grant
 * permanent access with expiresAt = null), independent of the discount
 * code system — for comps, refunds, manual approvals, etc. */
export async function adminSetUserPlan(uid: string, plan: PlanId, expiresAt: string | null): Promise<void> {
  if (!["free", "standard", "pro"].includes(plan)) throw new Error("Invalid plan.");
  let normalizedExpiry: string | null = null;
  if (expiresAt) {
    const parsed = new Date(expiresAt);
    if (isNaN(parsed.getTime())) throw new Error("Invalid expiry date.");
    normalizedExpiry = parsed.toISOString();
  }
  const db = adminDb();
  await db.collection("users").doc(uid).set({ plan, planExpiresAt: normalizedExpiry }, { merge: true });
}

/** Zeroes out today's usage counter so a user isn't stuck rate-limited
 * for the rest of the day — useful after a false-positive block or a
 * support request. */
export async function adminResetUsage(uid: string): Promise<void> {
  const db = adminDb();
  await db.collection("usage").doc(uid).set({ date: todayKey(), count: 0, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
}

export interface AdminStats {
  totalUsers: number;
  byPlan: Record<PlanId, number>;
  banned: number;
  suspended: number;
  discountCodes: { total: number; active: number; totalRedemptions: number };
}

/** Bounded aggregate overview for the admin dashboard. Scans up to 2,000
 * user docs — fine at this app's current scale; if the collection grows
 * well past that, swap this for precomputed counters instead of raising
 * the cap. */
export async function getAdminStats(): Promise<AdminStats> {
  const db = adminDb();
  const [usersSnap, codesSnap] = await Promise.all([
    db.collection("users").limit(2000).get(),
    db.collection("discountCodes").get(),
  ]);

  const byPlan: Record<PlanId, number> = { free: 0, standard: 0, pro: 0 };
  let banned = 0;
  let suspended = 0;
  for (const doc of usersSnap.docs) {
    const data = doc.data();
    const plan: PlanId = ["free", "standard", "pro"].includes(data.plan) ? data.plan : "free";
    byPlan[plan] = (byPlan[plan] || 0) + 1;
    const mod = moderationFromUserData(data);
    if (mod.status === "banned") banned++;
    if (mod.status === "suspended") suspended++;
  }

  let activeCodes = 0;
  let totalRedemptions = 0;
  for (const doc of codesSnap.docs) {
    const data = doc.data();
    if (data.active !== false) activeCodes++;
    totalRedemptions += typeof data.redemptions === "number" ? data.redemptions : 0;
  }

  return {
    totalUsers: usersSnap.size,
    byPlan,
    banned,
    suspended,
    discountCodes: { total: codesSnap.size, active: activeCodes, totalRedemptions },
  };
}

export interface UserListItem {
  uid: string;
  email: string | null;
  displayName: string | null;
  plan: string;
  moderation: ModerationInfo;
  createdAt: string | null;
}

/** Lists users for the admin panel. Firestore doesn't support arbitrary
 * substring search, so this fetches a bounded page ordered by creation
 * and filters client-side by email/uid prefix when a query is given —
 * fine at this app's scale, and never exposes more than `limit` docs
 * per call regardless of how big the collection is. */
export async function listUsersForAdmin(query: string, limit = 50): Promise<UserListItem[]> {
  const db = adminDb();
  const cappedLimit = Math.min(Math.max(1, limit), 100);
  const snap = await db.collection("users").orderBy("createdAt", "desc").limit(500).get();

  const q = query.trim().toLowerCase();
  const items: UserListItem[] = [];
  for (const doc of snap.docs) {
    const data = doc.data();
    const email: string | null = data.email || null;
    if (q && !(email?.toLowerCase().includes(q) || doc.id.toLowerCase().includes(q))) continue;
    items.push({
      uid: doc.id,
      email,
      displayName: data.displayName || null,
      plan: data.plan || "free",
      moderation: moderationFromUserData(data),
      createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : data.createdAt || null,
    });
    if (items.length >= cappedLimit) break;
  }
  return items;
}
