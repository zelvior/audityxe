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
    version: "2.1.0",
    date: "September 2026",
    changes: [
      "Replaced the homepage's tile-swap puzzle with a full \"Audit Defender\" mini-game: a 60-second, 32-issue, multiple-choice find-the-bug challenge spanning all six audit categories (SEO, Performance, Security, Accessibility, UI/UX, Mobile), with live score/accuracy tracking and a final letter grade. Desktop-only by design — it no longer renders at all on mobile viewports.",
      "Reverted the brand mark back to the actual uploaded logo artwork (a previous pass had substituted a hand-redrawn vector approximation). Reprocessed the original file with a proper flood-fill background removal — background is now only ever removed where it's actually reachable from the canvas edge, instead of a flat color-distance threshold — plus edge-color un-blending to remove the pale fringe that kept showing up around the strokes.",
      "Verified end-to-end that the audit engine's module list (UI cards, JSON export, and PDF export) all read from the same generic modules/findings array with no hardcoded per-module id list anywhere — confirming the AI Crawler Readiness (GEO) module and the keyboard-focus accessibility check added last release require no extra wiring and already appear correctly in every surface, including the live sample report (which runs a real audit, not a static fixture).",
    ],
  },
  {
    version: "2.0.0",
    date: "September 2026",
    changes: [
      "Full visual redesign off the old dark \"AI-purple\" gradient palette onto a warm-editorial rust/paper theme (Fraunces + Public Sans typography, hand-drawn underline/highlight marks), then rebuilt again as a proper light/dark theme that now follows the visitor's OS-level color-scheme preference automatically — every color token resolves through CSS custom properties instead of fixed hex, so nothing needed a manual toggle.",
      "Replaced the brand mark: the previous logo was a cropped, recolored raster export of an uploaded image and never got fully crisp no matter how the edges were cleaned up. Rebuilt it as a hand-coded vector (open \"A\" outline with an integrated checkmark + dot), rendered inline with theme-aware colors in the app itself, and re-exported the favicon/apple-icon/manifest icons from that same vector with a genuinely transparent background (the old favicon had a stray cream box behind it on dark browser chrome).",
      "Removed the static homepage audit-flow diagram entirely and replaced it with an interactive tile-swap puzzle of the six audit steps — shuffled with a fresh random seed on every visit, so it's different for every visitor instead of a fixed illustration.",
      "Added a new \"AI Crawler Readiness (GEO)\" audit module: real checks for a root llms.txt and for whether robots.txt explicitly blocks any named AI answer-engine crawler (GPTBot, ClaudeBot, PerplexityBot, Google-Extended, and others) — a distinct question from classic search-engine crawlability.",
      "Added a new accessibility check: flags CSS that suppresses the keyboard focus outline (outline: none/0) with no visible :focus/:focus-visible replacement, one of the most common ways a site becomes unusable by keyboard.",
      "Both new checks flow through the existing JSON and PDF export builder automatically (it reads modules/findings generically, nothing was hardcoded to a fixed module list) — verified in this pass rather than assumed.",
      "Added a Credits page crediting every real tool, framework, font, and interactive-component source used to build Audityxe, wired into the footer; added a full custom open-source LICENSE (attribution-required) with its own in-app /license page, also wired into the footer.",
      "Removed all box-shadow/glow effects site-wide per direct feedback — flat borders and background tints only, including the hover-reveal footer button and the homepage puzzle's scan-style highlight.",
      "Redesigned the footer (from a flat wall of 19 links to grouped columns with a brand block) and the legal-page layout (icon badge, hand-underlined title, status pill) across all legal/credits/license pages, which share one layout component.",
      "Fixed a real duplicate-module bug: the audit engine was independently building two near-identical Lighthouse/PageSpeed modules under different names, crowding each other in the results list. Removed the redundant one and renamed the surviving module to \"Lighthouse Audit\" to match the homepage's own wording.",
      "Corrected several homepage/pricing/FAQ copy references to a stale, no-longer-accurate \"17-area\" deep-audit count now that the module list has grown further.",
    ],
  },
  {
    version: "1.9.0",
    date: "September 2026",
    changes: [
      "Removed the admin site-wide theme system entirely (the color-token architecture, the Theme tab, and the per-request theme read it required) and went back to one fixed, deliberately-chosen dark palette — a product decision, not a bug.",
      "Fixed a real CSS bug: the site's font @import was being silently ignored by browsers because it sat after the Tailwind directives instead of at the very top of the stylesheet (browsers require @import to be the first rule). Verified directly in the compiled CSS output that it's now first.",
      "Fixed the password show/hide icon: it wasn't actually misaligned — Chromium-based Edge injects its own native reveal-password icon directly on top of custom ones, and the two were colliding. Suppressed Edge's native icon so only ours renders, and swapped a hardcoded hover color for a theme-safe one while touching the file.",
      "Fixed long requestAnimationFrame handlers (65-100ms) on the homepage: the audit-flow diagram was animating stroke-dasharray on ~15 SVG paths simultaneously on mount, which forces per-frame path-geometry recomputation on the main thread. Switched all but the one 'hero' connector to plain opacity fades, which run on the compositor instead.",
      "Refactored the audit-flow diagram's line rendering for real precision: every connector now sets vector-effect=\"non-scaling-stroke\" so stroke width stays exact regardless of the diagram's responsive CSS scale (the actual cause of lines looking jagged at narrower widths — not the path math, which was already a clean symmetric bezier), plus shape-rendering tuned per element (crispEdges for the perfectly axis-aligned bus lines, geometricPrecision for the curves). The final results connector now has its own matching accent-colored arrowhead instead of sharing the muted one.",
      "Removed \"Pro Promo Kit\" as a marketing label from the homepage headline, meta title/description, OG image, and the about page — the underlying feature (generating shareable post copy) is unchanged and still Pro-gated, just no longer branded that way in copy.",
    ],
  },
  {
    version: "1.8.0",
    date: "September 2026",
    changes: [
      "Redesigned the homepage's audit-flow diagram: the five checks now merge onto a single vertical bus before one clean line continues to the results node, replacing the old design where all five outgoing lines converged on the exact same pixel and visibly knotted together next to the results card. Every node also got a proper colored icon chip and a visible border, and the whole diagram now scales as one unit at narrower `lg`/`xl` widths instead of risking getting cropped by its frame.",
      "Fixed the admin theme control actually taking effect: the site's static pages were being generated once at build/deploy time and served unchanged forever, so a new theme picked in the admin dashboard never reached anyone. Pages now revalidate on a short interval so an admin's theme choice reaches every visitor within about 30 seconds, as originally intended. The sample-report page's own expensive live audit is now cached independently of that faster page-level interval, so this didn't turn into 100x more real audits being run against the demo target.",
      "Added a proper Lighthouse module: the real-browser PageSpeed Insights data (performance/accessibility/best-practices/SEO scores, Core Web Vitals, real-world field data, top issues) previously only showed up in the JSON/PDF export — it now appears as its own card in the Full Deep Audit list in the app itself, scored and filterable the same way as every other module.",
    ],
  },
  {
    version: "1.7.0",
    date: "September 2026",
    changes: [
      "Ran a full technical SEO/GEO audit and closed the remaining gaps: added public/llms.txt and llms-full.txt for AI-crawler discovery, and added BreadcrumbList structured data to every nested content page (methodology, guide, FAQ, pricing, sample-report, and all legal/trust pages via a shared LegalLayout `path` prop) — the rest of the SEO surface (robots, sitemap, canonical/OG/Twitter meta, Organization/WebSite/SoftwareApplication/FAQPage schema, security headers) was already correct and needed no changes.",
      "Redesigned the whole app off the generic \"AI-purple\" gradient palette onto a single locked dark-tech accent (emerald — reads as \"verified/passing\", which fits an audit product) across every color token, replacing every hardcoded violet hex left over from the old palette (badge route, auth side panel, promo banner canvas, error shell, and two leftover raw SVG stroke colors in the homepage hero diagram).",
      "Fixed a layout bug in the homepage hero diagram where \"Lighthouse Audit\" and \"Score + fixes\" broke out of their pill boxes — the node widths were sized for shorter labels than the component actually renders.",
      "Rebuilt the color system on CSS variables so it can be re-themed at runtime with zero rebuild: added 6 complete themes (Dark Tech, Electric Blue, Amber Signal, Crimson Alert, Monochrome, Paper Light).",
      "Added a site-wide theme control, admin-only: a new Theme tab in the admin dashboard lets an admin pick the active theme for the entire site; there is no per-user theme override anywhere in the app. The choice is read server-side on every page render and applied before first paint, so visitors never see a flash of the wrong theme. Changes propagate to all visitors within about 30 seconds.",
    ],
  },
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
        <h1 className="font-display font-bold text-2xl sm:text-3xl mb-10">What's <span className="hand-underline">changed</span></h1>
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
