/**
 * Firestore data-retention policy model — dependency-free on purpose.
 *
 * This ONE file is shared by the Next.js app (admin API + fallback runner,
 * lib/retention.ts) and the Cloudflare Worker (cloudflare-worker/src), which
 * imports it by relative path, so the registry, defaults, validation and
 * cutoff maths can never drift between the two.
 *
 * Admin edits only `enabled` and `ttlDays` per policy; the collection, field
 * and field type come from REGISTRY below (never from user input), so the
 * admin panel can't be used to point a deletion at an arbitrary collection.
 */

export type RetentionFieldType = "timestamp" | "iso" | "date";

export interface RetentionPolicyDef {
  id: string;
  collection: string;
  /** Field compared against the cutoff. */
  field: string;
  /** timestamp = Firestore Timestamp, iso = ISO-8601 string, date = YYYY-MM-DD string. */
  fieldType: RetentionFieldType;
  label: string;
  description: string;
  defaultTtlDays: number;
  defaultEnabled: boolean;
  /** TTL can't be edited: the documents carry their own expiry (field = an
   * `expireAt` already in the future for live docs), so the rule is "delete
   * what has already expired". */
  locked?: boolean;
  /** Shown as a warning in the admin UI before enabling. */
  sensitive?: boolean;
  minTtlDays: number;
  maxTtlDays: number;
}

export const REGISTRY: readonly RetentionPolicyDef[] = [
  { id: "audits", collection: "audits", field: "createdAt", fieldType: "timestamp", label: "Audit history", description: "One row per audit run (Audit Management list). The biggest-growing collection.", defaultTtlDays: 90, defaultEnabled: true, minTtlDays: 1, maxTtlDays: 3650 },
  { id: "auditJobs", collection: "auditJobs", field: "createdAt", fieldType: "iso", label: "Background audit jobs", description: "Short-lived job + result documents for background audits.", defaultTtlDays: 1, defaultEnabled: true, minTtlDays: 0.25, maxTtlDays: 30 },
  { id: "adminAuditLog", collection: "admin_audit_log", field: "at", fieldType: "timestamp", label: "Admin action log", description: "Who did what in the admin panel.", defaultTtlDays: 365, defaultEnabled: true, minTtlDays: 30, maxTtlDays: 3650 },
  { id: "badgeScores", collection: "badge_scores", field: "auditedAt", fieldType: "timestamp", label: "Badge score cache", description: "Latest score per audited domain, used by embeddable badges. Re-created on the next audit.", defaultTtlDays: 365, defaultEnabled: true, minTtlDays: 30, maxTtlDays: 3650 },
  { id: "featureUsage", collection: "feature_usage", field: "date", fieldType: "date", label: "Feature usage counters", description: "Per-user, per-feature daily counters. Stale days are meaningless.", defaultTtlDays: 14, defaultEnabled: true, minTtlDays: 2, maxTtlDays: 365 },
  { id: "usage", collection: "usage", field: "date", fieldType: "date", label: "Daily audit counters", description: "Per-user daily audit counter. Resets every UTC day, so old rows are dead weight.", defaultTtlDays: 30, defaultEnabled: true, minTtlDays: 2, maxTtlDays: 365 },
  { id: "abuseEvents", collection: "abuse_events", field: "at", fieldType: "iso", label: "Abuse events", description: "Audit trail of abuse-protection decisions.", defaultTtlDays: 30, defaultEnabled: true, minTtlDays: 1, maxTtlDays: 365 },
  { id: "abuseDevices", collection: "abuse_devices", field: "lastSeen", fieldType: "iso", label: "Device graph — devices", description: "Browser/device records. Grows with every new visitor.", defaultTtlDays: 90, defaultEnabled: true, minTtlDays: 7, maxTtlDays: 730 },
  { id: "abuseIps", collection: "abuse_ips", field: "lastSeen", fieldType: "iso", label: "Device graph — networks", description: "Hashed-IP records.", defaultTtlDays: 30, defaultEnabled: true, minTtlDays: 7, maxTtlDays: 730 },
  { id: "abuseFp", collection: "abuse_fp", field: "lastSeen", fieldType: "iso", label: "Device graph — fingerprints", description: "Fingerprint-hash records.", defaultTtlDays: 90, defaultEnabled: true, minTtlDays: 7, maxTtlDays: 730 },
  { id: "abuseUid", collection: "abuse_uid", field: "lastSeen", fieldType: "iso", label: "Device graph — accounts", description: "Per-account device/network links.", defaultTtlDays: 180, defaultEnabled: true, minTtlDays: 7, maxTtlDays: 730 },
  { id: "abuseRl", collection: "abuse_rl", field: "expireAt", fieldType: "timestamp", label: "Rate-limit counters", description: "Fixed-window counters; each row carries its own expiry.", defaultTtlDays: 0, defaultEnabled: true, locked: true, minTtlDays: 0, maxTtlDays: 0 },
  { id: "abuseTrial", collection: "abuse_trial", field: "expireAt", fieldType: "timestamp", label: "Free-trial counters", description: "Device-bound daily trial counters; self-expiring.", defaultTtlDays: 0, defaultEnabled: true, locked: true, minTtlDays: 0, maxTtlDays: 0 },
  { id: "abuseBans", collection: "abuse_bans", field: "expireAt", fieldType: "timestamp", label: "Lapsed bans", description: "Expired automatic/temporary bans. Permanent bans have no expiry and are never touched.", defaultTtlDays: 0, defaultEnabled: true, locked: true, minTtlDays: 0, maxTtlDays: 0 },
  { id: "abuseStrikes", collection: "abuse_strikes", field: "expireAt", fieldType: "timestamp", label: "Strike counters", description: "Abuse strike points; self-expiring.", defaultTtlDays: 0, defaultEnabled: true, locked: true, minTtlDays: 0, maxTtlDays: 0 },
  { id: "cryptoPayments", collection: "crypto_payments", field: "updatedAt", fieldType: "iso", label: "Payment records", description: "Financial records and refund evidence. Keep them as long as your accounting/tax rules require.", defaultTtlDays: 2555, defaultEnabled: false, sensitive: true, minTtlDays: 365, maxTtlDays: 3650 },
] as const;

/** Auth cleanup isn't a Firestore collection; modelled alongside the registry. */
export const UNVERIFIED_USERS_DEFAULT = { enabled: true, ttlDays: 7, minTtlDays: 1, maxTtlDays: 90 } as const;

/** Collections retention may NEVER touch, even if a registry edit is botched. */
export const PROTECTED_COLLECTIONS: readonly string[] = ["users", "config", "site_config", "redeemCodes", "redemptions", "showcase_submissions", "subscription_owners", "counters", "dailyStats", "pushSubscriptions"];

export interface StoredPolicy {
  enabled?: boolean;
  ttlDays?: number;
}
export interface StoredRetention {
  policies?: Record<string, StoredPolicy>;
  unverifiedUsers?: StoredPolicy;
  updatedAt?: string;
  updatedBy?: string;
}

export interface EffectivePolicy extends RetentionPolicyDef {
  enabled: boolean;
  ttlDays: number;
}

export interface EffectiveRetention {
  policies: EffectivePolicy[];
  unverifiedUsers: { enabled: boolean; ttlDays: number };
}

function clampNum(v: unknown, min: number, max: number, fallback: number): number {
  const n = typeof v === "number" ? v : typeof v === "string" && v.trim() !== "" ? Number(v) : NaN;
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

/** Registry defaults overlaid with whatever the admin stored; anything
 * missing, malformed, or out of range falls back / clamps. Never throws. */
export function resolveRetention(stored: StoredRetention | null | undefined): EffectiveRetention {
  const s = stored?.policies && typeof stored.policies === "object" ? stored.policies : {};
  const policies = REGISTRY.map((def): EffectivePolicy => {
    const sp = s[def.id] || {};
    const enabled = typeof sp.enabled === "boolean" ? sp.enabled : def.defaultEnabled;
    const ttlDays = def.locked ? 0 : clampNum(sp.ttlDays, def.minTtlDays, def.maxTtlDays, def.defaultTtlDays);
    return { ...def, enabled, ttlDays };
  }).filter((p) => !PROTECTED_COLLECTIONS.includes(p.collection));
  const u = stored?.unverifiedUsers || {};
  return {
    policies,
    unverifiedUsers: {
      enabled: typeof u.enabled === "boolean" ? u.enabled : UNVERIFIED_USERS_DEFAULT.enabled,
      ttlDays: clampNum(u.ttlDays, UNVERIFIED_USERS_DEFAULT.minTtlDays, UNVERIFIED_USERS_DEFAULT.maxTtlDays, UNVERIFIED_USERS_DEFAULT.ttlDays),
    },
  };
}

export interface RetentionUpdate {
  policies?: Record<string, { enabled?: unknown; ttlDays?: unknown }>;
  unverifiedUsers?: { enabled?: unknown; ttlDays?: unknown };
}

/** Validates an admin edit against the registry and returns what to store.
 * Unknown policy ids are rejected (not silently ignored) so a typo can't
 * look like it worked. */
export function validateRetentionUpdate(update: RetentionUpdate, current: StoredRetention | null | undefined): { ok: true; value: StoredRetention } | { ok: false; error: string } {
  const next: StoredRetention = { policies: { ...(current?.policies || {}) }, unverifiedUsers: { ...(current?.unverifiedUsers || {}) } };
  for (const [id, edit] of Object.entries(update.policies || {})) {
    const def = REGISTRY.find((d) => d.id === id);
    if (!def) return { ok: false, error: `Unknown retention policy "${id}".` };
    if (PROTECTED_COLLECTIONS.includes(def.collection)) return { ok: false, error: `"${id}" is protected.` };
    const cur = { ...(next.policies![id] || {}) };
    if (edit.enabled !== undefined) {
      if (typeof edit.enabled !== "boolean") return { ok: false, error: `"${id}": enabled must be true or false.` };
      cur.enabled = edit.enabled;
    }
    if (edit.ttlDays !== undefined) {
      if (def.locked) return { ok: false, error: `"${id}" expires on its own schedule and its TTL can't be changed.` };
      const n = typeof edit.ttlDays === "number" ? edit.ttlDays : Number(edit.ttlDays);
      if (!Number.isFinite(n)) return { ok: false, error: `"${id}": retention days must be a number.` };
      if (n < def.minTtlDays || n > def.maxTtlDays) return { ok: false, error: `"${id}": retention must be between ${def.minTtlDays} and ${def.maxTtlDays} days.` };
      cur.ttlDays = n;
    }
    next.policies![id] = cur;
  }
  const u = update.unverifiedUsers;
  if (u) {
    const cur = { ...(next.unverifiedUsers || {}) };
    if (u.enabled !== undefined) {
      if (typeof u.enabled !== "boolean") return { ok: false, error: "Unverified users: enabled must be true or false." };
      cur.enabled = u.enabled;
    }
    if (u.ttlDays !== undefined) {
      const n = typeof u.ttlDays === "number" ? u.ttlDays : Number(u.ttlDays);
      if (!Number.isFinite(n) || n < UNVERIFIED_USERS_DEFAULT.minTtlDays || n > UNVERIFIED_USERS_DEFAULT.maxTtlDays)
        return { ok: false, error: `Unverified users: days must be between ${UNVERIFIED_USERS_DEFAULT.minTtlDays} and ${UNVERIFIED_USERS_DEFAULT.maxTtlDays}.` };
      cur.ttlDays = n;
    }
    next.unverifiedUsers = cur;
  }
  return { ok: true, value: next };
}

/** The value to compare the policy field against, in that field's own type. */
export function cutoffFor(policy: Pick<EffectivePolicy, "fieldType" | "ttlDays">, now: Date = new Date()): string {
  const cutoff = new Date(now.getTime() - policy.ttlDays * 86_400_000);
  return policy.fieldType === "date" ? cutoff.toISOString().slice(0, 10) : cutoff.toISOString();
}

export interface RetentionRunSummary {
  ranAt: string;
  source: "worker" | "app";
  results: Record<string, { ok: boolean; deleted?: number; skipped?: string; error?: string }>;
}
