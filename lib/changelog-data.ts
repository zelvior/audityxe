export interface ChangelogEntry {
  version: string;
  date: string;
  changes: string[];
}

export const CHANGELOG_ENTRIES: ChangelogEntry[] = [
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

