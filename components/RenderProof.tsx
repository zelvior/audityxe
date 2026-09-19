"use client";

/* eslint-disable @next/next/no-img-element */
import { AuditResult } from "@/lib/types";

/**
 * Shows the final-render screenshot(s) Lighthouse already captures
 * during a normal PageSpeed Insights run. It costs nothing extra — PSI
 * returns them inline as base64 data URLs in the response — but it's
 * the only part of the whole report that shows what the page actually
 * looked like to a real Chrome instance, rather than describing it in
 * text.
 *
 * Two independent captures are fetched (mobile — the primary Lighthouse
 * pass's own viewport — and desktop, a small parallel best-effort
 * call), and which one renders is decided by the *viewer's* device via
 * plain CSS breakpoints, not a fixed choice: a phone gets the sharp
 * mobile-viewport capture at native resolution instead of a shrunken
 * desktop screenshot, and a desktop visitor gets the larger, higher-
 * resolution desktop capture instead of an upscaled, blurry mobile one.
 * That mismatch (a single low-res capture stretched to fill a wide
 * desktop card) was the actual source of "low quality" — the fix is
 * matching resolution to viewport, not compressing less.
 *
 * Uses plain <img> tags on purpose: the sources are base64 data URLs
 * that only exist at runtime, so there's nothing for next/image's
 * optimizer to fetch, cache, or resize.
 */
export default function RenderProof({ result }: { result: AuditResult }) {
  const mobileSrc = result.pageSpeed?.finalScreenshotDataUrl || null;
  const desktopSrc = result.pageSpeed?.finalScreenshotDesktopDataUrl || null;
  if (!mobileSrc && !desktopSrc) return null;

  // Fall back gracefully when only one capture succeeded — always show
  // *something* rather than nothing just because one of the two parallel
  // requests happened to fail.
  const onlyOne = mobileSrc && !desktopSrc ? mobileSrc : !mobileSrc && desktopSrc ? desktopSrc : null;

  // These now come from Lighthouse's full-page-screenshot audit when
  // available (see extractBestScreenshot in lib/pagespeed.ts) — a much
  // higher-resolution capture than the old final-screenshot thumbnail,
  // but of the *entire scrolled page*, not just one viewport-height
  // frame. Left unconstrained, a long page would render as an
  // enormous, mostly-empty-looking strip. Capping the height and
  // cropping to the top (object-cover + object-top) keeps this framed
  // the same way final-screenshot always was — the above-the-fold
  // view — while still benefiting from the sharper source resolution.
  const shotClass = "w-full rounded-input border border-border object-cover object-top";

  return (
    <section className="px-4 sm:px-6 py-6 sm:py-10">
      <div className="max-w-4xl mx-auto">
        <h2 className="font-display font-semibold text-xl sm:text-2xl mb-1">
          <span className="hand-underline">Render Proof</span>
        </h2>
        <p className="text-text-secondary text-xs sm:text-sm mb-4">
          How a real Chrome browser actually rendered this page, captured live during the
          Lighthouse pass{desktopSrc && mobileSrc ? " — matched to your screen size" : ""}.
        </p>
        <div className="glass rounded-card p-3 sm:p-4 flex justify-center">
          {onlyOne ? (
            <img
              src={onlyOne}
              alt="Screenshot of the audited page as rendered by Chrome during the Lighthouse run"
              className={`max-w-md mx-auto max-h-[70vh] sm:max-h-[560px] ${shotClass}`}
            />
          ) : (
            <>
              {/* Phones and small tablets: the native mobile-viewport
                  capture, shown at up to its own real size rather than
                  stretched. */}
              <img
                src={mobileSrc!}
                alt="Screenshot of the audited page as rendered by Chrome on a mobile viewport"
                className={`block sm:hidden max-w-[380px] max-h-[70vh] mx-auto ${shotClass}`}
              />
              {/* Everything sm: and up: the desktop-viewport capture —
                  substantially higher native resolution, so it stays
                  crisp at the larger display size a wider screen gives
                  it room for. */}
              <img
                src={desktopSrc!}
                alt="Screenshot of the audited page as rendered by Chrome on a desktop viewport"
                className={`hidden sm:block max-w-2xl mx-auto max-h-[560px] ${shotClass}`}
              />
            </>
          )}
        </div>
      </div>
    </section>
  );
}
