import type { Metadata } from "next";
import LegalLayout from "@/components/LegalLayout";

export const metadata: Metadata = {
  title: "About — Audityxe",
  description: "What Audityxe is and how the audit engine works.",
};

export default function AboutPage() {
  return (
    <LegalLayout title="About Audityxe" updated="August 2026">
      <p>
        Audityxe is an instant website audit and promo-kit generator. Paste in a URL, and it
        fetches the live page, scores it across six categories plus a 17-area deep breakdown,
        hands you exact code fixes with real evidence for the weakest spots, and packages the
        result into ready-to-post social copy and a downloadable banner.
      </p>

      <h2>How scoring works</h2>
      <p>
        Every score comes from real signals extracted from the page's live HTML and HTTP response
        at request time — title and meta tag quality, heading structure, image alt-text coverage,
        responsive viewport configuration, canonical and Open Graph tags, HTTPS usage, security
        headers, and detected forms/calls-to-action — plus a real browser-rendered performance and
        accessibility pass. Nothing is hard-coded or faked; a different URL produces a different,
        independently computed result.
      </p>

      <h2>Real evidence, not just a verdict</h2>
      <p>
        Every flagged issue comes with a concrete, checkable proof — the exact URL fetched, the
        HTTP status returned, or the specific count of elements found — not just an assertion. If
        we say your sitemap is missing, we show you the request we made and what came back.
      </p>

      <h2>Written commentary</h2>
      <p>
        The verdict line and social promo copy are generated based on your real scores as input —
        written fresh for every audit, never templated boilerplate. If that generation is ever
        unavailable, a built-in fallback writer produces equivalent copy from the same score data,
        so the tool works fully either way.
      </p>

      <h2>Your privacy</h2>
      <p>
        Audits aren't stored on our servers after the result is returned to you — there's no
        public report page and no cross-account history. Use the copy/export/share/email buttons
        on a result to keep your own copy.
      </p>

      <h2>Who it's for</h2>
      <p>
        Indie makers, marketers, and small teams who want a fast, specific first pass on a
        landing page before a launch, plus agencies auditing client sites at scale on Pro.
      </p>
    </LegalLayout>
  );
}
