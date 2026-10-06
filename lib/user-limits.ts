import { adminDb } from "./firebase/admin";

/**
 * Per-user overrides an admin can set from the panel, stored on users/{uid}.limits:
 *   dailyAudits — replaces the plan's daily audit quota for this user
 *   perMinute   — replaces the per-minute request limit on audit/bulk
 * Absent/null = "use the plan / system default".
 */
export interface UserLimits {
  dailyAudits: number | null;
  perMinute: number | null;
  note: string | null;
  updatedAt: string | null;
  updatedBy: string | null;
}

export const LIMIT_BOUNDS = { dailyAudits: { min: 0, max: 1_000_000 }, perMinute: { min: 1, max: 10_000 } } as const;
export const NO_LIMITS: UserLimits = { dailyAudits: null, perMinute: null, note: null, updatedAt: null, updatedBy: null };

const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);

/** Reads limits from a raw users/{uid} document, tolerating anything malformed. */
export function normalizeLimits(raw: unknown): UserLimits {
  if (!raw || typeof raw !== "object") return NO_LIMITS;
  const r = raw as Record<string, unknown>;
  const d = num(r.dailyAudits), m = num(r.perMinute);
  return {
    dailyAudits: d !== null && d >= LIMIT_BOUNDS.dailyAudits.min && d <= LIMIT_BOUNDS.dailyAudits.max ? Math.floor(d) : null,
    perMinute: m !== null && m >= LIMIT_BOUNDS.perMinute.min && m <= LIMIT_BOUNDS.perMinute.max ? Math.floor(m) : null,
    note: typeof r.note === "string" ? r.note.slice(0, 200) : null,
    updatedAt: typeof r.updatedAt === "string" ? r.updatedAt : null,
    updatedBy: typeof r.updatedBy === "string" ? r.updatedBy : null,
  };
}

/** Validates an admin edit. `null` clears an override; a number sets it. */
export function validateLimitsInput(input: { dailyAudits?: unknown; perMinute?: unknown; note?: unknown }): { ok: true; value: { dailyAudits: number | null; perMinute: number | null; note: string | null } } | { ok: false; error: string } {
  const one = (name: "dailyAudits" | "perMinute", v: unknown): number | null | { error: string } => {
    if (v === null || v === undefined || v === "") return null;
    const n = typeof v === "number" ? v : Number(v);
    const b = LIMIT_BOUNDS[name];
    if (!Number.isFinite(n) || !Number.isInteger(n)) return { error: `${name === "dailyAudits" ? "Daily quota" : "Per-minute limit"} must be a whole number.` };
    if (n < b.min || n > b.max) return { error: `${name === "dailyAudits" ? "Daily quota" : "Per-minute limit"} must be between ${b.min} and ${b.max.toLocaleString("en-US")}.` };
    return n;
  };
  const d = one("dailyAudits", input.dailyAudits);
  if (d && typeof d === "object") return { ok: false, error: d.error };
  const m = one("perMinute", input.perMinute);
  if (m && typeof m === "object") return { ok: false, error: m.error };
  const note = typeof input.note === "string" && input.note.trim() ? input.note.replace(/[\x00-\x1F\x7F]/g, " ").trim().slice(0, 200) : null;
  return { ok: true, value: { dailyAudits: d as number | null, perMinute: m as number | null, note } };
}

// Tiny per-instance cache so the rate-limit hot path doesn't add a Firestore
// read to every request. Invalidated on admin edits (same instance) and
// otherwise expires within TTL — a change reaches every instance within 30s.
const TTL_MS = 30_000;
const cache = new Map<string, { at: number; limits: UserLimits }>();

export function invalidateUserLimits(uid: string) { cache.delete(uid); }

export async function getUserLimits(uid: string, db: ReturnType<typeof adminDb> = adminDb()): Promise<UserLimits> {
  const hit = cache.get(uid);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.limits;
  try {
    const snap = await db.collection("users").doc(uid).get();
    const limits = normalizeLimits(snap.data()?.limits);
    if (cache.size > 2000) cache.clear();
    cache.set(uid, { at: Date.now(), limits });
    return limits;
  } catch {
    return NO_LIMITS; // never fail a request over a limits lookup
  }
}

export async function setUserLimits(uid: string, input: Parameters<typeof validateLimitsInput>[0], actor: string, db: ReturnType<typeof adminDb> = adminDb()): Promise<{ ok: true; limits: UserLimits } | { ok: false; error: string }> {
  const v = validateLimitsInput(input);
  if (!v.ok) return v;
  const { dailyAudits, perMinute, note } = v.value;
  const ref = db.collection("users").doc(uid);
  const snap = await ref.get();
  if (!snap.exists) return { ok: false, error: "That user has no profile document yet (they have never signed in with a verified email)." };
  if (dailyAudits === null && perMinute === null) {
    const { FieldValue } = await import("firebase-admin/firestore");
    await ref.update({ limits: FieldValue.delete() });
    invalidateUserLimits(uid);
    return { ok: true, limits: NO_LIMITS };
  }
  const limits: UserLimits = { dailyAudits, perMinute, note, updatedAt: new Date().toISOString(), updatedBy: actor };
  await ref.set({ limits }, { merge: true });
  invalidateUserLimits(uid);
  return { ok: true, limits };
}
