"use client";

/* eslint-disable @next/next/no-img-element */
import { AuditResult } from "@/lib/types";

/**
 * Shows the final-render screenshot Lighthouse already captures during
 * a normal PageSpeed Insights run. It costs nothing extra — PSI returns
 * it inline as a base64 data URL in the same response we already fetch
 * — but it's the only part of the whole report that shows what the page
 * actually looked like to a real Chrome instance, rather than
 * describing it in text.
 *
 * Uses a plain <img> rather than next/image on purpose: the source is a
 * base64 data URL that only exists at runtime, so there's nothing for
 * the image optimizer to fetch, cache, or resize.
 */
export default function RenderProof({ result }: { result: AuditResult }) {
  const src = result.pageSpeed?.finalScreenshotDataUrl;
  if (!src) return null;

  return (
    <section className="px-4 sm:px-6 py-6 sm:py-10">
      <div className="max-w-4xl mx-auto">
        <h2 className="font-display font-semibold text-xl sm:text-2xl mb-1">
          <span className="hand-underline">Render Proof</span>
        </h2>
        <p className="text-text-secondary text-xs sm:text-sm mb-4">
          How a real Chrome browser actually rendered this page, captured during the live
          Lighthouse pass.
        </p>
        <div className="glass rounded-card p-3 sm:p-4">
          <img
            src={src}
            alt="Screenshot of the audited page as rendered by Chrome during the Lighthouse run"
            className="w-full max-w-sm mx-auto rounded-input border border-border"
          />
        </div>
      </div>
    </section>
  );
}
