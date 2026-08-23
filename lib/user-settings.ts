import { adminDb } from "./firebase/admin";
import { Tone } from "./types";

export interface UserPreferences {
  defaultTone: Tone;
}

const DEFAULT_PREFERENCES: UserPreferences = { defaultTone: "constructive" };

export async function getUserPreferences(uid: string): Promise<UserPreferences> {
  const db = adminDb();
  const snap = await db.collection("users").doc(uid).get();
  const data = snap.data();
  const defaultTone: Tone = data?.defaultTone === "brutal" ? "brutal" : "constructive";
  return { defaultTone };
}

export async function updateUserPreferences(uid: string, prefs: Partial<UserPreferences>): Promise<void> {
  const db = adminDb();
  const update: Record<string, unknown> = {};
  if (prefs.defaultTone === "constructive" || prefs.defaultTone === "brutal") {
    update.defaultTone = prefs.defaultTone;
  }
  if (Object.keys(update).length === 0) return;
  await db.collection("users").doc(uid).set(update, { merge: true });
}

export async function updateDisplayNameOnRecord(uid: string, displayName: string | null): Promise<void> {
  const db = adminDb();
  await db.collection("users").doc(uid).set({ displayName }, { merge: true });
}

/**
 * Deletes all of an account's server-side data: the users/{uid} doc,
 * usage/{uid} doc, and every reports/{id} doc owned by that uid. Does
 * NOT delete the Firebase Auth account itself — that's done client-side
 * (auth.currentUser must still be a valid, recently-authenticated
 * session to call deleteUser(), which only works from the client SDK).
 * Call this first, then delete the Auth account, so a failure here
 * never leaves an Auth account with no way to reach its own data.
 */
export async function deleteAllUserData(uid: string): Promise<void> {
  const db = adminDb();

  const reportsSnap = await db.collection("reports").where("uid", "==", uid).get();
  const batchDeletes = reportsSnap.docs.map((doc) => doc.ref.delete());

  await Promise.all([
    ...batchDeletes,
    db.collection("users").doc(uid).delete(),
    db.collection("usage").doc(uid).delete(),
  ]);
}
