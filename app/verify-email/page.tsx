"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { MailCheck, RefreshCw, Send, ArrowLeft, Inbox, AlertCircle, CheckCircle2 } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useAuth } from "@/context/AuthContext";

function VerifyEmailContent() {
  const { user, loading, needsEmailVerification, getToken, resendVerificationEmail, refreshEmailVerified } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const redirectTo = params.get("redirect") || "/";

  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState("");
  const [justVerified, setJustVerified] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace(`/login?redirect=/verify-email`);
  }, [loading, user, router]);

  // Verifying an email only updates Firebase Auth on the client — it
  // doesn't, by itself, create the account's Firestore record (that's
  // deliberately lazy, see lib/rate-limit.ts's ensureUserDoc). Hitting
  // any endpoint that calls ensureUserDoc() right when we confirm
  // verification provisions the record immediately instead of waiting
  // for the user's first audit request.
  async function provisionAccount() {
    try {
      const token = await getToken();
      if (token) {
        await fetch("/api/account", { headers: { Authorization: `Bearer ${token}` } });
      }
    } catch {
      // Non-fatal — the record will still be created lazily on first
      // audit if this eager provisioning call fails for any reason.
    }
  }

  useEffect(() => {
    if (user && !needsEmailVerification && !justVerified) {
      provisionAccount().finally(() => router.replace(redirectTo));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, needsEmailVerification, justVerified, redirectTo, router]);

  async function handleResend() {
    setSending(true);
    setError("");
    try {
      await resendVerificationEmail();
      setSent(true);
      setTimeout(() => setSent(false), 8000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't send the email — try again shortly.");
    } finally {
      setSending(false);
    }
  }

  async function handleCheck() {
    setChecking(true);
    setError("");
    try {
      const verified = await refreshEmailVerified();
      if (verified) {
        setJustVerified(true);
        await provisionAccount();
        setTimeout(() => router.replace(redirectTo), 1200);
      } else {
        setError("Still not verified yet — click the link in the email first, then try again.");
      }
    } finally {
      setChecking(false);
    }
  }

  if (loading || !user) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="w-6 h-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col">
      <Header />
      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 py-12 sm:py-16">
        <div className="max-w-md w-full">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm text-text-secondary hover:text-primary transition mb-6"
          >
            <ArrowLeft size={14} /> Back to Audityxe
          </Link>

          {justVerified ? (
            <div className="glass rounded-card p-8 text-center">
              <CheckCircle2 size={40} className="text-emerald mx-auto mb-4" />
              <h1 className="font-display font-bold text-xl mb-2">Email verified</h1>
              <p className="text-sm text-text-secondary">Taking you back now…</p>
            </div>
          ) : (
            <div className="glass rounded-card p-6 sm:p-8">
              <div className="w-12 h-12 rounded-card bg-amber/15 flex items-center justify-center mb-5">
                <MailCheck size={22} className="text-amber" />
              </div>
              <h1 className="font-display font-bold text-xl sm:text-2xl mb-2">Verify your email</h1>
              <p className="text-sm text-text-secondary mb-1">
                We sent a verification link to:
              </p>
              <p className="font-mono text-sm mb-5 break-all">{user.email}</p>

              <div className="bg-surface2/60 rounded-card p-4 mb-5 flex items-start gap-2.5">
                <Inbox size={15} className="text-primary mt-0.5 shrink-0" />
                <p className="text-xs sm:text-sm text-text-secondary">
                  Click the link in that email, then come back here and hit "I've verified." If it
                  doesn't show up within a minute or two, <strong>check your spam or junk
                  folder</strong> — verification emails sometimes get filtered there by mistake.
                </p>
              </div>

              {error && (
                <div className="flex items-start gap-2 text-xs text-rose bg-rose/10 border border-rose/30 rounded-lg px-3 py-2.5 mb-4">
                  <AlertCircle size={13} className="mt-0.5 shrink-0" />
                  {error}
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  onClick={handleCheck}
                  disabled={checking}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-card bg-secondary font-semibold text-sm hover:brightness-110 transition disabled:opacity-50"
                >
                  <RefreshCw size={15} className={checking ? "animate-spin" : ""} />
                  I've verified — check again
                </button>
                <button
                  onClick={handleResend}
                  disabled={sending || sent}
                  className="flex items-center justify-center gap-2 py-3 px-4 rounded-card glass text-sm font-medium hover:border-[rgb(var(--color-text-primary)/0.2)] transition disabled:opacity-50"
                >
                  <Send size={14} />
                  {sent ? "Sent" : sending ? "Sending…" : "Resend"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      <Footer />
    </main>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={null}>
      <VerifyEmailContent />
    </Suspense>
  );
}
