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

export interface PsiByokInfo {
  configured: boolean;
  maskedKey: string | null;
}

/**
 * Stores a user's own PageSpeed Insights (Google Cloud) API key, which
 * raises their own PSI quota instead of sharing Audityxe's key. Same
 * AES-256-GCM at-rest encryption as the AI BYOK key above.
 */
export async function savePsiByokKey(uid: string, apiKey: string): Promise<void> {
  const db = adminDb();
  await db
    .collection("users")
    .doc(uid)
    .set({ psiByok: { encryptedKey: encryptSecret(apiKey), updatedAt: new Date().toISOString() } }, { merge: true });
}

export async function removePsiByokKey(uid: string): Promise<void> {
  const db = adminDb();
  await db.collection("users").doc(uid).set({ psiByok: null }, { merge: true });
}

export interface CruxByokInfo {
  configured: boolean;
  maskedKey: string | null;
}

/**
 * Optional, separate Google Cloud API key used only for CrUX lookups.
 * Most people never set this — by default CrUX reuses the psiByok key
 * above (one Google Cloud API key serves both). This exists only for
 * people who explicitly want two distinct keys for PSI vs. CrUX.
 */
export async function saveCruxByokKey(uid: string, apiKey: string): Promise<void> {
  const db = adminDb();
  await db
    .collection("users")
    .doc(uid)
    .set({ cruxByok: { encryptedKey: encryptSecret(apiKey), updatedAt: new Date().toISOString() } }, { merge: true });
}

export async function removeCruxByokKey(uid: string): Promise<void> {
  const db = adminDb();
  await db.collection("users").doc(uid).set({ cruxByok: null }, { merge: true });
}

/** Server-internal only — returns the decrypted CrUX key, falling back
 * to the shared PSI key when no separate CrUX key was ever set. */
export async function getCruxByokCredentials(uid: string): Promise<string | null> {
  const db = adminDb();
  const snap = await db.collection("users").doc(uid).get();
  const cruxByok = snap.data()?.cruxByok;
  if (cruxByok?.encryptedKey) return decryptSecret(cruxByok.encryptedKey);
  const psiByok = snap.data()?.psiByok;
  if (!psiByok?.encryptedKey) return null;
  return decryptSecret(psiByok.encryptedKey);
}

/** Client-safe info for the Settings page — never includes the raw key. */
export async function getCruxByokInfo(uid: string): Promise<CruxByokInfo> {
  const db = adminDb();
  const snap = await db.collection("users").doc(uid).get();
  const cruxByok = snap.data()?.cruxByok;
  if (!cruxByok?.encryptedKey) return { configured: false, maskedKey: null };

  const apiKey = decryptSecret(cruxByok.encryptedKey);
  return { configured: true, maskedKey: apiKey ? maskKey(apiKey) : "****" };
}

/** Server-internal only — returns the decrypted PSI key. Never expose to the client. */
export async function getPsiByokCredentials(uid: string): Promise<string | null> {
  const db = adminDb();
  const snap = await db.collection("users").doc(uid).get();
  const psiByok = snap.data()?.psiByok;
  if (!psiByok?.encryptedKey) return null;
  return decryptSecret(psiByok.encryptedKey);
}

/** Client-safe info for the Settings page — never includes the raw key. */
export async function getPsiByokInfo(uid: string): Promise<PsiByokInfo> {
  const db = adminDb();
  const snap = await db.collection("users").doc(uid).get();
  const psiByok = snap.data()?.psiByok;
  if (!psiByok?.encryptedKey) return { configured: false, maskedKey: null };

  const apiKey = decryptSecret(psiByok.encryptedKey);
  return { configured: true, maskedKey: apiKey ? maskKey(apiKey) : "****" };
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
