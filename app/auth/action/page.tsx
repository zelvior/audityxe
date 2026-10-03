"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  applyActionCode,
  checkActionCode,
  confirmPasswordReset,
  sendPasswordResetEmail,
  verifyPasswordResetCode,
} from "firebase/auth";
import { AlertCircle, ArrowRight, CheckCircle2, KeyRound, Loader2, MailCheck, ShieldAlert } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PasswordInput from "@/components/PasswordInput";
import PasswordRequirements from "@/components/PasswordRequirements";
import { auth } from "@/lib/firebase/client";
import { validatePassword } from "@/lib/password-policy";

/**
 * Custom Firebase Auth action handler.
 *
 * Set it in Firebase Console → Authentication → Templates → (any template)
 * → Customize action URL → https://audityxe.xyz/auth/action
 *
 * Firebase appends ?mode=…&oobCode=…&apiKey=…&continueUrl=…&lang=… and this
 * page does what the default <project>.firebaseapp.com/__/auth/action page
 * does — for password reset, email verification, email-change recovery and
 * verify-and-change-email — on Audityxe's own domain and design.
 */

type Phase =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "reset-form"; email: string }
  | { kind: "reset-done" }
  | { kind: "verified" }
  | { kind: "email-changed"; email: string | null }
  | { kind: "recovered"; email: string }
  | { kind: "mfa-reverted"; email: string };

function actionError(err: unknown): string {
  const code = (err as { code?: string })?.code || "";
  const map: Record<string, string> = {
    "auth/expired-action-code": "This link has expired. Request a new one and try again.",
    "auth/invalid-action-code": "This link is invalid or has already been used. Request a new one and try again.",
    "auth/user-disabled": "This account has been disabled. Contact support if you think this is a mistake.",
    "auth/user-not-found": "We couldn't find the account for this link. It may have been deleted.",
    "auth/weak-password": "Password must be 6–10 characters with an uppercase letter, lowercase letter, number, and special character.",
    "auth/password-does-not-meet-requirements":
      "Password must be 6–10 characters with an uppercase letter, lowercase letter, number, and special character.",
    "auth/network-request-failed": "Network error. Check your connection and try again.",
    "auth/too-many-requests": "Too many attempts. Please wait a moment and try again.",
    "auth/unauthorized-domain":
      "This domain isn't authorized in Firebase yet. Add it under Authentication → Settings → Authorized domains.",
  };
  return map[code] || `Something went wrong (${code || "unknown error"}). Please try again.`;
}

/** Only follow a continueUrl that stays on this site — never an open redirect. */
function safeContinue(raw: string | null): string | null {
  if (!raw) return null;
  try {
    const u = new URL(raw, window.location.origin);
    if (u.origin !== window.location.origin) return null;
    return u.pathname + u.search + u.hash;
  } catch {
    return null;
  }
}

function Shell({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="glass rounded-card p-6 sm:p-8">
      <div className="w-12 h-12 rounded-card bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-4">{icon}</div>
      <h1 className="font-display font-bold text-xl sm:text-2xl text-center mb-2">{title}</h1>
      {children}
    </div>
  );
}

function ActionHandler() {
  const params = useSearchParams();
  const mode = params.get("mode");
  const oobCode = params.get("oobCode");
  const continueTo = typeof window === "undefined" ? null : safeContinue(params.get("continueUrl"));

  const [phase, setPhase] = useState<Phase>({ kind: "loading" });
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  // oobCodes are single-use: React strict mode runs effects twice in dev,
  // and a second applyActionCode would turn a success into "already used".
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    if (!mode || !oobCode) {
      setPhase({ kind: "error", message: "This link is incomplete. Open it again from the email we sent you." });
      return;
    }

    (async () => {
      try {
        switch (mode) {
          case "resetPassword": {
            const email = await verifyPasswordResetCode(auth, oobCode);
            setPhase({ kind: "reset-form", email });
            break;
          }
          case "verifyEmail": {
            await applyActionCode(auth, oobCode);
            // If this browser is signed in as that user, refresh so the app
            // sees emailVerified immediately instead of on the next token refresh.
            await auth.currentUser?.reload().catch(() => {});
            await auth.currentUser?.getIdToken(true).catch(() => {});
            setPhase({ kind: "verified" });
            break;
          }
          case "recoverEmail": {
            const info = await checkActionCode(auth, oobCode);
            const restored = (info.data as { email?: string | null }).email || "";
            await applyActionCode(auth, oobCode);
            setPhase({ kind: "recovered", email: restored });
            break;
          }
          case "verifyAndChangeEmail": {
            const info = await checkActionCode(auth, oobCode);
            await applyActionCode(auth, oobCode);
            await auth.currentUser?.reload().catch(() => {});
            setPhase({ kind: "email-changed", email: (info.data as { email?: string | null }).email || null });
            break;
          }
          case "revertSecondFactorAddition": {
            // The "a second sign-in step was added to your account" security
            // notification: this link undoes it if it wasn't you.
            const info = await checkActionCode(auth, oobCode);
            await applyActionCode(auth, oobCode);
            setPhase({ kind: "mfa-reverted", email: (info.data as { email?: string | null }).email || "" });
            break;
          }
          default:
            setPhase({ kind: "error", message: "This type of link isn't supported here." });
        }
      } catch (err) {
        setPhase({ kind: "error", message: actionError(err) });
      }
    })();
  }, [mode, oobCode]);

  async function submitReset(e: React.FormEvent) {
    e.preventDefault();
    if (!oobCode || busy) return;
    setFormError("");
    const problem = validatePassword(password);
    if (problem) return setFormError(problem);
    if (password !== confirm) return setFormError("The two passwords don't match.");
    setBusy(true);
    try {
      await confirmPasswordReset(auth, oobCode, password);
      setPhase({ kind: "reset-done" });
    } catch (err) {
      const code = (err as { code?: string })?.code;
      // A dead code can't be fixed by retyping the password — show the full error state.
      if (code === "auth/expired-action-code" || code === "auth/invalid-action-code") {
        setPhase({ kind: "error", message: actionError(err) });
      } else {
        setFormError(actionError(err));
      }
    } finally {
      setBusy(false);
    }
  }

  async function secureAccount(email: string) {
    setBusy(true);
    setFormError("");
    try {
      await sendPasswordResetEmail(auth, email);
      setResetSent(true);
    } catch (err) {
      setFormError(actionError(err));
    } finally {
      setBusy(false);
    }
  }

  const primaryBtn =
    "w-full inline-flex items-center justify-center gap-2 py-3 rounded-card bg-secondary font-semibold text-sm hover:brightness-110 transition disabled:opacity-50";

  if (phase.kind === "loading") {
    return (
      <Shell icon={<Loader2 size={22} className="text-primary animate-spin" />} title="One moment…">
        <p className="text-sm text-text-secondary text-center">Checking your link.</p>
      </Shell>
    );
  }

  if (phase.kind === "error") {
    return (
      <Shell icon={<ShieldAlert size={22} className="text-rose" />} title="This link can't be used">
        <p role="alert" className="text-sm text-text-secondary text-center mb-6">
          {phase.message}
        </p>
        <div className="space-y-3">
          <Link href="/forgot-password" className={primaryBtn}>
            Request a new reset link
          </Link>
          <Link href="/login" className="block text-center text-sm text-text-secondary hover:text-primary transition">
            Back to sign in
          </Link>
        </div>
      </Shell>
    );
  }

  if (phase.kind === "reset-form") {
    return (
      <Shell icon={<KeyRound size={22} className="text-primary" />} title="Choose a new password">
        <p className="text-sm text-text-secondary text-center mb-6">
          for <span className="font-mono break-all">{phase.email}</span>
        </p>
        <form onSubmit={submitReset} className="space-y-4" noValidate>
          <div>
            <label htmlFor="new-password" className="block text-xs font-mono text-text-secondary mb-1.5">
              New password
            </label>
            <PasswordInput
              id="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              placeholder="6–10 characters"
              aria-describedby="password-rules"
              className="w-full bg-surface2 border border-border rounded-card px-3.5 py-2.5 text-sm outline-none focus-visible:border-primary"
            />
            <div id="password-rules">
              <PasswordRequirements password={password} />
            </div>
          </div>
          <div>
            <label htmlFor="confirm-password" className="block text-xs font-mono text-text-secondary mb-1.5">
              Confirm password
            </label>
            <PasswordInput
              id="confirm-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
              placeholder="Type it again"
              className="w-full bg-surface2 border border-border rounded-card px-3.5 py-2.5 text-sm outline-none focus-visible:border-primary"
            />
          </div>
          {formError && (
            <div role="alert" className="flex items-start gap-2 text-sm text-rose bg-rose/10 border border-rose/30 rounded-card px-3.5 py-2.5">
              <AlertCircle size={15} className="mt-0.5 shrink-0" />
              <span>{formError}</span>
            </div>
          )}
          <button type="submit" disabled={busy} className={primaryBtn}>
            {busy ? <Loader2 size={16} className="animate-spin" /> : <KeyRound size={16} />}
            Save new password
          </button>
        </form>
      </Shell>
    );
  }

  if (phase.kind === "reset-done") {
    return (
      <Shell icon={<CheckCircle2 size={22} className="text-emerald" />} title="Password updated">
        <p className="text-sm text-text-secondary text-center mb-6">Your password has been changed. Sign in with your new password.</p>
        <Link href="/login" className={primaryBtn}>
          Sign in <ArrowRight size={16} />
        </Link>
      </Shell>
    );
  }

  if (phase.kind === "verified") {
    return (
      <Shell icon={<MailCheck size={22} className="text-emerald" />} title="Email verified">
        <p className="text-sm text-text-secondary text-center mb-6">Thanks — your email address is confirmed and your account is ready to use.</p>
        <Link href={continueTo || (auth.currentUser ? "/" : "/login")} className={primaryBtn}>
          {auth.currentUser ? "Continue to Audityxe" : "Sign in"} <ArrowRight size={16} />
        </Link>
      </Shell>
    );
  }

  if (phase.kind === "email-changed") {
    return (
      <Shell icon={<MailCheck size={22} className="text-emerald" />} title="Email address updated">
        <p className="text-sm text-text-secondary text-center mb-6">
          {phase.email ? (
            <>
              Your account email is now <span className="font-mono break-all">{phase.email}</span>.
            </>
          ) : (
            "Your account email has been updated."
          )}{" "}
          Use it the next time you sign in.
        </p>
        <Link href={continueTo || "/login"} className={primaryBtn}>
          Continue <ArrowRight size={16} />
        </Link>
      </Shell>
    );
  }

  // recovered / mfa-reverted share the "secure your account" screen
  const reverted = phase.kind === "mfa-reverted";
  return (
    <Shell
      icon={reverted ? <ShieldAlert size={22} className="text-primary" /> : <MailCheck size={22} className="text-emerald" />}
      title={reverted ? "Two-step verification removed" : "Email address restored"}
    >
      <p className="text-sm text-text-secondary text-center mb-6">
        {reverted ? (
          <>
            The second sign-in step that was just added to your account has been removed. If you didn&apos;t add it, someone else may have access to
            your account — reset your password now.
          </>
        ) : (
          <>
            Your account email has been changed back to <span className="font-mono break-all">{phase.email}</span>. If you didn&apos;t request the
            change, someone else may have access to your account — reset your password now.
          </>
        )}
      </p>
      {resetSent ? (
        <p role="status" className="text-sm text-emerald text-center">
          We sent a password reset link{phase.email ? ` to ${phase.email}` : ""}.
        </p>
      ) : (
        <div className="space-y-3">
          {formError && (
            <div role="alert" className="flex items-start gap-2 text-sm text-rose bg-rose/10 border border-rose/30 rounded-card px-3.5 py-2.5">
              <AlertCircle size={15} className="mt-0.5 shrink-0" />
              <span>{formError}</span>
            </div>
          )}
          <button type="button" disabled={busy || !phase.email} onClick={() => secureAccount(phase.email)} className={primaryBtn}>
            {busy ? <Loader2 size={16} className="animate-spin" /> : <KeyRound size={16} />}
            Reset my password
          </button>
          <Link href="/login" className="block text-center text-sm text-text-secondary hover:text-primary transition">
            No thanks, go to sign in
          </Link>
        </div>
      )}
    </Shell>
  );
}

export default function AuthActionPage() {
  return (
    <main className="min-h-screen flex flex-col">
      <Header />
      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 py-12 sm:py-16">
        <div className="max-w-sm mx-auto w-full">
          <Suspense
            fallback={
              <div className="flex justify-center py-12">
                <Loader2 size={22} className="animate-spin text-text-secondary" />
              </div>
            }
          >
            <ActionHandler />
          </Suspense>
        </div>
      </div>
      <Footer />
    </main>
  );
}
