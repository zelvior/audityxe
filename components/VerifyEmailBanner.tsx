"use client";

import { useState } from "react";
import { MailCheck, RefreshCw, Send } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export default function VerifyEmailBanner() {
  const { user, resendVerificationEmail, refreshEmailVerified } = useAuth();
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState("");

  async function handleResend() {
    setSending(true);
    setError("");
    try {
      await resendVerificationEmail();
      setSent(true);
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
      if (!verified) setError("Still not verified — click the link in the email first.");
    } finally {
      setChecking(false);
    }
  }

  return (
    <div className="px-4 sm:px-6 pb-2">
      <div className="max-w-3xl mx-auto glass rounded-2xl p-5 sm:p-6 border border-amber/30 flex flex-col sm:flex-row items-start gap-4">
        <MailCheck size={20} className="text-amber shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-sm sm:text-base font-medium mb-1">Verify your email to run audits</p>
          <p className="text-xs sm:text-sm text-text-secondary mb-3">
            We sent a verification link to <span className="font-mono">{user?.email}</span>. Click
            it, then come back here — the tool unlocks automatically once you're verified.
          </p>
          {error && <p className="text-xs text-rose mb-3">{error}</p>}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleCheck}
              disabled={checking}
              className="flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-lg bg-gradient-to-r from-primary to-accent hover:brightness-110 transition disabled:opacity-50"
            >
              <RefreshCw size={13} className={checking ? "animate-spin" : ""} />
              I've verified — check again
            </button>
            <button
              onClick={handleResend}
              disabled={sending || sent}
              className="flex items-center gap-1.5 text-xs font-medium px-3.5 py-2 rounded-lg glass hover:border-white/20 transition disabled:opacity-50"
            >
              <Send size={13} />
              {sent ? "Email sent" : sending ? "Sending…" : "Resend email"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
