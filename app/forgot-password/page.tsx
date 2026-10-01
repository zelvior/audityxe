"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, AlertCircle, Loader2, Send, MailCheck } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useAuth } from "@/context/AuthContext";

export default function ForgotPasswordPage() {
  const { sendPasswordReset } = useAuth();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setBusy(true);
    setError("");
    try {
      await sendPasswordReset(email);
      // Always shown on success, regardless of whether the address is
      // actually registered — see AuthContext.sendPasswordReset for why.
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen flex flex-col">
      <Header />
      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 py-12 sm:py-16">
        <div className="max-w-sm mx-auto w-full">
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm text-text-secondary hover:text-primary transition mb-6"
          >
            <ArrowLeft size={14} /> Back to sign in
          </Link>

          {sent ? (
            <div className="glass rounded-card p-6 sm:p-8 text-center">
              <div className="w-12 h-12 rounded-card bg-emerald/15 flex items-center justify-center mx-auto mb-4">
                <MailCheck size={22} className="text-emerald" />
              </div>
              <h1 className="font-display font-bold text-xl mb-2">Check your inbox</h1>
              <p className="text-sm text-text-secondary mb-1">
                If an account exists for <span className="font-mono break-all">{email}</span>,
                we've sent a link to reset your password.
              </p>
              <p className="text-xs text-text-secondary/70 mt-3">
                Don't see it within a minute or two? Check your spam or junk folder.
              </p>
            </div>
          ) : (
            <>
              <h1 className="font-display font-bold text-2xl sm:text-3xl tracking-tight mb-1.5">
                Reset your password
              </h1>
              <p className="text-sm text-text-secondary mb-7">
                Enter the email on your account and we'll send you a reset link.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="email" className="block text-xs font-mono text-text-secondary mb-1.5">
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full bg-surface2 border border-border rounded-card px-3.5 py-2.5 text-sm outline-none focus-visible:border-primary"
                  />
                </div>

                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-start gap-2 text-sm text-rose bg-rose/10 border border-rose/30 rounded-card px-3.5 py-2.5"
                  >
                    <AlertCircle size={15} className="mt-0.5 shrink-0" />
                    <span>{error}</span>
                  </motion.div>
                )}

                <button
                  type="submit"
                  disabled={busy}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-card bg-secondary font-semibold text-sm hover:brightness-110 transition disabled:opacity-50"
                >
                  {busy ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                  Send reset link
                </button>
              </form>

              <p className="text-sm text-text-secondary text-center mt-6">
                Remembered it after all?{" "}
                <Link href="/login" className="text-primary hover:underline">
                  Sign in
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
      <Footer />
    </main>
  );
}
