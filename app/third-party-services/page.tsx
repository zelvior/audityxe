import type { Metadata } from "next";
import LegalLayout from "@/components/LegalLayout";

export const metadata: Metadata = {
  title: "Third-Party Services — Audityxe",
  description: "Sub-processors and third-party services used to operate Audityxe.",
};

export default function ThirdPartyServicesPage() {
  return (
    <LegalLayout title="Third-Party Services" updated="September 2026">
      <p>Audityxe relies on the following third-party services to operate:</p>

      <h2>1. Infrastructure</h2>
      <ul>
        <li><strong>Vercel</strong> — hosting, serverless functions, edge network.</li>
        <li><strong>Google Firebase</strong> — authentication (Firebase Auth) and data storage (Firestore).</li>
      </ul>

      <h2>2. Audit &amp; AI features</h2>
      <ul>
        <li><strong>PageSpeed Insights (Google)</strong> — performance metrics used in the audit engine.</li>
        <li><strong>TokenRouter</strong> — AI model access for promo copy generation (Standard/Pro only).</li>
        <li><strong>Pollinations AI</strong> — promo image generation.</li>
      </ul>

      <h2>3. Monitoring</h2>
      <ul>
        <li><strong>UptimeRobot</strong> — public uptime status monitoring.</li>
      </ul>

      <p>
        None of these providers receive your submitted audit URLs beyond what is strictly needed
        to compute the requested metric (e.g. PageSpeed Insights processes the URL you submit).
      </p>
    </LegalLayout>
  );
}
