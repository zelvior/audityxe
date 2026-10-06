import { adminAuth, adminDb } from "./firebase/admin";
import { paginate, toIso, prefixRange, type Page, type WhereClause } from "./admin-paginate";
import { moderationFromUserData, type ModerationInfo } from "./user-moderation";
import { effectivePlan } from "./rate-limit";
import { planLimit } from "./plans";
import { normalizeLimits, type UserLimits } from "./user-limits";

type AnyDb = any;

export interface AdminUserRow {
  uid: string;
  email: string | null;
  displayName: string | null;
  plan: string;
  planExpiresAt: string | null;
  moderation: ModerationInfo;
  createdAt: string | null;
  lastActiveAt: string | null;
  limits: UserLimits | null;
}

export function toRow(uid: string, d: Record<string, unknown>): AdminUserRow {
  const { plan, expiresAt } = effectivePlan(d);
  const limits = normalizeLimits(d.limits);
  const hasLimits = limits.dailyAudits !== null || limits.perMinute !== null;
  return {
    uid,
    email: (d.email as string) || null,
    displayName: (d.displayName as string) || null,
    plan,
    planExpiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
    moderation: moderationFromUserData(d),
    createdAt: toIso(d.createdAt),
    lastActiveAt: toIso(d.lastActiveAt),
    limits: hasLimits ? limits : null,
  };
}

export interface UserListQuery {
  q?: string;
  plan?: "free" | "standard" | "pro" | "";
  status?: "active" | "suspended" | "banned" | "";
  cursor?: string | null;
  limit?: number;
}

const UID_LIKE = /^[A-Za-z0-9]{20,40}$/;

/**
 * Lists users without ever scanning the collection.
 *  - no query   → cursor pages, newest first (optionally filtered by plan / status)
 *  - uid        → one direct document read
 *  - email      → indexed prefix range
 *  - name       → indexed prefix range on displayNameLower (+ email prefix), merged
 * Every path reads a bounded number of documents regardless of user count.
 */
export async function listUsersPage(db: AnyDb, query: UserListQuery): Promise<Page<AdminUserRow> & { mode: "browse" | "search" }> {
  const limit = Math.min(Math.max(1, query.limit || 50), 200);
  const filters: WhereClause[] = [];
  if (query.plan) filters.push(["plan", "==", query.plan]);
  if (query.status === "active") filters.push(["moderation.status", "==", "active"]);
  else if (query.status === "suspended" || query.status === "banned") filters.push(["moderation.status", "==", query.status]);
  const map = (id: string, d: Record<string, unknown>) => toRow(id, d);
  const q = (query.q || "").trim();

  if (!q) {
    const page = await paginate<AdminUserRow>(db, { collection: "users", orderField: "createdAt", direction: "desc", where: filters, limit, cursor: query.cursor, map });
    return { ...page, mode: "browse" };
  }

  if (UID_LIKE.test(q)) {
    const snap = await db.collection("users").doc(q).get();
    return { items: snap.exists ? [toRow(snap.id, snap.data())] : [], nextCursor: null, degraded: false, mode: "search" };
  }

  const lower = q.toLowerCase();
  const byEmail = paginate<AdminUserRow>(db, { collection: "users", orderField: "email", direction: "asc", where: [["email", ">=", prefixRange(lower)[0]], ["email", "<=", prefixRange(lower)[1]], ...filters], limit, map });
  const byName = q.includes("@")
    ? Promise.resolve<Page<AdminUserRow>>({ items: [], nextCursor: null, degraded: false })
    : paginate<AdminUserRow>(db, { collection: "users", orderField: "displayNameLower", direction: "asc", where: [["displayNameLower", ">=", prefixRange(lower)[0]], ["displayNameLower", "<=", prefixRange(lower)[1]], ...filters], limit, map });
  const [a, b] = await Promise.all([byEmail, byName]);
  const merged = new Map<string, AdminUserRow>();
  for (const r of [...a.items, ...b.items]) merged.set(r.uid, r);
  return { items: Array.from(merged.values()).slice(0, limit), nextCursor: null, degraded: a.degraded || b.degraded, mode: "search" };
}

export async function countUsers(db: AnyDb = adminDb()): Promise<number> {
  return (await db.collection("users").count().get()).data().count;
}

export interface AdminUserDetail extends AdminUserRow {
  usage: { date: string | null; used: number; limit: number };
  auth: { emailVerified: boolean; disabled: boolean; providers: string[]; lastSignInTime: string | null; creationTime: string | null } | null;
  auditCount: number | null;
  recentPayments: { id: string; plan: string; amountUsd: number; status: string; at: string | null }[];
}

export async function getUserDetail(uid: string, db: AnyDb = adminDb()): Promise<AdminUserDetail | null> {
  const [userSnap, usageSnap, authUser, auditCount, pays] = await Promise.all([
    db.collection("users").doc(uid).get(),
    db.collection("usage").doc(uid).get(),
    adminAuth().getUser(uid).catch(() => null),
    db.collection("audits").where("uid", "==", uid).count().get().then((s: { data(): { count: number } }) => s.data().count).catch(() => null),
    db.collection("crypto_payments").where("uid", "==", uid).limit(5).get().catch(() => ({ docs: [] })),
  ]);
  if (!userSnap.exists && !authUser) return null;
  const data = userSnap.exists ? userSnap.data() : { email: authUser?.email || null };
  const row = toRow(uid, data);
  const today = new Date().toISOString().slice(0, 10);
  const u = usageSnap.exists ? usageSnap.data() : null;
  return {
    ...row,
    email: row.email || authUser?.email || null,
    usage: { date: u?.date ?? null, used: u?.date === today ? u.count || 0 : 0, limit: row.limits?.dailyAudits ?? planLimit(row.plan as "free" | "standard" | "pro") },
    auth: authUser
      ? {
          emailVerified: authUser.emailVerified,
          disabled: authUser.disabled,
          providers: authUser.providerData.map((p) => p.providerId),
          lastSignInTime: authUser.metadata.lastSignInTime || null,
          creationTime: authUser.metadata.creationTime || null,
        }
      : null,
    auditCount,
    recentPayments: pays.docs.map((p: { id: string; data(): Record<string, unknown> }) => {
      const d = p.data();
      return { id: p.id, plan: String(d.plan || ""), amountUsd: Number(d.amountUsd) || 0, status: String(d.status || (d.credited ? "paid" : "unknown")), at: toIso(d.updatedAt) || toIso(d.creditedAt) };
    }),
  };
}
