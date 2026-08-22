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
} from "firebase/auth";
import { auth, googleProvider, githubProvider } from "@/lib/firebase/client";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  authError: string | null;
  getToken: () => Promise<string | null>;
  signUpWithEmail: (name: string, email: string, password: string) => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInWithGithub: () => Promise<void>;
  signOut: () => Promise<void>;
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

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        authError,
        getToken,
        signUpWithEmail,
        signInWithEmail,
        signInWithGoogle,
        signInWithGithub,
        signOut,
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
