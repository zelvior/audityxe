# Changelog

The authoritative, always-current changelog is the in-product page at
[audityxe.xyz/changelog](https://audityxe.xyz/changelog), sourced directly from
`lib/changelog-data.ts`. This file mirrors the same entries in plain Markdown so they're readable
directly on GitHub, without running the app. If this file and `lib/changelog-data.ts` ever
disagree, `lib/changelog-data.ts` is the source of truth — please report the mismatch.

The CLI (`audityxe-cli`) and VS Code extension share the audit engine with the web app and are
versioned separately — see `cli/CHANGELOG.md` and `vscode-extension/CHANGELOG.md` for their own
release notes.

## 3.17.1 — September 2026

- Fixed: CLI `--max` and `--ultra` flags were documented in the help text but never
  actually parsed — `ParsedArgs` was missing the fields and `parseArgs` had no `case`
  for them, so the flags were silently ignored and every `--max`/`--ultra` run fell
  back to fast mode. Added the missing fields and switch cases.
- Fixed: CLI engine's timeout matrix only handled `fast` and `deep` — `max` and `ultra`
  modes had no timeout constants wired in, so they used the 30s default (far too small
  for a 50–100 page crawl). Added the full set of `MAX_*` and `ULTRA_*` timeout
  constants and the complete timeout-matrix branching, kept in sync with `lib/analyze.ts`.
- Fixed: CLI engine's `runAuditInner` only dispatched `deep` vs `fast` for the crawl —
  `max` and `ultra` modes fell through to the fast `crawlSite()`. Added the full
  four-way dispatch with lazy `import("./site-crawl-max")` for both modes.
- Fixed: CLI engine was missing `site-crawl-max.ts` entirely (the web app had it).
  Created `cli/src/engine/site-crawl-max.ts` as a mirror of `lib/site-crawl-max.ts`.
- Fixed: CLI `AuditOptions` was missing `cruxByokKey`, `onProgress`, and
  `pageSpeedLockReason`; `AuditResult` was missing `crawlMode`. Added all four.
- Fixed: README's Site Crawl module table was malformed (3-column header, 4-column
  rows) and only covered Fast/Deep/Max with Ultra crammed into parentheticals.
  Rewrote as a proper 5-column table with a dedicated Ultra column.
- Fixed: README project structure still referenced deleted files (`lib/ip.ts`,
  `app/opengraph-image.tsx`). Removed both.
- Fixed: README environment variables table was missing `CRUX_API_KEY`. Added it.

## 3.17.0 — September 2026

- New: brag video assets — `public/brag.mp4` (20s launch video) and `public/brag.jpg` (poster frame at 3.2s score reveal). Created via Hyperframes composition with 5 scenes: URL input → score reveal → evidence panel → fix card → outro.

## 3.16.0 — September 2026

- Removed: the "1 free audit without signup" feature — anonymous (unauthenticated) users can no
  longer run audits. All audit requests now require authentication (Firebase ID token or API key).
  Unauthenticated requests to `/api/audit` or `/api/audit/start` return `401`. This removes the
  `ANON_DAILY_LIMIT` constant, `checkAndIncrementAnonymousUsage()`, `hashIp()`, `getClientIp()`,
  and all associated IP-based rate-limiting logic.
- Fixed: Firestore `undefined` value error — `AuditModuleFinding.evidence` and `.confidence` are
  optional fields, and when omitted, the helper functions (`pass`, `warn`, `fail`, `unknown`) returned
  `undefined`, which Firestore rejects. Fixed by converting `undefined` to `null` in the helper
  functions and adding a `stripUndefined()` recursive sanitizer in `completeAuditJob()` as a safety
  net.
- Fixed: OpenGraph image build error — Next.js 14.2.35's bundled `@vercel/og` has a known bug
  (`TypeError: Invalid URL`) that occurs at module load time during static generation. Replaced the
  dynamic `app/opengraph-image.tsx` route with a static `public/opengraph.png` image referenced via
  the `openGraph.images` metadata field.
- New: proper onboarding pages — added `/onboarding/welcome`, `/onboarding/features`, and
  `/onboarding/get-started` with detailed feature breakdowns, step-by-step guides, and links to
  all key features. Connected via the homepage onboarding card ("View full guide"), header
  navigation ("Guide" link), and sitemap.

## 3.15.2 — September 2026

- Fixed: `/api/push/subscribe` would silently accept and store a push subscription even when the
  server's `WEB_PUSH_VAPID_PRIVATE_KEY`/`WEB_PUSH_VAPID_SUBJECT` weren't configured — someone
  could see "you're all set, we'll notify you" and never receive a notification, with no error
  ever surfaced. The config check is now enforced server-side before a subscription is accepted.

## 3.15.1 — September 2026

- Fixed: the PDF's "Vector metrics" section title and the radar chart's own topmost category
  label mathematically overlapped on every generated report — recomputed the chart's vertical
  offset so it clears the title with real room instead of a negative gap.
- Fixed: the "Fails by severity" pie chart's legend text could run past the page's right
  printable margin on reports with longer severity labels — repositioned with margin verified
  against the longest possible label.

## 3.15.0 — September 2026

- New: data-retention/cleanup moved off Vercel Cron onto a new Cloudflare Worker
  (`/cloudflare-worker`) — Vercel's Hobby plan caps cron triggers at once/day regardless of
  configured schedule, so the cleanup-jobs route's intended 4-hour schedule was silently only
  running once a day; Cloudflare's free tier has no such limit. See
  `cloudflare-worker/README.md` for full setup. The equivalent Next.js cron routes are kept as
  manual/fallback triggers only.
- New: README gained an "Infrastructure & scaling" section.
- Fixed: Content-Security-Policy checks deepened from a single whole-header regex (which could
  false-positive on wildcards in unrelated directives) to a real per-directive parser. New
  findings: object-src 'none', base-uri, frame-ancestors, nonce/strict-dynamic detection, and
  Report-Only-only setups.
- New: HSTS preload-list eligibility checked as its own finding, separate from basic HSTS
  validity.
- Ported: both CSP and HSTS deepening to the CLI's copy of the audit engine.

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

See [audityxe.xyz/changelog](https://audityxe.xyz/changelog) for the full history —
this file starts from the release this project adopted a root-level `CHANGELOG.md`.
