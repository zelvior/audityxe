import { adminDb } from "./firebase/admin";
import { encryptSecret, decryptSecret, maskKey } from "./crypto";

export async function updateDisplayNameOnRecord(uid: string, displayName: string | null): Promise<void> {
  const db = adminDb();
  await db.collection("users").doc(uid).set({ displayName }, { merge: true });
}

export interface ByokInfo {
  configured: boolean;
  maskedKey: string | null;
  baseUrl: string | null;
  model: string | null;
}

/**
 * Stores a user's own AI API key for promo-copy generation (Pro-only
 * feature — see /pricing). The key is encrypted before being written to
 * Firestore (see lib/crypto.ts) and is never sent back to the client in
 * full — only a masked last-4 preview.
 */
export async function saveByokKey(
  uid: string,
  apiKey: string,
  baseUrl?: string | null,
  model?: string | null
): Promise<void> {
  const db = adminDb();
  await db
    .collection("users")
    .doc(uid)
    .set(
      {
        byok: {
          encryptedKey: encryptSecret(apiKey),
          baseUrl: baseUrl?.trim() || null,
          model: model?.trim() || null,
          updatedAt: new Date().toISOString(),
        },
      },
      { merge: true }
    );
}

export async function removeByokKey(uid: string): Promise<void> {
  const db = adminDb();
  await db.collection("users").doc(uid).set({ byok: null }, { merge: true });
}

/** Server-internal only — returns the decrypted key for making an AI
 * call on the user's behalf. Never expose this value to the client. */
export async function getByokCredentials(
  uid: string
): Promise<{ apiKey: string; baseUrl: string | null; model: string | null } | null> {
  const db = adminDb();
  const snap = await db.collection("users").doc(uid).get();
  const byok = snap.data()?.byok;
  if (!byok?.encryptedKey) return null;

  const apiKey = decryptSecret(byok.encryptedKey);
  if (!apiKey) return null;

  return { apiKey, baseUrl: byok.baseUrl || null, model: byok.model || null };
}

/** Client-safe info for the Settings page — never includes the raw key. */
export async function getByokInfo(uid: string): Promise<ByokInfo> {
  const db = adminDb();
  const snap = await db.collection("users").doc(uid).get();
  const byok = snap.data()?.byok;
  if (!byok?.encryptedKey) {
    return { configured: false, maskedKey: null, baseUrl: null, model: null };
  }

  const apiKey = decryptSecret(byok.encryptedKey);
  return {
    configured: true,
    maskedKey: apiKey ? maskKey(apiKey) : "****",
    baseUrl: byok.baseUrl || null,
    model: byok.model || null,
  };
}

/**
 * Deletes all of an account's server-side data: the users/{uid} doc and
 * usage/{uid} doc. Does NOT delete the Firebase Auth account itself —
 * that's done client-side (auth.currentUser must still be a valid,
 * recently-authenticated session to call deleteUser(), which only works
 * from the client SDK). Call this first, then delete the Auth account,
 * so a failure here never leaves an Auth account with no way to reach
 * its own data.
 */
export async function deleteAllUserData(uid: string): Promise<void> {
  const db = adminDb();
  await Promise.all([db.collection("users").doc(uid).delete(), db.collection("usage").doc(uid).delete()]);
}
