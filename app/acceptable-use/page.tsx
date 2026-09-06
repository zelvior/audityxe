import type { Metadata } from "next";
import { canonicalMeta } from "@/lib/seo";
import LegalLayout from "@/components/LegalLayout";

export const metadata: Metadata = {
  ...canonicalMeta("acceptable-use"),
  title: "Acceptable Use Policy — Audityxe",
  description: "Rules for acceptable use of the Audityxe audit tool.",
};

export default function AcceptableUsePage() {
  return (
    <LegalLayout title="Acceptable Use Policy" updated="September 2026">
      <p>By using Audityxe, you agree not to:</p>

      <h2>1. Prohibited use</h2>
      <ul>
        <li>Submit URLs you do not have authorization to audit.</li>
        <li>Attempt to bypass, script around, or automate past daily rate limits.</li>
        <li>Use multiple accounts, IPs, or sessions to circumvent quota enforcement.</li>
        <li>Probe, scan, or attempt to exploit Audityxe's own infrastructure or API.</li>
        <li>Use the promo/copy generation features to produce misleading claims about a site's audit results.</li>
        <li>Resell or redistribute audit output as your own automated service without permission.</li>
      </ul>

      <h2>2. Enforcement</h2>
      <p>
        Accounts or IPs showing suspicious activity — including request patterns consistent with
        automation, quota evasion, or abuse — may be rate-limited further or banned without
        notice.
      </p>

      <h2>3. Reporting abuse</h2>
      <p>Report suspected misuse via the Contact page.</p>
    </LegalLayout>
  );
}
