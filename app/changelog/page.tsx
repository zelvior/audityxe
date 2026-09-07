import type { Metadata } from "next";
import { canonicalMeta } from "@/lib/seo";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  ...canonicalMeta("changelog"),
  title: "Changelog — Audityxe",
  description: "What's new, fixed, and changed in Audityxe.",
};

const ENTRIES: { version: string; date: string; changes: string[] }[] = [
  {
    version: "1.6.0",
    date: "September 2026",
    changes: [
      "Fixed the real-browser (Lighthouse) opt-in for Pro accounts: it previously relied on a native window.confirm() dialog that could silently be skipped or blocked, and the app determined a signed-in user's plan from a previous audit's result, so a Pro user's very first audit of any session was always treated as \"free\" and never showed the option at all. Replaced with a proper in-app checkbox on the homepage, and the account plan is now fetched directly on load.",
      "Separated Score from Severity: every finding now carries its own severity independent of its module's aggregate score, so a module can score reasonably well and still be flagged critical because one finding (an exposed .env file, an expired certificate, HTTPS entirely absent) is severe on its own.",
      "Made generated fixes stack-aware: the same finding (e.g. an exposed X-Powered-By header) now produces a different, correct fix depending on the detected CMS/framework instead of a one-size-fits-all snippet, and the CSP fix is built from the page's actual third-party script/style/image/frame/font origins instead of a fixed boilerplate policy.",
      "Massively expanded Technical Stack fingerprinting: CMS + version detection, CSS framework, e-commerce platform, page builder, A/B-testing tool, cookie-consent tool, and hosting-provider detection, plus a confidence rating.",
      "Expanded DNS Security with MX records, NS records, nameserver provider-diversity (single-point-of-failure detection), and SOA presence; expanded Email Authentication with SPF DNS-lookup-limit counting against RFC 7208's hard cap of 10.",
      "Added a PDF export (in addition to JSON) with a full report layout — cover page, executive summary, per-module findings, PageSpeed lab metrics, fix snippets as syntax-colored diffs, promo copy, and competitor comparison. Both exports are now built from one shared function so they can never drift out of sync.",
      "Fixed a real PDF layout bug: a table library property that persists across pages was being read immediately after starting a new page, so the first table on several pages inherited a stale position from the previous page — producing large, incorrect blank gaps above the \"Audit modules\" and \"Recommended fixes\" sections. Replaced with an explicit, page-aware cursor.",
      "Added a real free-tier bug fix: anonymous visitors behind certain proxy configurations (or with no forwarding header at all) were all being bucketed under one shared IP-based quota, so the first anonymous audit from anyone would silently exhaust the free-audit allowance for everyone else. Added a proper header fallback chain and a per-client fallback fingerprint instead of one shared \"unknown\" bucket.",
      "Rebuilt the hero diagram and the login/register split-panel illustration: both mixed SVG viewBox coordinates (which scale with the container) with raw-pixel HTML element positions (which don't), causing connecting lines and floating elements to drift out of alignment with the boxes/badges they were supposed to connect to whenever the container wasn't exactly the assumed size. Fixed by pinning the hero diagram to a fixed coordinate box and switching the auth panel's badges to percentage-based positioning.",
      "Redesigned the homepage hero as a two-column layout with an animated audit-flow diagram, and moved the long-form SEO copy block off the homepage onto its own /guide page.",
      "Added Google Search Console verification (meta tag + HTML file).",
      "Surfaced real-browser performance metrics (LCP, CLS, TBT, FCP, Speed Index, and Lighthouse category scores) directly in the results UI — previously this data was only ever reachable via the JSON/PDF export, never shown in the app itself.",
    ],
  },
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
