import type { Metadata } from "next";
import LegalLayout from "@/components/LegalLayout";

export const metadata: Metadata = {
  title: "About — Audityxe",
  description: "What Audityxe is and how the audit engine works.",
};

export default function AboutPage() {
  return (
    <LegalLayout title="About Audityxe" updated="August 20, 2026">
      <p>
        Audityxe is an instant website audit and promo-kit generator. Paste in a URL, and it
        fetches the live page, scores it across five categories, hands you exact code and copy
        fixes for the weakest spots, and packages the result into ready-to-post social copy and a
        downloadable banner.
      </p>

      <h2>How scoring works</h2>
      <p>
        Every score comes from real signals extracted from the page's live HTML at request time —
        title and meta tag quality, heading structure, image alt-text coverage, responsive
        viewport configuration, canonical and Open Graph tags, HTTPS usage, and detected
        forms/calls-to-action. Nothing is hard-coded or faked; a different URL produces a
        different, independently computed result.
      </p>

      <h2>Constructive vs. Brutal Roast mode</h2>
      <p>
        Every result includes two tones for the same underlying finding: a constructive,
        actionable framing, and a sharper "brutal roast" framing for when you want the unfiltered
        version. Switching modes never changes the scores — only the delivery.
      </p>

      <h2>AI-assisted copy</h2>
      <p>
        When configured with API keys, Audityxe uses Google's Gemini models to write the verdict
        line and social promo copy in a more natural voice. If AI generation is unavailable, a
        built-in fallback generator produces equivalent copy from the same score data, so the tool
        works fully either way.
      </p>

      <h2>Who it's for</h2>
      <p>
        Indie makers, marketers, and small teams who want a fast, specific first pass on a
        landing page before a launch, plus something worth posting about it.
      </p>
    </LegalLayout>
  );
}
