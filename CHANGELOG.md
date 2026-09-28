# Changelog

The authoritative, always-current changelog is the in-product page at
[audityxe.vercel.app/changelog](https://audityxe.vercel.app/changelog), sourced directly from
`lib/changelog-data.ts`. This file mirrors the same entries in plain Markdown so they're readable
directly on GitHub, without running the app. If this file and `lib/changelog-data.ts` ever
disagree, `lib/changelog-data.ts` is the source of truth — please report the mismatch.

The CLI (`audityxe-cli`) and VS Code extension share the audit engine with the web app and are
versioned separately — see `cli/CHANGELOG.md` and `vscode-extension/CHANGELOG.md` for their own
release notes.

## 3.14.0 — September 2026

- Changed: the footer's free-backlinks row and the KittyLaunch verification badge moved off the
  site-wide footer to the Credits page — still fully live in the webapp, just not repeated on
  every page.
- Fixed: the footer's Discord icon was a generic chat-bubble icon, not the actual Discord logo —
  replaced with the real Discord mark.
- Fixed: a real license inconsistency — the vscode-extension package's copy of `LICENSE.md` had
  never been updated when the 35% revenue-share clause (Section 1B) was added to the root license,
  so its summary still read "redistribute — for free" with no mention of it. The in-app `/license`
  page had the same problem from an earlier era of the license, missing the design carve-out, the
  revenue share, and the AI-cloning instruction entirely. Both are now kept word-for-word
  consistent with the root `LICENSE.md`.
- Changed: license terms restructured for internal consistency and worldwide applicability. The
  grant of rights now states the personal-use-vs-Commercial-Redistributor split directly, rather
  than as a footnote contradicting the text above it. Section 1B rewritten with precise
  definitions — an Individual's personal use is unrestricted forever (explicitly modeled on how
  WinRAR has never been enforced against individual users), while a Commercial Redistributor (any
  company, startup, or organization, or an individual monetizing it) owes the fixed 35% revenue
  share. The Governing Interpretation section now states explicitly that the license is intended
  to be enforceable worldwide under any country's laws.
- New: this file, `SECURITY.md`, `CODE_OF_CONDUCT.md`, `.github/ISSUE_TEMPLATE/`,
  `.github/PULL_REQUEST_TEMPLATE.md`, and `.github/FUNDING.yml`. `CONTRIBUTING.md` gained a
  license-agreement section and a Code of Conduct pointer.
- New: PDF export gained a category radar/vector-metrics chart and a genuine filled pie chart of
  fail-severity distribution, alongside the existing score donut, module-status donut, and
  findings-by-outcome stacked bar.
- New: JSON export gained a `schemaVersion` field, a `summary` block (module/finding/severity
  counts), and the banner design now always included with an `aiGenerated` flag — previously it
  was hidden behind the promo lock even though a real value was always present regardless of plan.

## 3.13.1 — September 2026

- Released: `audityxe-cli` bumped to 1.2.0 (from 1.1.3) and the VS Code extension bumped to
  match, both packaging up the new CRO/TTFB modules, the deepened AI-search module, and the
  stricter scoring below.
- New: `cli/CHANGELOG.md` and `vscode-extension/CHANGELOG.md` — neither package previously had a
  dedicated changelog file.
- Added: `prepublishOnly` script to `cli/package.json` so `npm publish` can no longer ship a stale
  `dist/` that doesn't match `package.json`'s version.

## 3.13.0 — September 2026

- Fixed: the live scan-in-progress preview iframe was silently blocked for almost every real
  target site — the global CSP's `frame-src` only allowlisted a handful of fixed first-party
  domains, so the browser refused to even attempt embedding an arbitrary audited site. Fixed with
  a path-scoped CSP override applying only to `/`.
- New: the iframe overlays a real, server-sourced live activity feed as an audit actually
  progresses, sourced from a new `onProgress` callback on the audit engine.
- New: background audit jobs. Audits expected to run long (a real-browser Lighthouse pass, or a
  deep multi-hop crawl) can be started as a background job via an opt-in "Run in the background"
  checkbox — the analysis keeps running via `@vercel/functions`'s `waitUntil()` even if the tab or
  browser is closed.
- New: real Web Push notifications for background jobs — "Notify me when it's ready" registers a
  service worker and subscribes via the browser's `PushManager`; this is what survives the browser
  being fully closed, not just the tab being backgrounded.
- New: `/api/audit` and `/api/audit/start` now share one implementation of auth/quota/BYOK-key
  resolution so the two endpoints can't silently drift apart on validation or rate-limiting rules.
- New: `/api/cron/cleanup-jobs` prunes background job documents past their 24h TTL.

## 3.12.0 — September 2026

- New: **Conversion Rate Optimization (CRO)** module — CTA presence/placement, form length,
  tel:/mailto: contact links, mobile viewport correctness, and Organization/Review trust-signal
  schema. CRO already drove one of the 6 top-level category scores, but previously had no
  findings-level breakdown anywhere in the report.
- New: **TTFB (Time to First Byte)** module — graded against Google's official Core Web Vitals
  thresholds (good <800ms, needs improvement <1800ms, poor ≥1800ms) instead of the looser bands
  folded into the general Performance module.
- Changed: the GEO/AEO module relabeled to "AI Search & Agent Optimization (AIO / AEO / GEO /
  LLMO / AI SEO / LLM SEO / AAO / ACO)" — six industry-buzzword synonyms for the same underlying
  discoverability question, checked together rather than split into duplicate cards. Added two
  new findings: an Organization/entity-schema authorship signal (an E-E-A-T-style signal AI
  answer engines weigh when deciding what to cite), and an agent-readiness check (ARIA landmarks,
  form-input labeling) for autonomous browsing agents specifically.
- Changed: scoring made stricter across the board, both at the module level and the 6 top-level
  category level. See the in-app Scoring model documentation and `/methodology` for the full
  rationale.
- New: PDF export gained a module-status donut and a findings-by-outcome stacked bar.

## Earlier releases

See [audityxe.vercel.app/changelog](https://audityxe.vercel.app/changelog) for the full history —
this file starts from the release this project adopted a root-level `CHANGELOG.md`.
