"use client";

import { useState } from "react";
import { Check, Copy, Twitter, Linkedin, Lock } from "lucide-react";
import Link from "next/link";
import { AuditResult } from "@/lib/types";
import BannerCanvas from "./BannerCanvas";

export default function PromoKit({ result }: { result: AuditResult }) {
  const [copied, setCopied] = useState<"x" | "li" | null>(null);

  if (result.promoLocked) {
    const reason = result.promoLockReason;
    const isByokMissing = reason === "byok_missing";
    const isByokFailed = reason === "byok_failed";

    return (
      <section className="px-4 sm:px-6 py-6 sm:py-10">
        <div className="max-w-4xl mx-auto">
          <h2 className="font-display font-semibold text-xl sm:text-2xl mb-1">Pro Promo Kit</h2>
          <div className="glass rounded-card p-8 text-center mt-4">
            <Lock size={22} className="text-text-secondary mx-auto mb-3" />
            <p className="text-sm text-text-secondary mb-4">
              {isByokMissing
                ? "You're on Pro. Just add your own AI key in Settings to turn this on. Audityxe runs promo generation on your key, not its own."
                : isByokFailed
                ? "Your AI key didn't return a result this time. Check it in Settings, or try again."
                : "Promo copy and a shareable banner are a Pro-plan feature, powered by your own AI key."}
            </p>
            <Link
              href={isByokMissing || isByokFailed ? "/settings" : "/pricing"}
              className="inline-block px-4 py-2 rounded-btn bg-secondary text-sm font-semibold hover:brightness-110 transition"
            >
              {isByokMissing || isByokFailed ? "Go to Settings" : "View plans"}
            </Link>
          </div>
        </div>
      </section>
    );
  }

  async function copy(which: "x" | "li", text: string) {
    let ok = false;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        ok = true;
      }
    } catch {
      // fall through to legacy fallback
    }
    if (!ok) {
      try {
        const textarea = document.createElement("textarea");
        textarea.value = text;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      } catch {
        return;
      }
    }
    setCopied(which);
    setTimeout(() => setCopied((c) => (c === which ? null : c)), 1600);
  }

  return (
    <section className="px-4 sm:px-6 py-6 sm:py-10">
      <div className="max-w-4xl mx-auto">
        <h2 className="font-display font-semibold text-xl sm:text-2xl mb-1">Pro Promo Kit</h2>
        <p className="text-text-secondary text-xs sm:text-sm mb-5 sm:mb-6">
          Ready-to-post copy and a shareable banner, generated from your audit.
        </p>

        <div className="grid md:grid-cols-2 gap-5 mb-5">
          <div className="glass rounded-card p-4 sm:p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="flex items-center gap-2 text-sm font-semibold">
                <Twitter size={16} className="text-primary" /> X Post
              </span>
              <button
                onClick={() => copy("x", result.xPost)}
                className="flex items-center gap-1.5 text-xs font-mono text-text-secondary hover:text-primary transition"
              >
                {copied === "x" ? (
                  <>
                    <Check size={12} className="text-emerald" /> Copied
                  </>
                ) : (
                  <>
                    <Copy size={12} /> Copy post
                  </>
                )}
              </button>
            </div>
            <pre className="whitespace-pre-wrap text-sm text-text-secondary font-body leading-relaxed">
              {result.xPost}
            </pre>
          </div>

          <div className="glass rounded-card p-4 sm:p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="flex items-center gap-2 text-sm font-semibold">
                <Linkedin size={16} className="text-primary" /> LinkedIn Post
              </span>
              <button
                onClick={() => copy("li", result.linkedinPost)}
                className="flex items-center gap-1.5 text-xs font-mono text-text-secondary hover:text-primary transition"
              >
                {copied === "li" ? (
                  <>
                    <Check size={12} className="text-emerald" /> Copied
                  </>
                ) : (
                  <>
                    <Copy size={12} /> Copy post
                  </>
                )}
              </button>
            </div>
            <pre className="whitespace-pre-wrap text-sm text-text-secondary font-body leading-relaxed">
              {result.linkedinPost}
            </pre>
          </div>
        </div>

        <BannerCanvas result={result} />
      </div>
    </section>
  );
}
