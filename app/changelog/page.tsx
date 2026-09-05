import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "Changelog — Audityxe",
  description: "What's new, fixed, and changed in Audityxe.",
};

const ENTRIES: { version: string; date: string; changes: string[] }[] = [
  {
    version: "1.5.0",
    date: "September 2026",
    changes: [
      "Renamed to \"Instant Site Audit & Pro Promo Kit\" — promo generation is now a Pro-only feature.",
      "Added a live SSL/TLS module: real certificate chain inspection (expiry, issuer, self-signed detection, hostname/SAN match, protocol version, cipher suite, key strength) via a direct TLS handshake.",
      "Added a live Email Authentication module: real DNS TXT lookups for SPF, DMARC policy, and DKIM on common selectors — flags permissive SPF (no -all) and unenforced DMARC (p=none).",
      "Added a Server Hardening module: safe OPTIONS/GET probes for dangerous HTTP methods (PUT/DELETE/TRACE/CONNECT), exposed config files (.env, .git/config, backups), and directory listing.",
      "Added a live DNS Security module: CAA record check (certificate-issuance restriction) and dangling-CNAME/subdomain-takeover detection against 20 known takeover-able service patterns (GitHub Pages, Heroku, S3, Azure, Netlify, Vercel, etc.).",
      "Added a Subresource Integrity & Source Maps module: flags cross-origin <script>/<link> tags missing an integrity attribute, and probes for publicly exposed .js.map files that leak unminified source.",
      "Expanded Security Headers with COOP, COEP, CORP, Permissions-Policy, HSTS max-age/includeSubDomains/preload, CSP unsafe-inline/unsafe-eval/wildcard detection, CORS misconfiguration checks, cookie Secure/HttpOnly/SameSite auditing, and sensitive-path Cache-Control checks.",
      "Accessibility module now also flags <iframe> elements missing a title attribute.",
      "Added a dedicated AI-Generated / Vibe-Coded Pattern Detection module — judges combined signal severity (gradients, glassmorphism, emojis, pill badges, generic icon rows, scroll animations, cursor glow, hover fades, grainy textures, oversized radii, generic font pairings, em dashes, buzzwords) rather than failing on any single occurrence.",
      "Objective UX/accessibility checks (font-family limit, placeholder-text detection) now score universally; subjective color/spacing/layout taste is never imposed as a universal rule.",
      "Fixed a bug where re-running an audit on an already-audited domain would not update its embeddable badge — the badge score was being saved under an inconsistently normalized host key (protocol/www/trailing-slash variations) that didn't match the badge lookup key.",
    ],
  },
  {
    version: "1.4.0",
    date: "September 2026",
    changes: [
      "Added kill switch and OTA hotfix banner for zero-deploy incident response.",
      "Fixed a runtime crash on /api/audit caused by an ESM/CJS conflict in a transitive dependency.",
      "Reworked the design system: new color tokens, flattened card surfaces, removed decorative gradients.",
      "Added Trust Center, DPA, Acceptable Use, and Third-Party Services pages.",
    ],
  },
  {
    version: "1.3.0",
    date: "August 2026",
    changes: [
      "Added Firebase email verification gate before running audits.",
      "Added Firestore-backed per-account daily rate limiting.",
      "Added SSRF protection on submitted URLs.",
      "Integrated PageSpeed Insights into the performance category.",
    ],
  },
  {
    version: "1.2.0",
    date: "July 2026",
    changes: [
      "Launched bulk audit for Pro accounts.",
      "Added competitor comparison view.",
      "Added shareable promo banner generation.",
    ],
  },
];

export default function ChangelogPage() {
  return (
    <main className="min-h-screen flex flex-col">
      <Header />
      <div className="flex-1 max-w-3xl mx-auto w-full px-4 sm:px-6 py-14 sm:py-20">
        <p className="font-mono text-xs text-text-secondary mb-2">CHANGELOG</p>
        <h1 className="font-display font-bold text-2xl sm:text-3xl mb-10">What's changed</h1>
        <div className="flex flex-col gap-8">
          {ENTRIES.map((e) => (
            <div key={e.version} className="glass rounded-card p-5 sm:p-6">
              <div className="flex items-baseline gap-3 mb-3">
                <span className="font-mono text-sm text-primary">v{e.version}</span>
                <span className="text-xs text-text-secondary">{e.date}</span>
              </div>
              <ul className="list-disc pl-5 space-y-1.5 text-sm text-text-secondary">
                {e.changes.map((c, i) => (
                  <li key={i}>{c}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
      <Footer />
    </main>
  );
}
