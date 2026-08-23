"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
  useCallback,
  useRef,
} from "react";
import {
  User,
  onAuthStateChanged,
  signOut as firebaseSignOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  AuthProvider as FirebaseAuthProvider,
  updateProfile,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
  deleteUser,
  sendEmailVerification,
  reload,
} from "firebase/auth";
import { auth, googleProvider, githubProvider } from "@/lib/firebase/client";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  authError: string | null;
  /** True once we've confirmed the account either doesn't need email
   * verification (federated sign-in) or has completed it. Email/password
   * accounts start unverified until they click the link we send. */
  needsEmailVerification: boolean;
  getToken: () => Promise<string | null>;
  signUpWithEmail: (name: string, email: string, password: string) => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInWithGithub: () => Promise<void>;
  signOut: () => Promise<void>;
  resendVerificationEmail: () => Promise<void>;
  refreshEmailVerified: () => Promise<boolean>;
  updateDisplayName: (name: string) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  deleteAccount: (currentPassword?: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function friendlyAuthError(err: unknown): string {
  const code = (err as { code?: string })?.code || "";
  const map: Record<string, string> = {
    "auth/email-already-in-use": "That email is already registered. Try signing in instead.",
    "auth/invalid-email": "That doesn't look like a valid email address.",
    "auth/weak-password": "Password must be at least 6 characters.",
    "auth/user-not-found": "No account found with that email.",
    "auth/wrong-password": "Incorrect password.",
    "auth/invalid-credential": "Incorrect email or password.",
    "auth/too-many-requests": "Too many attempts. Please wait a moment and try again.",
    "auth/popup-closed-by-user": "Sign-in was cancelled.",
    "auth/account-exists-with-different-credential":
      "An account already exists with this email using a different sign-in method. Try that method instead.",
    "auth/network-request-failed": "Network error. Check your connection and try again.",
    "auth/unauthorized-domain":
      "This domain isn't authorized for sign-in yet. In the Firebase Console, go to Authentication → Settings → Authorized domains and add this domain.",
    "auth/operation-not-allowed":
      "This sign-in method isn't enabled yet. In the Firebase Console, go to Authentication → Sign-in method and enable it.",
    "auth/popup-blocked": "Your browser blocked the sign-in popup. Trying a redirect instead — please try again.",
    "auth/cancelled-popup-request": "Sign-in was interrupted. Please try again.",
    "auth/invalid-api-key": "Firebase API key is invalid or missing.",
    "auth/internal-error": "Firebase rejected the request — check that the OAuth provider is fully configured (Client ID/Secret and callback URL).",
    "auth/requires-recent-login": "For security, please sign out and back in, then try this again.",
    "auth/user-mismatch": "That doesn't match the signed-in account.",
  };
  return map[code] || `Something went wrong (${code || "unknown error"}). Please try again.`;
}

// Errors where falling back from a popup to a full-page redirect is
// likely to actually succeed — covers the most common real-world OAuth
// failure mode: browsers/embedded webviews that block third-party
// popups or third-party storage access (Safari ITP, in-app browsers,
// some corporate networks) even when the Firebase/OAuth config is 100%
// correct on the console side.
const POPUP_FALLBACK_CODES = new Set([
  "auth/popup-blocked",
  "auth/popup-closed-by-user",
  "auth/cancelled-popup-request",
  "auth/internal-error",
]);

async function signInWithPopupOrRedirect(provider: FirebaseAuthProvider): Promise<void> {
  try {
    await signInWithPopup(auth, provider);
  } catch (err) {
    const code = (err as { code?: string })?.code || "";
    if (POPUP_FALLBACK_CODES.has(code)) {
      // Full-page redirect works in far more environments than a popup —
      // the result is picked up by getRedirectResult() on the next load.
      await signInWithRedirect(auth, provider);
      return;
    }
    throw err;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const redirectChecked = useRef(false);

  useEffect(() => {
    // Pick up the result of a signInWithRedirect() call, if one just
    // completed (the page will have reloaded after returning from the
    // OAuth provider). Runs once on mount, before we start listening.
    if (!redirectChecked.current) {
      redirectChecked.current = true;
      getRedirectResult(auth).catch((err) => {
        console.error("[auth] redirect sign-in failed:", err);
        setAuthError(friendlyAuthError(err));
      });
    }

    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return unsub;
  }, []);

  const getToken = useCallback(async () => {
    if (!auth.currentUser) return null;
    try {
      return await auth.currentUser.getIdToken();
    } catch {
      return null;
    }
  }, []);

  const signUpWithEmail = useCallback(async (name: string, email: string, password: string) => {
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      if (name.trim()) {
        await updateProfile(cred.user, { displayName: name.trim() });
      }
      await sendEmailVerification(cred.user);
    } catch (err) {
      console.error("[auth] email sign-up failed:", err);
      throw new Error(friendlyAuthError(err));
    }
  }, []);

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      console.error("[auth] email sign-in failed:", err);
      throw new Error(friendlyAuthError(err));
    }
  }, []);

  const signInWithGoogle = useCallback(async () => {
    try {
      await signInWithPopupOrRedirect(googleProvider);
    } catch (err) {
      console.error("[auth] Google sign-in failed:", err);
      throw new Error(friendlyAuthError(err));
    }
  }, []);

  const signInWithGithub = useCallback(async () => {
    try {
      await signInWithPopupOrRedirect(githubProvider);
    } catch (err) {
      console.error("[auth] GitHub sign-in failed:", err);
      throw new Error(friendlyAuthError(err));
    }
  }, []);

  const signOut = useCallback(async () => {
    await firebaseSignOut(auth);
  }, []);

  const resendVerificationEmail = useCallback(async () => {
    if (!auth.currentUser) throw new Error("You're not signed in.");
    try {
      await sendEmailVerification(auth.currentUser);
    } catch (err) {
      throw new Error(friendlyAuthError(err));
    }
  }, []);

  const [verifiedTick, setVerifiedTick] = useState(0);

  const refreshEmailVerified = useCallback(async () => {
    if (!auth.currentUser) return false;
    try {
      await reload(auth.currentUser);
      setUser(auth.currentUser);
      setVerifiedTick((t) => t + 1); // force a re-render even if the User object reference is unchanged
      return auth.currentUser.emailVerified;
    } catch {
      return false;
    }
  }, []);

  const needsEmailVerification = !!user && !user.emailVerified;

  const updateDisplayNameFn = useCallback(async (name: string) => {
    if (!auth.currentUser) throw new Error("You're not signed in.");
    try {
      await updateProfile(auth.currentUser, { displayName: name.trim() || null });
      setUser(auth.currentUser);
      setVerifiedTick((t) => t + 1);
    } catch (err) {
      throw new Error(friendlyAuthError(err));
    }
  }, []);

  const changePassword = useCallback(async (currentPassword: string, newPassword: string) => {
    const current = auth.currentUser;
    if (!current || !current.email) throw new Error("You're not signed in with an email/password account.");
    try {
      const credential = EmailAuthProvider.credential(current.email, currentPassword);
      await reauthenticateWithCredential(current, credential);
      await updatePassword(current, newPassword);
    } catch (err) {
      throw new Error(friendlyAuthError(err));
    }
  }, []);

  const deleteAccount = useCallback(async (currentPassword?: string) => {
    const current = auth.currentUser;
    if (!current) throw new Error("You're not signed in.");

    try {
      if (currentPassword && current.email) {
        const credential = EmailAuthProvider.credential(current.email, currentPassword);
        await reauthenticateWithCredential(current, credential);
      }

      // Delete all server-side data FIRST, while the token is still
      // valid — deleting the Auth account first would leave orphaned
      // Firestore data with no way to authenticate and clean it up.
      const token = await current.getIdToken();
      const res = await fetch("/api/account/delete", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to delete account data.");
      }

      await deleteUser(current);
    } catch (err) {
      if (err instanceof Error && !err.message.includes("auth/")) throw err;
      throw new Error(friendlyAuthError(err));
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        authError,
        needsEmailVerification,
        getToken,
        signUpWithEmail,
        signInWithEmail,
        signInWithGoogle,
        signInWithGithub,
        signOut,
        resendVerificationEmail,
        refreshEmailVerified,
        updateDisplayName: updateDisplayNameFn,
        changePassword,
        deleteAccount,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
