import type { Metadata } from "next";
import LegalLayout from "@/components/LegalLayout";

export const metadata: Metadata = {
  title: "Cookie Policy — Audityxe",
  description: "How Audityxe uses cookies and similar technologies.",
};

export default function CookiesPage() {
  return (
    <LegalLayout title="Cookie Policy" updated="August 20, 2026">
      <p>
        This Cookie Policy explains how Audityxe uses cookies and similar local storage
        technologies when you visit this site.
      </p>

      <h2>1. What are cookies</h2>
      <p>
        Cookies are small text files stored on your device by your browser. They can be used to
        remember information about your visit, such as preferences, or to help a site function
        correctly.
      </p>

      <h2>2. What we use</h2>
      <ul>
        <li>
          <strong>Strictly necessary storage:</strong> used only to keep the audit interface
          functioning correctly during your session (for example, remembering your selected tone
          while you browse results). This data stays in your browser and is not sent to any
          analytics or advertising service.
        </li>
        <li>
          <strong>No tracking or advertising cookies:</strong> Audityxe does not use third-party
          advertising cookies, cross-site tracking pixels, or behavioral profiling cookies.
        </li>
        <li>
          <strong>No analytics cookies by default:</strong> if analytics are ever added, this
          policy will be updated in advance and, where legally required, consent will be
          requested.
        </li>
      </ul>

      <h2>3. Third-party requests</h2>
      <p>
        When you run an audit, your browser communicates only with our own server. Our server, in
        turn, fetches the page you submitted and, where AI copy generation is enabled, sends
        derived audit data (not cookies) to the Gemini API. No cookies from your browser are
        shared with that provider.
      </p>

      <h2>4. Managing cookies</h2>
      <p>
        Most browsers let you control or delete cookies through their settings. Because Audityxe
        does not rely on cookies for core functionality, disabling cookies in your browser should
        not prevent you from running audits.
      </p>

      <h2>5. Changes to this policy</h2>
      <p>
        We may update this Cookie Policy as the Service evolves. Material changes will be
        reflected by updating the "Last updated" date above.
      </p>

      <h2>6. Contact</h2>
      <p>
        Questions about this policy can be sent via the <a href="/contact">Contact page</a>.
      </p>
    </LegalLayout>
  );
}
