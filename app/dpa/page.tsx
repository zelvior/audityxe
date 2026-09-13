import type { Metadata } from "next";
import { canonicalMeta } from "@/lib/seo";
import LegalLayout from "@/components/LegalLayout";

export const metadata: Metadata = {
  ...canonicalMeta("dpa"),
  title: "Data Processing Agreement — Audityxe",
  description: "Terms governing how Audityxe processes personal data on behalf of account holders.",
};

export default function DpaPage() {
  return (
    <LegalLayout title="Data Processing Agreement" updated="September 2026" path="dpa">
      <p>
        This Data Processing Agreement ("DPA") supplements the Audityxe Terms of Service and
        applies to the extent Audityxe processes personal data on your behalf as part of the
        audit tool.
      </p>

      <h2>1. Roles</h2>
      <p>
        For account data (email, plan tier, usage counters) you are the data controller and
        Audityxe is the data processor. For the URLs you submit for auditing, you are responsible
        for having the right to request an audit of that domain.
      </p>

      <h2>2. Scope of processing</h2>
      <ul>
        <li>Account identifiers and authentication data, processed via Firebase Authentication.</li>
        <li>Usage and rate-limit counters, stored in Firestore.</li>
        <li>Submitted URLs and the public HTTP/HTML response fetched from them at request time.</li>
      </ul>

      <h2>3. Sub-processors</h2>
      <p>
        Audityxe uses Vercel for hosting and Google Firebase for authentication and data storage.
        See the Third-Party Services page for the full list.
      </p>

      <h2>4. Security measures</h2>
      <p>
        Data in transit is encrypted via TLS. Access to Firestore is restricted by security rules
        scoped to the authenticated account. Audit fetches are outbound-only and do not execute
        submitted page content.
      </p>

      <h2>5. Data deletion</h2>
      <p>
        Deleting your account removes your user and usage documents. Audit results are not
        retained after a response is returned, so there is nothing further to delete on that
        front.
      </p>

      <h2>6. Contact</h2>
      <p>
        For DPA questions, contact us via the Contact page.
      </p>
    </LegalLayout>
  );
}
