"use client";

import { useEffect } from "react";
import { AlertOctagon, RotateCcw } from "lucide-react";

export default function GlobalError({
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
    <html lang="en">
      <body className="min-h-screen bg-[#FBF7EF] text-[#201B14] font-sans antialiased flex items-center justify-center px-4">
        <div className="max-w-md mx-auto text-center py-16">
          <div className="w-16 h-16 rounded-card bg-black/5 border border-black/10 flex items-center justify-center mx-auto mb-6">
            <AlertOctagon size={28} className="text-[#B23A2E]" />
          </div>
          <p className="font-mono text-xs text-[#6E6252] mb-2">CRITICAL ERROR</p>
          <h1 className="font-bold text-2xl sm:text-3xl mb-3">Audityxe failed to load.</h1>
          <p className="text-sm sm:text-base text-[#6E6252] mb-8">
            A critical error occurred. Please try reloading the page.
          </p>
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-card bg-secondary font-semibold text-sm hover:brightness-110 transition"
          >
            <RotateCcw size={16} />
            Reload
          </button>
        </div>
      </body>
    </html>
  );
}
