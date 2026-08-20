import type { Metadata } from "next";
import LegalLayout from "@/components/LegalLayout";

export const metadata: Metadata = {
  title: "Terms of Service — Audityxe",
  description: "The terms governing your use of Audityxe.",
};

export default function TermsPage() {
  return (
    <LegalLayout title="Terms of Service" updated="August 20, 2026">
      <p>
        These Terms of Service ("Terms") govern your use of Audityxe (the "Service"). By using the
        Service, you agree to these Terms. If you do not agree, do not use the Service.
      </p>

      <h2>1. What the Service does</h2>
      <p>
        Audityxe fetches publicly accessible web pages you submit, analyzes their HTML for
        messaging, UI/UX, conversion, technical SEO, and brand signals, produces a numeric score
        and suggested fixes, and generates shareable social promo copy and a downloadable banner
        image.
      </p>

      <h2>2. Acceptable use</h2>
      <p>You agree not to use the Service to:</p>
      <ul>
        <li>Submit URLs you do not have the right to have analyzed or that violate another party's terms of service.</li>
        <li>Attempt to overload, abuse, or reverse engineer the Service or its underlying infrastructure.</li>
        <li>Submit content or URLs that are illegal, malicious, or designed to cause harm.</li>
        <li>Use automated scripts to send excessive volumes of requests without prior authorization.</li>
      </ul>

      <h2>3. No warranty on audit accuracy</h2>
      <p>
        Audit scores, fixes, and verdicts are generated automatically using heuristic analysis of
        publicly available HTML and, where configured, AI-generated commentary. They are provided
        for informational purposes only and do not constitute professional design, legal,
        accessibility, or SEO consulting advice. Scores may vary between runs and are not a
        certification of any kind.
      </p>

      <h2>4. Intellectual property</h2>
      <p>
        You retain all rights to any content or URLs you submit. Generated reports, banners, and
        promo copy are provided to you for your own use, including commercial use, without
        additional restriction from us. The Audityxe name, logo, and underlying software remain
        our property.
      </p>

      <h2>5. Third-party sites</h2>
      <p>
        When you submit a URL, the Service fetches that page's publicly available HTML directly
        from the target server. You are responsible for ensuring you are authorized to request
        that content. We are not responsible for the content, availability, or behavior of
        third-party websites you submit.
      </p>

      <h2>6. Disclaimer of warranties</h2>
      <p>
        The Service is provided "as is" and "as available" without warranties of any kind, express
        or implied, including but not limited to accuracy, completeness, or fitness for a
        particular purpose. See our full <a href="/disclaimer">Disclaimer</a>.
      </p>

      <h2>7. Limitation of liability</h2>
      <p>
        To the maximum extent permitted by law, Audityxe and its operators shall not be liable for
        any indirect, incidental, special, consequential, or punitive damages arising from your
        use of, or inability to use, the Service.
      </p>

      <h2>8. Changes to the Service or Terms</h2>
      <p>
        We may modify or discontinue the Service, in whole or in part, at any time. We may update
        these Terms periodically; continued use after changes constitutes acceptance of the
        revised Terms.
      </p>

      <h2>9. Governing law</h2>
      <p>
        These Terms are governed by applicable local law in the jurisdiction where the Service
        operator is established, without regard to conflict-of-law principles.
      </p>

      <h2>10. Contact</h2>
      <p>
        Questions about these Terms can be sent via the <a href="/contact">Contact page</a>.
      </p>
    </LegalLayout>
  );
}
