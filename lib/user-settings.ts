import { adminDb } from "./firebase/admin";

export async function updateDisplayNameOnRecord(uid: string, displayName: string | null): Promise<void> {
  const db = adminDb();
  await db.collection("users").doc(uid).set({ displayName }, { merge: true });
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
