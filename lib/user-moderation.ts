import { adminDb, adminAuth } from "./firebase/admin";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { PlanId, PLANS } from "./plans";
import { getGlobalCounters, getDailyStats, DailyStatPoint } from "./counters";
import { getAuditCounts } from "./audit-log";
import { bloomMightContain, normalizeToken } from "./bloom-filter";

function todayKey(): string {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD (UTC) — matches lib/rate-limit.ts
}

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
  redeemCodes: { total: number; active: number; totalRedemptions: number };
  newUsersToday: number;
  newUsersThisWeek: number;
  newUsersThisMonth: number;
  activeUsers: number;
  paidUsers: number;
  estimatedMrrCents: number;
  totalAudits: number;
  failedAudits: number;
  rateLimitHits: number;
  dailyStats: DailyStatPoint[];
  retention: { collection: string; suggestedTtlDays: number; note: string }[];
}

/**
 * Fully aggregation-based — every count below is a server-side
 * `count()` (or `where().count()`) query, which Firestore answers
 * without reading a single document. That's what makes this safe at
 * millions of users: the cost of this endpoint is O(number of queries),
 * never O(number of users).
 */
export async function getAdminStats(): Promise<AdminStats> {
  const db = adminDb();
  const users = db.collection("users");

  const now = new Date();
  const startOfDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const startOfWeek = new Date(startOfDay);
  startOfWeek.setUTCDate(startOfWeek.getUTCDate() - ((startOfWeek.getUTCDay() + 6) % 7)); // Monday
  const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const active30dCutoff = Timestamp.fromDate(new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000));

  const [
    totalSnap,
    freeSnap,
    standardSnap,
    proSnap,
    bannedSnap,
    suspendedSnap,
    todaySnap,
    weekSnap,
    monthSnap,
    activeSnap,
    codesSnap,
    counters,
    auditCounts,
    dailyStats,
  ] = await Promise.all([
    users.count().get(),
    users.where("plan", "==", "free").count().get(),
    users.where("plan", "==", "standard").count().get(),
    users.where("plan", "==", "pro").count().get(),
    users.where("moderation.status", "==", "banned").count().get(),
    users.where("moderation.status", "==", "suspended").count().get(),
    users.where("createdAt", ">=", Timestamp.fromDate(startOfDay)).count().get(),
    users.where("createdAt", ">=", Timestamp.fromDate(startOfWeek)).count().get(),
    users.where("createdAt", ">=", Timestamp.fromDate(startOfMonth)).count().get(),
    users.where("lastActiveAt", ">=", active30dCutoff).count().get(),
    db.collection("redeemCodes").get(),
    getGlobalCounters(),
    getAuditCounts(),
    getDailyStats(14),
  ]);

  let activeCodes = 0;
  let totalRedemptions = 0;
  for (const doc of codesSnap.docs) {
    const data = doc.data();
    if (data.active !== false) activeCodes++;
    totalRedemptions += typeof data.redemptions === "number" ? data.redemptions : 0;
  }

  const standardCount = standardSnap.data().count;
  const proCount = proSnap.data().count;
  const estimatedMrrCents = Math.round(
    (standardCount * PLANS.standard.priceUsd + proCount * PLANS.pro.priceUsd) * 100
  );

  return {
    totalUsers: totalSnap.data().count,
    byPlan: { free: freeSnap.data().count, standard: standardCount, pro: proCount },
    banned: bannedSnap.data().count,
    suspended: suspendedSnap.data().count,
    redeemCodes: { total: codesSnap.size, active: activeCodes, totalRedemptions },
    newUsersToday: todaySnap.data().count,
    newUsersThisWeek: weekSnap.data().count,
    newUsersThisMonth: monthSnap.data().count,
    activeUsers: activeSnap.data().count,
    paidUsers: standardCount + proCount,
    estimatedMrrCents,
    totalAudits: auditCounts.total,
    failedAudits: auditCounts.failed,
    rateLimitHits: counters.rateLimitHitsAllTime,
    dailyStats,
    retention: [
      { collection: "usage / anon_usage", suggestedTtlDays: 2, note: "Daily rate-limit counters — safe to purge after the day rolls over." },
      { collection: "feature_usage", suggestedTtlDays: 8, note: "Weekly feature counters (e.g. PageSpeed) — safe to purge after ~1 week." },
      { collection: "admin_password_attempts", suggestedTtlDays: 1, note: "Hourly brute-force budget — safe to purge after 24h." },
      { collection: "audits", suggestedTtlDays: 90, note: "Audit history log — keep for trend charts / support, prune beyond 90 days." },
      { collection: "search_index", suggestedTtlDays: -1, note: "Bloom filter bitset — never expires, rebuilt incrementally." },
    ],
  };
}

/** Bloom-filter-accelerated admin search by exact email or UID: a
 * near-zero-cost membership test against a fixed-size bitset rules out
 * the overwhelming majority of misses without touching Firestore at all;
 * a "maybe" then does one indexed point/where lookup to confirm. Falls
 * back to the existing prefix scan (listUsersForAdmin) for partial-name
 * search, since Bloom filters only support exact-token membership. */
export async function searchUsersBloom(query: string): Promise<UserListItem[]> {
  const q = normalizeToken(query);
  if (!q) return [];
  const db = adminDb();

  const results: UserListItem[] = [];
  const seen = new Set<string>();

  const pushDoc = (doc: FirebaseFirestore.QueryDocumentSnapshot | FirebaseFirestore.DocumentSnapshot) => {
    if (!doc.exists || seen.has(doc.id)) return;
    seen.add(doc.id);
    const data = doc.data()!;
    results.push({
      uid: doc.id,
      email: data.email || null,
      displayName: data.displayName || null,
      plan: data.plan || "free",
      moderation: moderationFromUserData(data),
      createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : data.createdAt || null,
    });
  };

  // Looks like a UID (no @, no spaces) — try a direct doc get first.
  if (!q.includes("@") && !q.includes(" ")) {
    const byId = await db.collection("users").doc(query.trim()).get();
    if (byId.exists) pushDoc(byId);
  }

  const mightExist = await bloomMightContain(q);
  if (mightExist && q.includes("@")) {
    const snap = await db.collection("users").where("email", "==", q).limit(5).get();
    snap.docs.forEach(pushDoc);
  }

  return results;
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
