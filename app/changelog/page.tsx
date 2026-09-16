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
    version: "2.9.0",
    date: "September 2026",
    changes: [
      "Fixed the PageSpeed Insights timeout being far too short: 12s was aborting completely normal Lighthouse runs, which commonly take 15-40s (and can run longer on a slow page) — raised to 75s, with the audit route's own function time limit raised from 60s to 90s to give it room, and the Settings page's key-validation test call raised from 10s to 25s.",
      "Fixed two real mobile-responsiveness bugs: the bulk-audit results table and the pricing page's feature-comparison table were both wrapped in overflow-hidden, which silently clips wide table content instead of letting it scroll — on a narrow screen, columns past the edge were simply invisible with no way to reach them. Both now scroll horizontally within their own container instead.",
      "Wired up ESLint for the first time (it was an available but never-configured dependency) and ran a full lint pass across the codebase. The only findings, across every file, were a single purely-cosmetic rule (unescaped quote/apostrophe characters in JSX text, which has zero effect on rendering or the browser console) — confirmed there are no real hook-dependency bugs, missing-key bugs, or accessibility lint failures anywhere in the app. That one cosmetic rule is now intentionally disabled so linting stays active and useful for catching real issues going forward without blocking the build over stylistic text formatting.",
      "Spot-checked for hydration-risk patterns (Math.random()/Date.now() used during render rather than in an event handler or effect, which can cause a server/client mismatch) — found none; the two Date-based render usages that exist (a copyright year, a random game-target position from a ref-measured size) are both safe by construction.",
    ],
  },
  {
    version: "2.8.0",
    date: "September 2026",
    changes: [
      "Systematically audited every \"couldn't check this\" gate across the entire module builder (every .fetched/.checked guard) for the same scoring bug fixed in the Lighthouse module last release, and found six more real instances: TLS handshake failure, email-authentication DNS lookup failure, DNS security lookup failure, the server-hardening probe, source-map-exposure probe, and og:image live-verification — all were scoring a failed/skipped probe as a real \"medium-severity warning\" (quietly dragging the module's score down, or in the sole-finding cases producing a misleadingly specific partial score) instead of correctly excluding it from scoring as unverifiable. All six now behave like every other unverifiable finding: shown for transparency, excluded from the score.",
      "Verified, rather than assumed, that the `confidence` field on findings is genuinely wired end-to-end (UI badge, PDF suffix, JSON export) — it is, no gap found there.",
    ],
  },
  {
    version: "2.7.1",
    date: "September 2026",
    changes: [
      "Fixed a real fairness/efficiency gap in the weekly PageSpeed Insights limit: the shared-key quota slot was consumed the moment a real-browser pass was requested, before the PSI call even ran — so a single transient failure (a Google-side hiccup, a timeout, an outage) burned someone's entire week's one Lighthouse run for zero benefit. The slot is now automatically refunded when the request was counted against the shared limit but the PSI call itself came back empty, so people only spend their weekly pass on runs that actually produced data.",
    ],
  },
  {
    version: "2.7.0",
    date: "September 2026",
    changes: [
      "Changed PageSpeed Insights rate limiting: a person using their own PSI API key now gets a genuinely unlimited number of real-browser (Lighthouse) passes — no weekly counter is checked or incremented for them at all — instead of the previous raised-but-still-capped limit (10/week). Without a configured key, the existing shared-key limit (1/week on Pro) is unchanged.",
      "The \"Run a real-browser PageSpeed Insights pass\" checkbox on the homepage now says \"unlimited with your own API key\" instead of the generic weekly-quota text when the signed-in user has one configured.",
      "The locked-performance notice (shown when the weekly quota is used up) now points directly at adding a free PSI key in Settings as the fix, instead of just stating the quota was hit.",
    ],
  },
  {
    version: "2.6.2",
    date: "September 2026",
    changes: [
      "Replaced the short PSI-key setup blurb in Settings with a full click-by-click walkthrough (expand \"Show me the exact steps\") — sign-in, project creation, enabling the API, creating the key, and setting restrictions, with direct links at each relevant step, written for someone who has never opened Google Cloud Console before.",
      "Corrected the restriction guidance: previously suggested \"None or IP addresses\" as safe alternatives to an HTTP-referrer restriction. An IP-address restriction can also fail unpredictably on server hosting with non-fixed outbound IPs, so the guidance (in Settings, the save-time validation error, and the audit-time error message) now consistently recommends \"None\" only.",
    ],
  },
  {
    version: "2.6.1",
    date: "September 2026",
    changes: [
      "Added a direct link to Google's official PageSpeed Insights setup guide and a link straight to Google Cloud Console → Credentials in the Settings PSI key section, plus an explicit, highlighted warning to pick \"None\" or \"IP addresses\" (not \"HTTP referrers\") under Application restrictions when creating the key — with a plain explanation of why a referrer restriction can never work for a server-side call, since that's enforced by Google's API on their end and isn't something Audityxe's code can work around.",
    ],
  },
  {
    version: "2.6.0",
    date: "September 2026",
    changes: [
      "Fixed a real scoring bug: when a PageSpeed Insights run failed outright, the Lighthouse module was still computing and showing a numeric score (e.g. 6.5/10) from a single failure finding, which is actively misleading — that number implied partial real measurement when there was none. A module whose checks couldn't run at all now shows \"not scored\" instead of a fabricated number, in the UI, PDF, and JSON export alike.",
      "PageSpeed Insights error messages shown in the report no longer leak a raw Google Cloud Console URL with an internal project ID baked in — they're now cleaned up to keep just the actual explanation.",
      "The 403 (\"not authorized\") case now names the single most common real cause directly: an API key with an \"HTTP referrer\" restriction in Google Cloud Console, which only works for browser-originated calls — a server-side audit request has no referrer header, so a referrer-restricted key is rejected every time. This applies to both the site's own configured key and a user's BYOK key.",
      "The same referrer-restriction explanation now also appears immediately when saving a BYOK key in Settings, not just later during an audit.",
    ],
  },
  {
    version: "2.5.0",
    date: "September 2026",
    changes: [
      "Did a full pass cross-referencing every field the audit engine actually computes (DeepSignals + Signals, ~120 fields total) against what's actually surfaced in a finding, to find genuinely unwired data rather than guessing. Found and wired 11 real gaps: <nav>/<article>/<section> semantic-tag detection into the HTML Structure module's landmark check, HTML comment volume, a skip-to-content link check and link-count context in Accessibility, detected ad-network scripts and pricing signals in the relevant modules, and Twitter/Facebook social-tag completeness (twitter:creator, twitter:image, fb:app_id) in Social Metadata.",
      "Confirmed the remaining flagged fields were false positives, not real gaps: several structured-data type booleans (hasFaqPage, hasProduct, etc.) are derived from — and already redundant with — the schema types list already shown as text; buzzwordCount is redundant with the buzzwordsFound list already displayed; and a batch of Signals-level fields (hasFavicon, isHttps, ctaButtonCount, and others) are wired into the six scored category cards' own evidence narrative, a different part of the UI from the Full Deep Audit modules grid, not missing.",
    ],
  },
  {
    version: "2.4.0",
    date: "September 2026",
    changes: [
      "Fixed the real cause of the Lighthouse module vanishing entirely on failure (including with a custom/BYOK PageSpeed Insights API key): PageSpeed Insights failures were being swallowed silently with zero error information, and the Lighthouse module simply returned null whenever that happened — visually indistinguishable from Lighthouse never having been requested at all. It now always appears when a real-browser pass was requested, and shows the actual failure reason (invalid key, key not authorized for this API, quota exceeded, timeout, or the raw PSI error message) when it fails.",
      "Added live validation of a BYOK PageSpeed Insights key at save time (Settings page): it's now tested against the real PSI endpoint before being stored, so a mistyped or wrongly-restricted key is caught immediately with the actual reason, instead of silently saving and only failing much later during an audit.",
      "Surfaced the same failure/attempted state in both the JSON export (`performance.attempted` / `performance.errorMessage`) and the PDF export (a clear \"pass was requested but did not complete\" page with the real reason), not just the in-app module card.",
      "Verified every other module in the Full Deep Audit list (SEO, Performance, Security Headers, SSL/TLS, and the rest of the ~24 deep modules) renders with no hidden filtering or truncation in the UI — the module list component applies no slice/limit, only the visible critical/warning filter toggle the person controls themselves.",
    ],
  },
  {
    version: "2.3.0",
    date: "September 2026",
    changes: [
      "Audited the entire existing check library before adding anything (it already covers SPF/DKIM/DMARC, DNSSEC, CAA records, subdomain-takeover detection against 20 known services, exposed .env/.git/config-file scanning, directory-listing detection, per-cookie security flags, Subresource Integrity, CSP strength, JSON-LD type detection, and far more — all free and unlimited) to find genuine remaining gaps rather than duplicate existing coverage.",
      "Added duplicate <title> tag and duplicate canonical-tag detection to the SEO module — multiple of either is technically invalid HTML that browsers and search engines resolve unpredictably.",
      "Added a \"descriptive link text\" check to the Accessibility module — flags links whose entire visible text is a non-descriptive phrase like \"click here\" or \"read more,\" which leaves screen-reader users navigating a page's link list with zero context on where each one goes.",
      "All new checks (this release and the two before it) are computed entirely from data already fetched for the audit — zero added network requests, zero added load time.",
    ],
  },
  {
    version: "2.2.0",
    date: "September 2026",
    changes: [
      "Extended the AI Crawler Readiness (GEO) module with two new checks: whether the X-Robots-Tag HTTP response header blocks indexing independently of (and sometimes in conflict with) the HTML <meta name=\"robots\"> tag — a header-level block a check that only reads the visible page would miss entirely — and whether a noai/noimageai AI-training opt-out signal is present.",
      "Added a new target=\"_blank\" tabnabbing check to the Subresource Integrity module (now \"Subresource Integrity & Link Safety\"): flags links that open in a new tab without rel=\"noopener\"/\"noreferrer\", which otherwise hand the opened page a live window.opener reference back to the original tab.",
      "Both new checks required zero new network requests — they're computed from the same single page fetch and response headers Audityxe already has in memory for every audit, so they add real depth without adding load time.",
      "Re-verified after this addition that JSON export, PDF export, and the in-app module list all still read the modules/findings array generically with no hardcoded per-check list — the two new findings appear in all three automatically.",
    ],
  },
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
