import type { Metadata } from "next";
import { canonicalMeta } from "@/lib/seo";
import LegalLayout from "@/components/LegalLayout";

export const metadata: Metadata = {
  ...canonicalMeta("privacy"),
  title: "Privacy Policy — Audityxe",
  description: "How Audityxe collects, uses, and protects your data.",
};

export default function PrivacyPage() {
  return (
    <LegalLayout title="Privacy Policy" updated="August 2026">
      <p>
        This Privacy Policy explains what information Audityxe ("we", "us", "our") collects when
        you use the site-audit tool at this domain, and how that information is used, stored, and
        protected.
      </p>

      <h2>1. Information we collect</h2>
      <p>Running an audit requires a free account. We collect:</p>
      <ul>
        <li>
          Your email address and authentication identifier, via Firebase Authentication
          (email/password, Google, or GitHub sign-in).
        </li>
        <li>Your display name, if you set one.</li>
        <li>
          Your plan tier and daily usage count, so we can enforce fair per-account rate limits.
        </li>
        <li>The URL you enter, and any competitor URL you optionally provide, for that request.</li>
        <li>The publicly available HTML and HTTP response of the pages you submit, fetched at request time.</li>
        <li>
          Standard technical data such as your IP address, browser type, and request timestamps,
          collected automatically by our hosting infrastructure for security and abuse
          prevention.
        </li>
      </ul>

      <h2>2. What we deliberately don't store</h2>
      <p>
        Full audit results — scores, findings, fixes — are computed fresh for each request and
        returned directly to your browser. We do not save a copy of your full audit results on our
        servers, and there is no public report page or cross-account history feature. Once the
        response reaches your browser, keeping a copy (via the copy/export/share/email buttons on
        the results page) is entirely up to you.
      </p>
      <p>
        One narrow, deliberate exception: to power the embeddable badge at{" "}
        <a href="/badge">/badge</a>, we keep a per-domain record of the site's most recent overall
        score and the date it was audited — nothing else (no categories, fixes, HTML, or requester
        identity) is stored alongside it, and it isn't tied to any account.
      </p>

      <h2>3. How we use information</h2>
      <ul>
        <li>To fetch and analyze the submitted page and generate an audit report.</li>
        <li>To verify your identity and enforce per-account daily usage limits.</li>
        <li>To generate the written verdict and promotional copy accompanying your results.</li>
        <li>To maintain the security, stability, and abuse resistance of the service.</li>
      </ul>

      <h2>4. Third-party processing</h2>
      <p>
        A few requests made on your behalf go to third-party services, solely to produce your
        audit: a text-generation service writes the verdict and promo copy from your computed
        scores; Google's PageSpeed Insights service renders your submitted page in a real browser
        to measure performance and accessibility; and Pollinations.ai generates the banner's
        background art. None of these receive your account email, password, or any personal
        identifying information — only the URL being audited and its derived scores.
      </p>

      <h2>5. Data retention</h2>
      <p>
        Your account record (email, plan, usage counters) persists in our database (Firebase/
        Firestore) for as long as your account exists, and is deleted if you delete your account
        from Settings. Full audit results are not persisted at all — see Section 2, which also
        covers the one exception (the badge score/date record). Server logs used for security/
        abuse prevention are periodically purged.
      </p>

      <h2>6. Cookies</h2>
      <p>
        Audityxe does not use tracking or advertising cookies. Any strictly necessary
        cookies/local storage are limited to what's required for sign-in to function. See our{" "}
        <a href="/cookies">Cookie Policy</a> for details.
      </p>

      <h2>7. Your rights</h2>
      <p>
        You can export a copy of your account data or permanently delete your account (which
        removes your account record and usage data) at any time from{" "}
        <a href="/settings">Settings</a>. Depending on your jurisdiction, you may have additional
        rights to access, correct, or delete personal data — contact us if you need help beyond
        what Settings covers.
      </p>

      <h2>8. Children's privacy</h2>
      <p>
        Audityxe is not directed at children under 13, and we do not knowingly collect personal
        information from children.
      </p>

      <h2>9. Changes to this policy</h2>
      <p>
        We may update this Privacy Policy from time to time. Material changes will be reflected by
        updating the "Last updated" date above.
      </p>

      <h2>10. Contact</h2>
      <p>
        Questions about this policy can be sent via the <a href="/contact">Contact page</a>.
      </p>
    </LegalLayout>
  );
}
