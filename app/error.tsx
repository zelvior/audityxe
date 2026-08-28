"use client";

import { useEffect } from "react";
import { AlertOctagon, RotateCcw, Home } from "lucide-react";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="min-h-screen flex flex-col">
      <Header />
      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 py-16 sm:py-24">
        <div className="max-w-md mx-auto text-center">
          <div className="w-16 h-16 rounded-2xl glass flex items-center justify-center mx-auto mb-6 border border-rose/30">
            <AlertOctagon size={28} className="text-rose" />
          </div>
          <p className="font-mono text-xs text-text-secondary mb-2">SOMETHING BROKE</p>
          <h1 className="font-display font-bold text-2xl sm:text-3xl mb-3">
            The audit engine hit a snag.
          </h1>
          <p className="text-sm sm:text-base text-text-secondary mb-8 break-words">
            An unexpected error occurred while rendering this page. You can try again, or head
            back home.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={reset}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-primary to-accent font-semibold text-sm hover:brightness-110 transition"
            >
              <RotateCcw size={16} />
              Try again
            </button>
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl glass font-semibold text-sm hover:text-primary transition"
            >
              <Home size={16} />
              Go home
            </Link>
          </div>
        </div>
      </div>
      <Footer />
    </main>
  );
}
