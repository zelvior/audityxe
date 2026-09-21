import { randomBytes, createHash } from "crypto";
import { adminDb } from "./firebase/admin";
import { FieldValue, Timestamp, QueryDocumentSnapshot } from "firebase-admin/firestore";
import { getUserPlan } from "./rate-limit";

/**
 * Programmatic access to /api/audit used to be wide open: any request
 * without an Authorization header was simply treated as an anonymous
 * visitor (1 free audit/IP/day) with nothing stopping a script from
 * rotating IPs to bypass even that. There was no concept of a durable,
 * revocable credential at all.
 *
 * This module is the only way an API key gets created — issuance is a
 * one-way door that requires admin auth (see app/api/admin/api-keys),
 * never something a user can self-serve, and never something this
 * module hands out for a non-Pro account. The raw key is shown to the
 * admin exactly once at creation time (same pattern as GitHub/Stripe
 * keys); only its SHA-256 hash is ever persisted, so a Firestore leak
 * doesn't leak usable credentials.
 *
 * A key rides on its owner's *own* account limits (see
 * resolveApiKeyIdentity) rather than carrying its own separate quota —
 * that's the "linked to the account, uses the account's rate limits"
 * behavior that was asked for. If the owner's plan is ever downgraded
 * away from Pro (expiry, admin action, etc.) the key stops working
 * immediately without needing to be separately revoked, because plan
 * is re-checked live on every single request, never cached on the key
 * document itself.
 */

const KEY_PREFIX = "atx_live_";
const COLLECTION = "api_keys";

export interface ApiKeyDoc {
  id: string; // sha256 hash — also the Firestore doc id
  uid: string;
  email: string | null;
  label: string;
  keyPreview: string; // last 4 chars only, for admin display
  createdAt: string | null;
  createdBy: string; // admin email that issued it
  lastUsedAt: string | null;
  revoked: boolean;
  revokedAt: string | null;
}

export class ApiKeyError extends Error {}

function hashKey(rawKey: string): string {
  return createHash("sha256").update(rawKey, "utf8").digest("hex");
}

function generateRawKey(): string {
  return KEY_PREFIX + randomBytes(24).toString("base64url");
}

function tsToIso(v: unknown): string | null {
  if (v instanceof Timestamp) return v.toDate().toISOString();
  return null;
}

/** Admin-only: mint a new key for a given uid. Throws if the account
 * isn't currently on the Pro plan — a key is only ever issued to an
 * account that can actually use it. Returns the raw key ONCE; it is
 * never retrievable again after this call returns. */
export async function createApiKey(params: {
  uid: string;
  email: string | null;
  label: string;
  adminEmail: string;
}): Promise<{ rawKey: string; doc: ApiKeyDoc }> {
  const plan = await getUserPlan(params.uid);
  if (plan !== "pro") {
    throw new ApiKeyError("API keys can only be issued to accounts on the Pro plan.");
  }
  const label = (params.label || "").trim().slice(0, 80) || "Unnamed key";

  const rawKey = generateRawKey();
  const id = hashKey(rawKey);
  const db = adminDb();

  const doc = {
    uid: params.uid,
    email: params.email,
    label,
    keyPreview: rawKey.slice(-4),
    createdAt: FieldValue.serverTimestamp(),
    createdBy: params.adminEmail,
    lastUsedAt: null,
    revoked: false,
    revokedAt: null,
  };
  await db.collection(COLLECTION).doc(id).set(doc);

  return {
    rawKey,
    doc: {
      id,
      uid: params.uid,
      email: params.email,
      label,
      keyPreview: rawKey.slice(-4),
      createdAt: new Date().toISOString(),
      createdBy: params.adminEmail,
      lastUsedAt: null,
      revoked: false,
      revokedAt: null,
    },
  };
}

/** Admin-only: full key list, hashes/raw keys never included. */
export async function listApiKeys(): Promise<ApiKeyDoc[]> {
  const db = adminDb();
  const snap = await db.collection(COLLECTION).orderBy("createdAt", "desc").limit(500).get();
  return snap.docs.map((d: QueryDocumentSnapshot) => {
    const data = d.data();
    return {
      id: d.id,
      uid: data.uid,
      email: data.email ?? null,
      label: data.label,
      keyPreview: data.keyPreview,
      createdAt: tsToIso(data.createdAt),
      createdBy: data.createdBy,
      lastUsedAt: tsToIso(data.lastUsedAt),
      revoked: !!data.revoked,
      revokedAt: tsToIso(data.revokedAt),
    };
  });
}

/** Admin-only: permanently disable a key. Irreversible by design —
 * issuing a fresh key is cheap, silently un-revoking a leaked one is
 * the kind of mistake this doesn't allow. */
export async function revokeApiKey(id: string): Promise<void> {
  const db = adminDb();
  const ref = db.collection(COLLECTION).doc(id);
  const snap = await ref.get();
  if (!snap.exists) throw new ApiKeyError("Key not found.");
  await ref.update({ revoked: true, revokedAt: FieldValue.serverTimestamp() });
}

export interface ResolvedApiKeyIdentity {
  uid: string;
  email: string | null;
}

/** Called on every /api/audit request carrying an `x-api-key` header.
 * Validates the key, confirms the owning account is still Pro right
 * now (not just at issuance time), and records last-used — all in one
 * lookup so a revoked or downgraded key fails closed rather than open. */
export async function resolveApiKeyIdentity(rawKey: string): Promise<ResolvedApiKeyIdentity> {
  if (!rawKey || !rawKey.startsWith(KEY_PREFIX)) {
    throw new ApiKeyError("Invalid API key.");
  }
  const id = hashKey(rawKey);
  const db = adminDb();
  const ref = db.collection(COLLECTION).doc(id);
  const snap = await ref.get();
  if (!snap.exists) throw new ApiKeyError("Invalid API key.");

  const data = snap.data() as { uid: string; email: string | null; revoked: boolean };
  if (data.revoked) throw new ApiKeyError("This API key has been revoked.");

  const plan = await getUserPlan(data.uid);
  if (plan !== "pro") {
    throw new ApiKeyError("This API key's account is no longer on the Pro plan.");
  }

  ref.update({ lastUsedAt: FieldValue.serverTimestamp() }).catch(() => {
    // Best-effort telemetry only — never block or fail the request over it.
  });

  return { uid: data.uid, email: data.email ?? null };
}
