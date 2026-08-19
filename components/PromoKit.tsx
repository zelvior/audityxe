"use client";

import { useState } from "react";
import { Check, Copy, Twitter, Linkedin } from "lucide-react";
import { AuditResult } from "@/lib/types";
import BannerCanvas from "./BannerCanvas";

export default function PromoKit({ result }: { result: AuditResult }) {
  const [copied, setCopied] = useState<"x" | "li" | null>(null);

  function copy(which: "x" | "li", text: string) {
    navigator.clipboard?.writeText(text).catch(() => {});
    setCopied(which);
    setTimeout(() => setCopied((c) => (c === which ? null : c)), 1600);
  }

  return (
    <section className="px-6 py-10">
      <div className="max-w-4xl mx-auto">
        <h2 className="font-display font-semibold text-2xl mb-1">Viral Promo Kit</h2>
        <p className="text-text-secondary text-sm mb-6">
          Ready-to-post copy and a shareable banner, generated from your audit.
        </p>

        <div className="grid md:grid-cols-2 gap-5 mb-5">
          <div className="glass rounded-2xl p-5">
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

          <div className="glass rounded-2xl p-5">
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
