"use client";

import { useState, Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { AlertCircle, ArrowLeft, Loader2, UserPlus } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import OAuthButtons from "@/components/OAuthButtons";
import { useAuth } from "@/context/AuthContext";

function RegisterForm() {
  const { signUpWithEmail, signInWithGoogle, signInWithGithub, user, authError } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const redirectTo = params.get("redirect") || "/";

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (authError) setError(authError);
  }, [authError]);

  if (user) {
    router.replace(redirectTo);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    setBusy(true);
    try {
      await signUpWithEmail(name, email, password);
      router.replace(redirectTo);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  async function handleOAuth(provider: "google" | "github") {
    setError("");
    setBusy(true);
    try {
      if (provider === "google") await signInWithGoogle();
      else await signInWithGithub();
      router.replace(redirectTo);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-sm mx-auto w-full">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-xs sm:text-sm text-text-secondary hover:text-primary transition mb-6"
      >
        <ArrowLeft size={14} /> Back to Audityxe
      </Link>

      <h1 className="font-display font-bold text-2xl sm:text-3xl tracking-tight mb-1.5">
        Create your account
      </h1>
      <p className="text-sm text-text-secondary mb-7">
        Free forever — 3 audits a day, no card required.
      </p>

      <OAuthButtons onGoogle={() => handleOAuth("google")} onGithub={() => handleOAuth("github")} disabled={busy} />

      <div className="flex items-center gap-3 my-6">
        <div className="h-px flex-1 bg-border" />
        <span className="text-xs font-mono text-text-secondary/60">OR</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="name" className="block text-xs font-mono text-text-secondary mb-1.5">
            Name
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            className="w-full bg-surface2 border border-border rounded-card px-3.5 py-2.5 text-sm outline-none focus-visible:border-primary"
          />
        </div>
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
        <div>
          <label htmlFor="password" className="block text-xs font-mono text-text-secondary mb-1.5">
            Password
          </label>
          <input
            id="password"
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 6 characters"
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
          {busy ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />}
          Create account
        </button>
      </form>

      <p className="text-sm text-text-secondary text-center mt-6">
        Already have an account?{" "}
        <Link href="/login" className="text-primary hover:underline">
          Sign in
        </Link>
      </p>

      <p className="text-[11px] text-text-secondary/60 text-center mt-4">
        By continuing you agree to our{" "}
        <Link href="/terms" className="hover:text-primary underline">
          Terms
        </Link>{" "}
        and{" "}
        <Link href="/privacy" className="hover:text-primary underline">
          Privacy Policy
        </Link>
        .
      </p>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <main className="min-h-screen flex flex-col">
      <Header />
      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 py-12 sm:py-16">
        <Suspense fallback={null}>
          <RegisterForm />
        </Suspense>
      </div>
      <Footer />
    </main>
  );
}
