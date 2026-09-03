import type { Metadata } from "next";
import LegalLayout from "@/components/LegalLayout";

export const metadata: Metadata = {
  title: "Trust Center — Audityxe",
  description: "Security posture, data handling, and infrastructure practices behind Audityxe.",
};

export default function TrustCenterPage() {
  return (
    <LegalLayout title="Trust Center" updated="September 2026">
      <p>
        Audityxe is a stateless audit tool: scans run against public HTTP responses and site
        manifests only, with no server access or code execution against the target site.
      </p>

      <h2>1. Data retention</h2>
      <p>
        Audit results are computed per request and returned directly to you. They are not stored
        server-side beyond the usage counter needed for rate limiting.
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

      <h2>5. Live signals</h2>
      <p>
        <a href="https://observatory.mozilla.org/analyze/audityxe.vercel.app" target="_blank" rel="noopener noreferrer">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://img.shields.io/mozilla-observatory/grade-score/audityxe.vercel.app?style=flat-square"
            alt="Mozilla HTTP Observatory Grade"
            width={160}
            height={20}
          />
        </a>
      </p>
      <p>
        Want your own "Audited by Audityxe" badge? Generate one at{" "}
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
