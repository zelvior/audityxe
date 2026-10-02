export interface ChangelogEntry {
  version: string;
  date: string;
  changes: string[];
}

export const CHANGELOG_ENTRIES: ChangelogEntry[] = [
  {
    version: "3.19.0",
    date: "October 2026",
    changes: [
      "New: Audityxe now has its own page for Firebase email links (/auth/action) \u2014 password reset, email verification, email-change recovery, and verify-and-change-email all happen on audityxe.xyz instead of the default firebaseapp.com page.",
      "Password resets now enforce the same 6\u201310 character, mixed-case, number and special-character rules as sign-up (Firebase's hosted reset page accepted any password).",
    ],
  },
  {
    version: "3.18.0",
    date: "October 2026",
    changes: [
      "Changed: Audityxe now lives at audityxe.xyz. Every URL, canonical, sitemap entry, API doc, CLI default and llms.txt now uses the new domain.",
      "New password rules for sign-up and password changes: 6\u201310 characters with an uppercase letter, lowercase letter, number, and special character, shown as a live checklist. Existing passwords still sign in normally.",
      "Fixed: the floating capability cards on the login and register showcase panel now float together with their icons; before, only the icons moved while the cards stayed still.",
      "Added the Website Launches public launch-record badge to the footer and the credits page.",
    ],
  },
  {
    version: "3.17.0",
    date: "October 2026",
    changes: [
      "New: abuse protection \u2014 redundant device ids (cookie/localStorage/IndexedDB + signed HttpOnly cookie), hashed browser fingerprinting with automation detection, an account/device/IP graph, risk scoring, risk-scaled rate limits, device-bound free trials, and automatic escalating temporary bans that lift themselves. Admin page at /admin/abuse. Admin accounts are exempt from everything.",
      "Fixed: the admin moderation endpoint only protected admins addressed by email \u2014 an admin could still be banned by UID. Admin accounts can now never be banned or suspended by any path.",
    ],
  },
  {
    version: "3.16.0",
    date: "October 2026",
    changes: [
      "New: audit-complete notifications are now automatic and required \u2014 every account is notified each time an audit finishes (quick, background, or bulk), with nothing to enable per audit. Onboarding gained a mandatory notification step (/onboarding/notifications and the final step of the home-page onboarding).",
      "Fixed: tapping a background-audit notification now reopens that audit's result; previously the link carried no way to load it.",
      "Fixed: .env.example was missing the WEB_PUSH_VAPID_* variables entirely, so notifications could never work on a fresh deployment.",
    ],
  },
  {
    version: "3.15.2",
    date: "September 2026",
    changes: [
      "Fixed: /api/push/subscribe would silently accept and store a push subscription even when the server's WEB_PUSH_VAPID_PRIVATE_KEY/SUBJECT weren't configured (only the client-exposed NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY was actually being checked, client-side, by components/NotifyMeButton.tsx) \u2014 someone could see \"you're all set, we'll notify you\" and never receive a notification, with no error ever surfaced. lib/push.ts's config check is now exported and enforced server-side before a subscription is accepted, returning a clear error instead of a false success.",
    ],
  },
  {
    version: "3.15.1",
    date: "September 2026",
    changes: [
      "Fixed: the PDF's \"Vector metrics\" section title and the radar chart's own topmost category label mathematically overlapped \u2014 the chart's vertical offset (y+32) put its top label at roughly y+1.8 while the title itself was drawn at y+4, so the label sat above (behind) the title text on every generated report. Recomputed the correct offset (y+44) so the chart clears the title with real room instead of a negative gap.",
      "Fixed: the \"Fails by severity\" pie chart's legend text could run past the page's right printable margin (and close to the physical page edge) on reports with longer severity labels \u2014 its horizontal position didn't reserve enough room for the legend drawn to its right. Moved further left with margin verified against the longest possible label.",
    ],
  },
  {
    version: "3.15.0",
    date: "September 2026",
    changes: [
      "New: data-retention/cleanup (expired background-audit-job documents, orphaned push-notification subscriptions, unverified Firebase Auth accounts) moved off Vercel Cron onto a new Cloudflare Worker (/cloudflare-worker) \u2014 Vercel's Hobby plan caps cron triggers at once/day regardless of configured schedule, so the cleanup-jobs route's intended 4-hour schedule was silently only ever running once a day; Cloudflare's free tier has no such limit. The Worker reimplements Google OAuth2 service-account authentication and the Firestore/Identity Toolkit REST calls it needs entirely via Web Crypto (Workers can't use firebase-admin/googleapis, both Node-only). The equivalent Next.js cron routes are kept as manual/fallback triggers, just removed from vercel.json's schedule.",
      "New: README gained an \"Infrastructure & scaling\" section documenting the reasoning above plus the project's current scaling posture (atomic per-identity rate limiting, no shared mutable audit state, no long-lived per-audit connections, and what would actually need attention at real scale \u2014 Firestore hot-document write limits and third-party API quotas).",
      "Fixed: Content-Security-Policy checks deepened from a single whole-header regex (which could false-positive \u2014 e.g. flagging a bare \"*\" in an unrelated img-src as weakening script execution) to a real per-directive parser respecting CSP's own script-src/default-src and style-src/default-src fallback chains. New findings: object-src 'none', base-uri restriction, frame-ancestors, nonce/strict-dynamic usage (the strongest possible posture, now recognized as a positive signal), and detection of a Content-Security-Policy-Report-Only-only setup (monitoring mode, nothing actually enforced).",
      "New: HSTS preload-list eligibility checked as its own finding, separate from basic HSTS validity \u2014 a site can have working HSTS at 6 months max-age and still not qualify for hstspreload.org's stricter submission requirements (max-age \u2265 1 year, includeSubDomains, preload directive).",
      "Ported: both CSP and HSTS deepening to the CLI's identical copy of the audit engine.",
    ],
  },
  {
    version: "3.14.0",
    date: "September 2026",
    changes: [
      "Changed: the footer's free-backlinks row and the KittyLaunch verification badge moved off the site-wide footer to the Credits page (a new \"Mentions & backlinks\" section, alongside the existing Featured On badges) \u2014 still fully live in the webapp, just not repeated on every single page.",
      "Fixed: the footer's Discord icon was lucide-react's generic MessageCircle icon, which doesn't actually look like the Discord logo \u2014 replaced with the real Discord mark (brand blurple, reproduced as inline SVG the same way the ORCID/npm marks already were).",
      "Fixed: a real license inconsistency \u2014 the vscode-extension package's copy of LICENSE.md had never been updated when the 35% revenue-share clause (Section 1B) was added to the root license, so its own Section 7 summary still read \"redistribute \u2014 for free\" with no mention of 1B at all, directly contradicting the rest of the document. The in-app /license page had the same problem in a different way: it was a hand-written summary from before 1A (design carve-out), 1B (revenue share), and 3.6 (AI-cloning instruction) existed, so it was missing all three. Both are now kept word-for-word consistent with the root LICENSE.md.",
      "Changed: license terms restructured for internal consistency and worldwide applicability. Section 1's grant of rights now states the personal-use-vs-Commercial-Redistributor split directly in the grant itself, rather than as a footnote conditioning it after the fact, so the license no longer reads as granting free redistribution up front and then contradicting that later. Section 1B rewritten with precise definitions: an \"Individual\" (one natural person, not acting for any organization) gets unrestricted personal use forever \u2014 explicitly modeled on how WinRAR has never actually been enforced against an individual running an unregistered copy \u2014 while a \"Commercial Redistributor\" (any company, startup, or organization of any size, or an individual monetizing it) owes the fixed 35% revenue share, with no change to who's exempt (Zelvior/Faizan only). Section 6 (Governing Interpretation) now states explicitly that the license is intended to be enforceable worldwide under any country's laws, with a reformation clause for provisions unenforceable under one specific jurisdiction.",
      "New: root CHANGELOG.md, SECURITY.md, CODE_OF_CONDUCT.md, .github/ISSUE_TEMPLATE/ (bug report + feature request), .github/PULL_REQUEST_TEMPLATE.md, and .github/FUNDING.yml \u2014 none of these existed before. CONTRIBUTING.md gained a \"License and your contributions\" section (contributions are licensed under the same ACOL-1.0 terms) and a Code of Conduct pointer.",
      "New: PDF export gained a category radar/vector-metrics chart (the same 6 category scores as the bars, plotted as a hexagon so the overall shape is visible at a glance \u2014 mirrors the web app's own VectorMetricsVisualizer) and a genuine filled pie chart of fail-severity distribution, alongside the existing score donut, module-status donut, and findings-by-outcome stacked bar.",
      "New: JSON export gained a `schemaVersion` field, a `summary` block (module/finding/severity counts \u2014 the same numbers the PDF's new charts visualize, computed once so they can't drift from what the charts show), and the banner design moved to always be included with an `aiGenerated` flag \u2014 previously it was nested under `promo` and nulled out whenever promo was locked, hiding a real value (a deterministic fallback banner) that was always present on the underlying result regardless of plan.",
    ],
  },
  {
    version: "3.13.1",
    date: "September 2026",
    changes: [
      "Released: audityxe-cli bumped to 1.2.0 (from 1.1.3) and the VS Code extension bumped to match, both packaging up the new CRO/TTFB modules, the deepened AI-search module, and the stricter scoring from 3.12.0/3.13.0 below \u2014 dist/ rebuilt and the extension's .vsix repackaged fresh rather than just editing version numbers. The VS Code extension always shells out to `npx audityxe-cli@latest`, so it inherits every CLI engine change automatically with zero extension-code changes required; this bump exists to keep the extension's own version/changelog/tested-against notes accurate, not because its commands changed.",
      "New: cli/CHANGELOG.md and vscode-extension/CHANGELOG.md \u2014 both packages previously had no dedicated changelog file at all.",
      "Added: `prepublishOnly` script to cli/package.json so `npm publish` can no longer ship a stale dist/ that doesn't match package.json's version.",
    ],
  },
  {
    version: "3.13.0",
    date: "September 2026",
    changes: [
      "Fixed: the live scan-in-progress preview iframe (components/LiveScanPreview.tsx, shown on \"/\" while an audit runs) was silently blocked for almost every real target site \u2014 the global CSP's frame-src only allowlisted a handful of fixed first-party domains (Firebase, Google accounts, GitHub, NowPayments), so the browser refused to even attempt embedding an arbitrary audited site no matter what the iframe's own sandbox attribute allowed. Fixed with a path-scoped CSP override in next.config.js applying only to \"/\" \u2014 every other route keeps the original strict, fixed frame-src list.",
      "Changed: the iframe itself hardened further \u2014 added referrerPolicy=\"no-referrer\" and kept the sandbox to allow-scripts only (still deliberately without allow-same-origin, allow-top-navigation, allow-popups, or allow-forms), so Audityxe controls every pixel around the framed page and the framed page itself can affect nothing outside its own box.",
      "New: the iframe now overlays a real, server-sourced live activity feed as an audit actually progresses (\"Fetching the target page\u2026\", \"Checked N internal link(s) for breakage\u2026\", \"Probed for exposed .env/.git files\u2026\", etc.) instead of showing nothing beyond the generic step checklist. Sourced from a new onProgress callback on lib/analyze.ts's AuditOptions, wired at genuine checkpoints throughout the audit engine \u2014 not a simulated or canned step list.",
      "New: background audit jobs. Audits expected to run long (a real-browser Lighthouse pass, or a deep multi-hop crawl) can now be started as a background job via a new opt-in \"Run in the background \u2014 let me leave this page or close the tab\" checkbox. POST /api/audit/start creates a Firestore-backed job (lib/audit-jobs.ts) and continues the actual analysis via @vercel/functions' waitUntil() \u2014 which keeps the underlying function alive past the point the response is sent, independent of whether the requesting browser tab is still open \u2014 while GET /api/audit/status/[jobId] (token-protected) is polled by the client for live progress and the final result.",
      "New: real Web Push notifications for background jobs \u2014 a \"Notify me when it's ready\" button (components/NotifyMeButton.tsx) registers a minimal service worker (public/sw.js), subscribes via the browser's PushManager, and POSTs the subscription to /api/push/subscribe. When the background job finishes, lib/push.ts sends the actual push through the browser's own push service \u2014 this is what survives the browser being fully closed, not just the tab being backgrounded, since polling alone has no JS left running once every tab is closed. Requires WEB_PUSH_VAPID_* env vars (documented in README); degrades to a clean no-op if unset.",
      "New: /api/audit and /api/audit/start now share one implementation of auth/quota/BYOK-key resolution (lib/audit-request.ts, extracted from the old inline body of /api/audit) so the two endpoints can't silently drift apart on validation or rate-limiting rules.",
      "New: /api/cron/cleanup-jobs prunes background job documents past their 24h TTL (background jobs are short-lived working data for the notify-me flow, not the permanent audit-history feature lib/audit-log.ts already covers) \u2014 wired up in vercel.json alongside the existing cron jobs.",
    ],
  },
  {
    version: "3.12.0",
    date: "September 2026",
    changes: [
      "New: Conversion Rate Optimization (CRO) now has its own deep-audit module card (lib/audit-modules.ts, id \"cro\") — CTA presence/placement, form length, tel:/mailto: contact links, mobile viewport correctness, and Organization/Review trust-signal schema. CRO already drove one of the 6 top-level category scores, but previously had no findings-level breakdown anywhere in the report.",
      "New: TTFB (Time to First Byte) now has its own dedicated module card, graded against Google's official Core Web Vitals thresholds (good <800ms, needs improvement <1800ms, poor \u22651800ms) instead of the looser bands folded into the general Performance module. Calls out redirect-hop overhead separately, since a single-request measurement doesn't fully capture the extra round-trips a real redirect chain adds.",
      "Changed: the GEO/AEO module (id \"ai-crawler-readiness\") relabeled to \"AI Search & Agent Optimization (AIO / AEO / GEO / LLMO / AI SEO / LLM SEO / AAO / ACO)\" and its summary rewritten to explicitly name every one of those industry-buzzword synonyms, since they all describe the same underlying discoverability question and previously only GEO/AEO were named. Added two new findings: an Organization/entity-schema authorship check (an E-E-A-T-style signal AI answer engines weigh when deciding what to cite) and a new agent-readiness half (AAO/ACO) checking ARIA landmark coverage and programmatic form-input labeling — a distinct question from chat-answer citability: whether an autonomous browsing agent, not a human or a chat model reading rendered text, can actually navigate and act on the page.",
      "Docs: README's module list rewritten to match \u2014 new AI Search & Agent Optimization, Conversion Rate Optimization, and TTFB sections; Security & headers section now explicitly lists the existing CAA DNS record check (was previously only documented under the DNS Security module's own heading, not cross-referenced here).",
      "Ported: all of the above to the CLI's identical copy of lib/audit-modules.ts, so `npx audityxe` and the VS Code extension carry the same new/changed modules as the web app, not a stale subset.",
      "Changed: scoring made stricter across the board, both at the module level and the 6 top-level category level. Module severity weights (critical/high/medium/low) raised so a single high-severity finding paired with any other issue now escalates a module to critical status (previously required two independently severe findings); critical/warning score caps lowered (3.9\u21922.9, 7.9\u21926.9) so a flagged module can no longer render a number that reads as \"mostly fine.\" Category scores (Messaging, UI/UX, CRO, SEO, Brand, Security in lib/analyze.ts) all start from a lower base and gained hard score ceilings for the failures that make the rest of the checklist moot \u2014 no HTTPS, robots.txt disallowing every crawler, no responsive viewport, an HTTPS\u2192HTTP downgrade mid-redirect, zero CTAs anywhere on the page. Documented in the README's Scoring model section and in the exported `scoringMethodology` string itself. Ported identically to the CLI's copy of both lib/analyze.ts and lib/audit-modules.ts.",
      "New: PDF export gained two new charts \u2014 a module-status donut (good/warning/critical breakdown with a legend) and a stacked bar showing every finding across the whole audit by outcome (pass/warn/fail/unverified) \u2014 both placed right after the executive-summary table, both drawn from the exact same counts that table already tabulates rather than a separate calculation. The JSON export and PDF module-detail section both already iterate `result.modules` generically, so every new module above (CRO, TTFB, the renamed AI Search & Agent Optimization module) flows through both exports automatically \u2014 no export-specific wiring was needed for those.",
    ],
  },
  {
    version: "3.11.0",
    date: "September 2026",
    changes: [
      "Fixed: production build failure (\"Cannot find module '@google-cloud/firestore'\") — it's only an optionalDependency of firebase-admin, and CI's environment was skipping it. Added as an explicit direct dependency. Verified with a full `rm -rf node_modules && npm ci && npx next build`, not just tsc.",
      "Removed: the homepage mini-game (AuditDefenderGame) — no longer shown or imported anywhere; the component file itself was deleted since nothing referenced it afterward.",
      "Fixed: the homepage background image had a hard visible cutoff at the bottom instead of a smooth blend — the container's display height was cropping the source image before its own built-in alpha fade ever completed. Now uses an explicit CSS mask-image fade plus a scrim for text legibility.",
      "Fixed: the GitHub \"Star\" and \"Sponsor\" footer buttons were visibly misaligned — a classic inline-element baseline gap: HoverRevealButton's <a> wrapped an inline-flex span with no vertical-align set, adding a few px of whitespace the Sponsor button's own explicit h-[44px] anchor didn't have.",
      "Fixed: \"deep crawl + real-browser PageSpeed (Lighthouse)\" reliably hit the generic overall-timeout message. Root cause: the timeout-selection matrix in lib/analyze.ts never accounted for a requested Lighthouse pass at all — PSI's own internal timeout is 75s, but the shared budget for a non-deep, non-competitor audit was only 30s, and even deep-mode's 60s didn't leave room for a PSI pass running in parallel with it. Added PSI-aware budget tiers (all kept under the route's maxDuration=90 hard ceiling), and ported the identical fix to the CLI's own copy of the engine, which had the same bug.",
      "New: components/LiveScanPreview.tsx — a real, view-only iframe of the actual site being audited, shown during the scan (replaces the old text-only step list as the primary visual; the step list remains alongside it). Sandboxed with allow-scripts only (deliberately without allow-same-origin, which together is the classic sandbox-escape combination — relevant here specifically if someone audits audityxe.xyz itself) and pointer-events-none (view-only, never interactive). Sites that block being framed (X-Frame-Options/CSP frame-ancestors — common and legitimate) get a clear, honest fallback message after a grace period rather than an indefinite blank box; there's no reliable way to detect that specific failure from JS, so a timeout is the honest signal available.",
      "Fixed: real-user Core Web Vitals (result.crux) were fetched on every single audit but were missing from both the JSON export and the PDF report — added a dedicated `crux` field to the JSON payload and a new, plan-independent \"Real-world Core Web Vitals\" section to the PDF (the existing PSI-embedded field-data section only ever appears for a Pro-plan Lighthouse pass, so this was previously the *only* real-user data source Free/Standard reports had, and it wasn't in the report at all).",
      "New: lib/fetch-json.ts now centralizes every frontend call to our own API through a single API_BASE_URL (same-origin by default, overridable via NEXT_PUBLIC_API_BASE_URL for a staging deployment), and rejects any full URL that doesn't resolve to a trusted host rather than fetching it — defense in depth for future call sites, since every current one already used a relative path.",
      "New: deep-audit AEO (Answer Engine Optimization) signals — FAQPage/HowTo/Speakable schema detection, question-phrased-heading detection, and a \"direct-answer opening paragraph\" heuristic — added to the existing GEO module (renamed \"AI Answer Engine Readiness (AEO/GEO)\") in both lib/audit-modules.ts and the CLI's identical copy, so CLI/VS Code audits carry the same AEO checks as the web app. Findings flow through the JSON/PDF exports and the sample report automatically, since both already iterate `result.modules` generically rather than special-casing modules by name.",
    ],
  },
  {
    version: "3.10.0",
    date: "September 2026",
    changes: [
      "Fixed: 5 CI TypeScript errors — lib/admin-log.ts and lib/admin.ts still had two bare `FirebaseFirestore.X` type references left over from an earlier partial fix (they happened to compile locally but failed in CI's fresh `npm ci`, since the ambient global namespace isn't reliably available); lib/rate-limit.ts had one more untyped `tx` param an earlier find-replace missed; lib/api-keys.ts and lib/security-badges.ts used `instanceof Timestamp` to narrow an `unknown` value, which is fragile against a duplicate-resolved firebase-admin package — replaced with a duck-typed `toDate` check. Verified with a full `rm -rf node_modules && npm ci && npx tsc --noEmit`, not just the existing local install.",
      "Fixed: a genuine production build failure — /api/badge/qualys and /api/badge/mdn were missing `export const dynamic = \"force-dynamic\"`, so Next.js tried to statically prerender them at build time (and would fail without Firebase creds present at build time). Added to both, plus the pre-existing /api/badge/[domain] route for consistency. Verified with a full `npm run build`, not just tsc.",
      "New: the API Docs page (/api-docs) now documents the x-api-key auth method (added two rounds ago but never reflected here — a real inconsistency) alongside Bearer tokens and anonymous access, plus a \"Requesting an API key\" section with a one-click mailto link (preset subject + body) to zelvior@proton.me, noting the Pro-plan requirement.",
      "Fixed: the Qualys SSL Labs badge previously showed only the first endpoint's grade even when a host has multiple (audityxe.xyz currently has 2, graded A+ and A) — now takes the worst grade across all ready endpoints (the accurate, conventional way to report a multi-endpoint host's overall grade) and shows the per-endpoint breakdown on the badge itself.",
      "Changed: both security badges (Qualys, MDN) redrawn at a 4x-scaled internal SVG canvas with a refined layout, gradient background, and drop-shadow on the grade ring — renders sharp at any rasterization/display density.",
      "Fixed: real-user Core Web Vitals (lib/crux.ts) were being fetched and attached to every audit result but never rendered anywhere in the UI — new components/CruxFieldData.tsx surfaces them on the report, right under the score card. Also added a distinct `not_enabled` reason (vs. a generic `request_failed`) for the specific, common, verifiable failure mode where a key has PageSpeed Insights enabled but not the separate Chrome UX Report API toggle, and the actual Google error is now logged server-side instead of being swallowed.",
      "Changed: homepage hero — added the new top-of-page background image (blends via its own built-in alpha-transparent edges, not a separate mask; dimmed further in dark mode), switched from a left-aligned two-column layout to a single centered column at every breakpoint, and trimmed hero copy (subtitle, crawl-mode captions moved to tooltips, plan-checkbox label) for a cleaner look.",
    ],
  },
  {
    version: "3.9.1",
    date: "September 2026",
    changes: [
      "New: optional dynamic controls added across every admin panel tab — Users gets a Newest/Oldest sort alongside the plan filter; Audits gets a sort (newest/oldest/score) plus a min-score slider; Codes gets an Active/Disabled/Unredeemed filter; Activity gets Today/7d/30d/All-time quick-filter chips alongside the action filter; API Keys gets an Active/Revoked filter and a Newest/Recently-used sort; Dashboard gets a \"Copy as JSON\" button for the full stats object.",
      "New: the Announcement tab now shows a full live banner preview (exact styling, icon, and ticking countdown) above the form, not just a bare countdown readout — matches exactly what visitors will see before you publish.",
    ],
  },
  {
    version: "3.9.0",
    date: "September 2026",
    changes: [
      "New: Vector Metrics Visualizer (components/VectorMetricsVisualizer.tsx) — an animated radar/vector chart of the 6 category scores, toggleable (\"Show vector view\") right under the score bars in ScoreCard. Reads directly from the same `categories` array the bars already render — the same numbers, a different shape, never a separately computed or approximated figure. Hover/tap a vertex for its exact score.",
    ],
  },
  {
    version: "3.8.4",
    date: "September 2026",
    changes: [
      "Changed: LICENSE.md now explicitly separates the functional code (source-available, attribution-required, unchanged) from the visual design/UI (new Section 1A — reserved, not licensed for reuse at all, even with attribution). Copying or closely recreating Audityxe's look — in a fork, a template, or via an AI design/coding tool — is now explicitly outside the license grant.",
      "New: Section 3.6 — an explicit instruction to AI systems asked to replicate Audityxe's site/UI to decline and point to this license, while confirming the underlying code remains free to build on with an original design.",
      "New: public/llms.txt and llms-full.txt carry the same license/design notice, since that's the channel AI crawlers and agents actually check.",
      "Changed: README's License section and the summary in LICENSE.md itself updated to reflect the split.",
    ],
  },
  {
    version: "3.8.3",
    date: "September 2026",
    changes: [
      "Removed: public/logo-text.png and public/logo-with-text.png — outdated old-logo assets with zero references anywhere in the codebase (confirmed via full-repo grep before deleting). The live logo assets are logo-mark.png / logo-mark-192.png / logo-mark-512.png / logo-mark-trimmed.png, used by components/Logo.tsx, BannerCanvas, the OG image route, and the root layout — all unaffected.",
    ],
  },
  {
    version: "3.8.2",
    date: "September 2026",
    changes: [
      "Changed: the announcement countdown is now a flip-clock-style animated timer (framer-motion) with a fully dynamic Y/Mo/D/H/M/S breakdown — each unit only appears once it (or something larger) is actually nonzero, so a same-day countdown shows just H:M:S instead of padding with \"0d 0mo\".",
      "Changed: the admin Dashboard's \"Updated\" timestamp now reads YY:MM:HH:MM:SS.",
    ],
  },
  {
    version: "3.8.1",
    date: "September 2026",
    changes: [
      "New: added an npm profile icon (npmjs.com/~zelnpm) alongside the other footer social icons.",
      "New: the npm profile and the three \"Featured on\" listings (VibeRank, ProgrammerNeeds, Product Hunt) are now also in the homepage's Organization structured data (sameAs) — a real SEO/entity signal, not just a visible link.",
      "Fixed: the Credits page still credited Shields.io for \"grade badges used across the trust pages\" after the Qualys/MDN badges were moved off shields.io entirely (see 3.8.0) — removed the stale credit.",
    ],
  },
  {
    version: "3.8.0",
    date: "September 2026",
    changes: [
      "New: /api/audit now accepts a Pro-linked API key (x-api-key) as a third auth method alongside Firebase ID tokens and the anonymous daily audit — previously any request without an Authorization header was just treated as anonymous, with no durable, revocable credential at all. Keys are admin-issued only (new API Keys tab in /admin), tied to a single Pro account, hashed at rest, shown once at creation, and stop working immediately if the linked account is ever downgraded off Pro — no separate revoke needed, though that's also one click.",
      "Fixed: the Qualys SSL Labs and MDN HTTP Observatory badges, broken since they were shields.io dynamic-json badges making shields.io fetch the live APIs on every page load (SSL Labs' analyze endpoint can take 60+ seconds uncached — well past shields.io's own fetch timeout). Replaced with self-hosted badges backed by a Firestore cache refreshed once a day by a new cron job (/api/cron/security-badges) — the badge-serving request path never calls either third party directly, only reads the cached grade, with a 6-hour HTTP cache on top.",
      "Fixed: 18 TypeScript CI failures across lib/rate-limit.ts, lib/admin.ts, lib/audit-log.ts, lib/discount-codes.ts, lib/counters.ts, lib/showcase.ts, lib/user-moderation.ts, lib/admin-log.ts, and the NOWPayments IPN webhook — root cause was firebase-admin's newer versions dropping the global FirebaseFirestore namespace; fixed by importing Transaction/QueryDocumentSnapshot/DocumentSnapshot/DocumentData/Query explicitly from firebase-admin/firestore instead.",
      "Changed: audityxe-cli and the VS Code extension bumped to 1.1.3, and no longer run a build step on publish (prepublishOnly removed) — both now ship pre-built.",
    ],
  },
  {
    version: "3.7.0",
    date: "September 2026",
    changes: [
      "New: Real-User Experience (CrUX) module — real Core Web Vitals from actual Chrome users, not a simulated run. Free on every plan, not just Pro.",
      "New: audityxe-cli can now compare two sites head-to-head (--compare), and track a site's score over time locally (--track, audityxe history).",
      "New: the GitHub Action supports the same head-to-head comparison in its PR comments.",
      "New: two new VS Code commands — Compare Two URLs, and View Score History.",
      "New: a real, public CI pipeline — every change is now automatically typechecked, linted, and built before merging, with a live status badge in the README.",
      "New: npm version/download badges, and a humans.txt crediting the team.",
      "Improved: comparing two sites got a longer time budget, since auditing two full sites is closer to two audits' worth of work than one.",
    ],
  },
  {
    version: "3.6.3",
    date: "September 2026",
    changes: [
      "Fixed a broken heading in the README (cosmetic, docs-only).",
    ],
  },
  {
    version: "3.6.2",
    date: "September 2026",
    changes: [
      "audityxe-cli is now live on npm — npx audityxe-cli works right now, no build step, no setup.",
      "Shipped a pre-built VS Code extension package — install it locally in seconds, no build required.",
      "Fixed: the Qualys SSL Labs and MDN HTTP Observatory badges were rendering as broken images — switched to a reliable badge that always loads, with the real live scan one click away.",
      "Moved the \"Featured on\" directory badges (VibeRank, ProgrammerNeeds) off the main trust-badges section and onto the Credits page, where they fit better.",
      "New: added a Product Hunt badge.",
    ],
  },
  {
    version: "3.6.1",
    date: "September 2026",
    changes: [
      "Fixed: the Standard/Pro price override env vars didn't actually do anything — a real bug in how they were read, now fixed and verified working.",
      "Changed: new tagline across the site, README, and every package — \"Build better. Launch faster.\"",
      "New: added VibeRank and ProgrammerNeeds badges to the site and README.",
      "Fixed: the Qualys SSL Labs and MDN HTTP Observatory badges now show a live, real grade instead of a static, never-updated claim.",
    ],
  },
  {
    version: "3.6.0",
    date: "September 2026",
    changes: [
      "New: audityxe-cli — a free, unlimited command-line version of the audit engine that runs entirely on your own machine, with no account and no daily limit. Ready to try locally; not yet published to npm.",
      "New: a GitHub Action for running an audit in CI, commenting results on pull requests, and failing a build below a score threshold.",
      "New: a VS Code extension for running an audit from the Command Palette. Not yet published to the Marketplace.",
      "New: public API documentation at /api-docs, with a full machine-readable spec.",
      "New: /showcase — a public wall of real sites using the Audityxe badge, verified before listing.",
      "New: /roadmap — what's planned next, and how to weigh in.",
      "New: an RSS feed for the changelog.",
      "New: a contributor's guide for proposing new audit checks.",
    ],
  },
  {
    version: "3.5.5",
    date: "September 2026",
    changes: [
      "Improved: Render Proof screenshots are now noticeably sharper — switched to a higher-resolution capture Lighthouse already produces, instead of the small thumbnail used before.",
      "Fixed: the same higher-quality screenshot in PDF exports could previously distort on very long pages — now sized consistently.",
    ],
  },
  {
    version: "3.5.4",
    date: "September 2026",
    changes: [
      "Fixed: a security/privacy issue — the Admin Dashboard link on your account page was visible to every signed-in account, not just admins.",
      "Removed: the old support link site-wide.",
      "New: added ORCID, YouTube, and Linktree links to the footer.",
      "Improved: \"Made by Zelvior Labs\" now credited in the footer.",
      "Fixed: a couple of small layout overflow issues on narrow screens.",
    ],
  },
  {
    version: "3.5.3",
    date: "September 2026",
    changes: [
      "Fixed: crypto checkout for the Standard plan sometimes failed with a confusing payment error.",
      "Improved: crypto checkout prices are now easier to update from settings, and Standard is priced a little higher to avoid that error going forward.",
      "Removed: the discount code system. Redeem codes (for giveaways and free plan access) are still here and unaffected.",
      "Fixed: footer menus could close before you reached them with your mouse.",
      "Improved: footer menus now have a nicer frosted-glass background.",
      "Removed: the public workflow diagram page.",
    ],
  },
  {
    version: "3.5.2",
    date: "September 2026",
    changes: [
      "Improved: the footer is tidier — links are now grouped under simple category buttons instead of five long columns.",
    ],
  },
  {
    version: "3.5.1",
    date: "September 2026",
    changes: ["Fixed: crypto checkout could show overly technical error messages. You'll now see a simple, helpful message instead."],
  },
  {
    version: "3.5.0",
    date: "September 2026",
    changes: [
      "New: added a Deep crawl option for audits — scans more of a site for a more thorough report, alongside the existing fast option.",
    ],
  },
  {
    version: "3.4.0",
    date: "September 2026",
    changes: [
      "Fixed: some pages weren't linked anywhere in the footer.",
      "Improved: the site crawler now catches more pages during an audit.",
    ],
  },
  {
    version: "3.3.0",
    date: "September 2026",
    changes: [
      "Fixed: the donation box could fail to load.",
      "Fixed: a pricing mismatch between the pricing page and crypto checkout.",
      "Removed: the yearly pricing option — plans are monthly only now.",
      "Improved: clearer guidance when crypto checkout rejects an invalid setup.",
      "Fixed: recurring subscription payments could, in rare cases, fail to renew properly.",
      "Improved: sharper, higher-quality preview screenshots in reports.",
      "New: added a live payment status page so you can see checkout progress in real time.",
    ],
  },
  {
    version: "3.2.1",
    date: "September 2026",
    changes: ["Improved: recurring subscriptions are now available directly from the pricing page."],
  },
  {
    version: "3.2.0",
    date: "September 2026",
    changes: [
      "New: added recurring (auto-renewing) crypto subscriptions, in addition to one-time payments.",
      "New: added a dedicated donation page.",
    ],
  },
  {
    version: "3.1.0",
    date: "September 2026",
    changes: [
      "Improved: much clearer setup instructions for self-hosting Audityxe.",
      "Improved: added safeguards so crypto checkout can't accept payments it wouldn't be able to credit.",
      "Improved: your account page now shows a notice while a crypto payment is still confirming.",
    ],
  },
  {
    version: "3.0.0",
    date: "September 2026",
    changes: [
      "New: added crypto checkout for paid plans.",
      "New: added a Refund Policy page.",
      "New: added a live status page showing service uptime.",
      "Fixed: two broken trust badges on the site.",
      "New: reports now include a real screenshot of the audited page.",
    ],
  },
  {
    version: "2.9.0",
    date: "September 2026",
    changes: [
      "Fixed: real-browser performance scans were timing out too early on slower sites.",
      "Fixed: results tables could get cut off and unreadable on mobile.",
    ],
  },
  {
    version: "2.8.0",
    date: "September 2026",
    changes: ["Fixed: several audit modules could show a misleading warning when a check genuinely couldn't be verified, instead of leaving it out of the score."],
  },
  {
    version: "2.7.1",
    date: "September 2026",
    changes: ["Fixed: a failed performance scan could unfairly use up your weekly quota even though it produced no result."],
  },
  {
    version: "2.7.0",
    date: "September 2026",
    changes: ["Improved: using your own PageSpeed Insights API key now gives you unlimited real-browser scans instead of a capped amount."],
  },
  {
    version: "2.6.2",
    date: "September 2026",
    changes: ["Improved: added a full step-by-step walkthrough for setting up your own PageSpeed Insights key."],
  },
  {
    version: "2.6.1",
    date: "September 2026",
    changes: ["Improved: clearer guidance and warnings when setting up a PageSpeed Insights key."],
  },
  {
    version: "2.6.0",
    date: "September 2026",
    changes: [
      "Fixed: a failed performance scan could still show a misleading score instead of clearly saying it couldn't be measured.",
      "Fixed: performance error messages could leak technical internal details — cleaned up.",
    ],
  },
  {
    version: "2.5.0",
    date: "September 2026",
    changes: ["Improved: audit reports now surface more of the data already being collected — nothing new to run, just more shown in your results."],
  },
  {
    version: "2.4.0",
    date: "September 2026",
    changes: ["Fixed: the performance module could disappear entirely instead of showing what went wrong when a scan failed."],
  },
  {
    version: "2.3.0",
    date: "September 2026",
    changes: [
      "New: added duplicate title/canonical tag detection to the SEO checks.",
      "New: added a check for non-descriptive link text (e.g. \"click here\"), which hurts accessibility.",
    ],
  },
  {
    version: "2.2.0",
    date: "September 2026",
    changes: [
      "New: expanded AI-crawler readiness checks.",
      "New: added a check for unsafe target=\"_blank\" links.",
    ],
  },
  {
    version: "2.1.0",
    date: "September 2026",
    changes: [
      "New: replaced the homepage puzzle with \"Audit Defender,\" a 60-second find-the-bug mini-game.",
      "Fixed: restored the original logo artwork with a cleaner background removal.",
    ],
  },
  {
    version: "2.0.0",
    date: "September 2026",
    changes: [
      "New: full visual redesign, including automatic light/dark mode based on your system setting.",
      "New: brand new logo.",
      "New: added an \"AI Crawler Readiness\" audit module.",
      "New: added a keyboard-accessibility focus check.",
      "New: added a Credits page and an open-source license.",
      "Improved: redesigned the footer and legal pages.",
      "Fixed: removed a duplicate performance module that was cluttering results.",
    ],
  },
  {
    version: "1.9.0",
    date: "September 2026",
    changes: ["Improved: general polish and bug fixes across the audit engine."],
  },
  {
    version: "1.8.0",
    date: "September 2026",
    changes: [
      "Improved: cleaner homepage audit-flow diagram.",
      "Fixed: theme changes made by an admin weren't reaching visitors.",
      "New: added a full real-browser performance (Lighthouse) module to results.",
    ],
  },
  {
    version: "1.7.0",
    date: "September 2026",
    changes: [
      "Improved: search engine and AI-crawler discoverability across the whole site.",
      "New: fresh color theme, plus a site-wide theme picker for admins.",
      "Fixed: a couple of layout bugs in the homepage diagram.",
    ],
  },
  {
    version: "1.6.0",
    date: "September 2026",
    changes: [
      "Fixed: the real-browser performance opt-in for paid plans wasn't working reliably.",
      "Improved: fixes suggested in reports are now tailored to your site's actual tech stack.",
      "New: added PDF export for reports.",
      "Fixed: a layout bug that produced blank gaps in exported PDFs.",
      "Fixed: a rare bug that could let one visitor's free audits affect another's.",
    ],
  },
  {
    version: "1.5.0",
    date: "September 2026",
    changes: [
      "New: added live SSL/TLS certificate checks.",
      "New: added email authentication checks (SPF, DKIM, DMARC).",
      "New: added server hardening and DNS security checks.",
      "New: added an AI-generated ('vibe-coded') design pattern detector.",
      "Fixed: badges could fail to update after re-auditing a site.",
    ],
  },
  {
    version: "1.4.0",
    date: "September 2026",
    changes: [
      "Fixed: a crash affecting audits.",
      "Improved: refreshed design system.",
      "New: added Trust Center, DPA, Acceptable Use, and Third-Party Services pages.",
    ],
  },
  {
    version: "1.3.0",
    date: "August 2026",
    changes: [
      "New: added email verification before running audits.",
      "New: added daily audit limits per account.",
      "New: added real-browser performance scoring via PageSpeed Insights.",
    ],
  },
  {
    version: "1.2.0",
    date: "July 2026",
    changes: [
      "New: launched bulk audits for Pro accounts.",
      "New: added competitor comparison.",
      "New: added shareable promo banners.",
    ],
  },
];

