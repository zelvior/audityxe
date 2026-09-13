import type { Metadata } from "next";
import { canonicalMeta } from "@/lib/seo";
import LegalLayout from "@/components/LegalLayout";
import TrustBadges from "@/components/TrustBadges";

export const metadata: Metadata = {
  ...canonicalMeta("trust-center"),
  title: "Trust Center — Audityxe",
  description: "Security posture, data handling, and infrastructure practices behind Audityxe.",
};

export default function TrustCenterPage() {
  return (
    <LegalLayout title="Trust Center" updated="September 2026" path="trust-center">
      <p>
        Audityxe is a stateless audit tool: scans run against public HTTP responses and site
        manifests only, with no server access or code execution against the target site.
      </p>

      <h2>1. Data retention</h2>
      <p>
        Full audit results are computed per request and returned directly to you. They are not
        stored server-side beyond two narrow exceptions: the usage counter needed for rate
        limiting, and — solely to power the embeddable badge at{" "}
        <a href="/badge">/badge</a> — a per-domain record of your site's most recent overall score
        and audit date. No categories, fixes, HTML, or requester identity are stored alongside
        that record.
      </p>

      <h2>2. Account security</h2>
      <ul>
        <li>Authentication via Firebase Auth, with email verification required to run audits.</li>
        <li>Session tokens expire and are re-issued on sign-in; there is no persistent server-side session store.</li>
        <li>All traffic is served over HTTPS/TLS.</li>
      </ul>

      <h2>3. Infrastructure</h2>
      <p>
        Hosted on Vercel with Firebase (Auth + Firestore) as the backend. See the Third-Party
        Services page for the full sub-processor list.
      </p>

      <h2>3a. Email authentication (SPF, DKIM, DMARC)</h2>
      <p>
        Transactional email (verification links, password resets) is sent via Firebase
        Authentication's own mail infrastructure, which is already SPF/DKIM-aligned for its
        sending domain. If a custom sending domain is configured later, that domain's DNS must
        publish an SPF record authorizing the sender, DKIM signing keys, and a DMARC policy
        (starting at <code>p=none</code> for monitoring, then tightened to
        <code>p=quarantine</code>/<code>p=reject</code>) before it is used for authentication
        email.
      </p>

      <h2>4. Abuse prevention</h2>
      <p>
        IP-level and account-level rate limits, atomic quota checks, and duplicate/concurrent
        request protection are enforced on every audit request.
      </p>

      <h2>5. Live third-party verification signals</h2>
      <p>
        Independently run scans against audityxe.vercel.app — not self-reported. Click any badge
        to see the live report from that provider.
      </p>
      <div className="my-6">
        <TrustBadges />
      </div>
      <p>
        Want your own "Audited by Audityxe" badge for your site? Generate one at{" "}
        <a href="/badge">/badge</a>.
      </p>

      <h2>6. Reporting an issue</h2>
      <p>
        If you find a security issue, please report it via the Contact page rather than public
        disclosure.
      </p>
    </LegalLayout>
  );
}
