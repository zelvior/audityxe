import type { Metadata } from "next";
import LegalLayout from "@/components/LegalLayout";

export const metadata: Metadata = {
  title: "Privacy Policy — Audityxe",
  description: "How Audityxe collects, uses, and protects your data.",
};

export default function PrivacyPage() {
  return (
    <LegalLayout title="Privacy Policy" updated="August 20, 2026">
      <p>
        This Privacy Policy explains what information Audityxe ("we", "us", "our") collects when
        you use the site-audit tool at this domain, and how that information is used, stored, and
        protected.
      </p>

      <h2>1. Information we collect</h2>
      <p>When you submit a URL for audit, we process:</p>
      <ul>
        <li>The URL you enter, and any competitor URL you optionally provide.</li>
        <li>The publicly available HTML of the pages you submit, fetched at request time.</li>
        <li>
          Standard technical data such as your IP address, browser type, and request timestamps,
          collected automatically by our hosting infrastructure for security and abuse
          prevention.
        </li>
      </ul>
      <p>We do not require an account, email address, or payment information to run an audit.</p>

      <h2>2. How we use information</h2>
      <ul>
        <li>To fetch and analyze the submitted page and generate an audit report.</li>
        <li>To generate AI-assisted verdict and promotional copy via third-party AI providers.</li>
        <li>To maintain the security, stability, and abuse resistance of the service.</li>
        <li>To improve the accuracy of the audit engine over time.</li>
      </ul>

      <h2>3. Third-party processing</h2>
      <p>
        Audit copy (verdicts and promo text) may be generated using Google's Gemini API. The URL,
        computed category scores, and derived summary text are sent to this provider solely to
        generate that copy. We do not send your personal browsing data or account information, as
        we do not collect any.
      </p>

      <h2>4. Data retention</h2>
      <p>
        Audit results are generated on demand and are not persisted in a database by default.
        Submitted URLs and generated results may be temporarily cached in server memory or logs
        for debugging and abuse-prevention purposes, and are periodically purged.
      </p>

      <h2>5. Cookies</h2>
      <p>
        Audityxe does not use tracking or advertising cookies. Any strictly necessary cookies are
        limited to what's required for the site to function. See our{" "}
        <a href="/cookies">Cookie Policy</a> for details.
      </p>

      <h2>6. Your rights</h2>
      <p>
        Depending on your jurisdiction, you may have the right to request access to, correction
        of, or deletion of any personal data we hold about you. Since we do not require accounts
        and do not persist personal data beyond operational logs, most requests can be resolved by
        confirming what limited technical data (e.g. IP address in server logs) may exist for a
        given time window.
      </p>

      <h2>7. Children's privacy</h2>
      <p>
        Audityxe is not directed at children under 13, and we do not knowingly collect personal
        information from children.
      </p>

      <h2>8. Changes to this policy</h2>
      <p>
        We may update this Privacy Policy from time to time. Material changes will be reflected by
        updating the "Last updated" date above.
      </p>

      <h2>9. Contact</h2>
      <p>
        Questions about this policy can be sent via the <a href="/contact">Contact page</a>.
      </p>
    </LegalLayout>
  );
}
