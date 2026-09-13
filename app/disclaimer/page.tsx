import type { Metadata } from "next";
import { canonicalMeta } from "@/lib/seo";
import LegalLayout from "@/components/LegalLayout";

export const metadata: Metadata = {
  ...canonicalMeta("disclaimer"),
  title: "Disclaimer — Audityxe",
  description: "Important limitations on the accuracy of Audityxe's audit results.",
};

export default function DisclaimerPage() {
  return (
    <LegalLayout title="Disclaimer" updated="August 20, 2026" path="disclaimer">
      <h2>Automated analysis, not professional advice</h2>
      <p>
        Audityxe analyzes the publicly served HTML of a URL you provide at the moment of your
        request. Scores for Messaging &amp; Copy Clarity, UI/UX &amp; Visual Hierarchy, Conversion
        Rate Optimization, Technical &amp; Metadata Health, and Brand Distinctiveness are derived
        from heuristic signals detected in that HTML — for example, presence and length of title
        and meta tags, heading structure, image alt-text coverage, viewport configuration, form
        and call-to-action detection, and HTTPS usage.
      </p>

      <h2>Scores can vary</h2>
      <p>
        Because scoring depends on the exact HTML returned at request time — which can change due
        to A/B tests, caching, geolocation, logged-in state, or the site owner shipping updates —
        results may differ between runs on the same URL. A low score is not a definitive judgment
        of a site's quality, and a high score is not a guarantee of commercial performance.
      </p>

      <h2>Generated commentary</h2>
      <p>
        Verdict text and social promo copy are generated based on your computed scores, and may
        occasionally be generic or fail to reflect nuance a human reviewer would catch. If that
        generation is ever unavailable, the Service falls back to a rule-based text generator,
        which is deliberately conservative but similarly not a substitute for expert review.
      </p>

      <h2>No professional relationship</h2>
      <p>
        Use of Audityxe does not create a consulting, legal, accessibility-audit, or
        SEO-agency relationship between you and us. For decisions with real commercial,
        accessibility-compliance, or legal consequences, consult a qualified professional.
      </p>

      <h2>Third-party content</h2>
      <p>
        Screenshots, quoted snippets, and structural observations reflect the content of
        third-party websites at the time of the request. We do not claim ownership of, or
        endorse, any third-party site submitted to the Service.
      </p>

      <h2>Contact</h2>
      <p>
        If you believe a specific audit result is misleading or inaccurate, let us know via the{" "}
        <a href="/contact">Contact page</a>.
      </p>
    </LegalLayout>
  );
}
