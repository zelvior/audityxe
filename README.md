# Audityxe

Instant site audit & viral promo generator — with a live, deterministic
scoring engine, a real browser-rendered performance/accessibility pass,
evidence attached to every finding, full public methodology, and a
privacy-first design that never stores your audit results.

## Setup

```bash
npm install
cp .env.example .env.local   # fill in Firebase Admin creds, GitHub OAuth app, etc.
npm run dev
```

Auditing requires a signed-in, **email-verified** account. See
**Authentication & accounts** below before running locally, or
`/api/audit` will reject every request with a 401/403.

## 🛡️ System Trust & Verification Signals

| Metric | Provider | Live Status Badge |
|---|---|---|
| Security Score | Mozilla HTTP Observatory | [![Mozilla HTTP Observatory Grade](https://img.shields.io/mozilla-observatory/grade-score/audityxe.vercel.app?style=flat-square)](https://observatory.mozilla.org/analyze/audityxe.vercel.app) |
| Framework | Next.js | ![Next.js](https://img.shields.io/badge/Framework-Next.js-black?style=flat-square&logo=nextdotjs) |
| Deployed on | Vercel | ![Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black?style=flat-square&logo=vercel) |
| Audit Privacy | Zero result retention | ![Privacy](https://img.shields.io/badge/Privacy-Zero%20Data%20Retention-emerald?style=flat-square) |

> Uptime, SSL-grade, and third-party domain-scan badges (UptimeRobot, Qualys SSL Labs, OMNIntel,
> Webscan Radar) aren't included here yet — those require actually registering the domain with
> each service first (creating a monitor, running a scan) before their badge URLs return real
> data. Once you've set those up for `audityxe.vercel.app`, drop the badge snippets each service
> gives you in this section.

**"Audited by Audityxe" badge for your own site:** generate one at
[`/badge`](https://audityxe.vercel.app/badge) — it links back to our live re-audit flow rather
than making a static, unverifiable claim.

## Pages

| Route | Purpose |
|---|---|
| `/` | Landing + audit tool (gated behind sign-in + verification) + trust/differentiation section |
| `/login`, `/register` | Auth (email/password, Google, GitHub) |
| `/verify-email` | Dedicated email-verification flow, with spam-folder guidance |
| `/forgot-password` | Real password reset via Firebase, enumeration-safe (never reveals whether an email is registered) |
| `/account` | Plan, usage, expiry |
| `/settings` | Profile, password, linked providers, data export, account deletion |
| `/pricing` | Plans, dynamic local-currency pricing, manual upgrade flow |
| `/bulk` | Pro-only bulk audit (up to 20 URLs) with CSV export |
| `/methodology` | Full transparency on what's measured, how, and its limits |
| `/faq` | Common questions, answered honestly |
| `/sample-report` | A real, live, unedited audit — regenerated hourly |
| `/about`, `/contact`, `/privacy`, `/terms`, `/cookies`, `/disclaimer` | Standard/legal pages |

## Authentication & accounts

Audityxe requires sign-in to use the audit tool at all — there is no
anonymous/guest path. Three sign-in methods, each on their own page:
`/register` and `/login` (email/password, Google, or GitHub).

Firebase Auth (client SDK) handles identity. Every authenticated request
to `/api/audit`, `/api/account`, `/api/settings`, and `/api/audit/bulk`
sends the user's Firebase ID token as `Authorization: Bearer <token>`;
the server verifies it with the Firebase Admin SDK
(`lib/auth-server.ts`) before doing any work.

### Email verification required before running audits

New email/password accounts get a verification email on sign-up
(`sendEmailVerification`). Until it's clicked, `/verify-email` blocks the
audit form and offers "Resend email" / "I've verified — check again"
(the latter calls Firebase's `reload()` so the app notices without a
logout/login), and explicitly tells the user to check their spam/junk
folder. This is enforced **server-side**, not just in the UI:
`/api/audit` and `/api/audit/bulk` call `requireAuth(req, {
requireEmailVerified: true })`, which checks the `email_verified` claim
on the decoded ID token and rejects with a 403 (`code:
"EMAIL_NOT_VERIFIED"`) if it's false. Google and GitHub sign-ins are
effectively pre-verified by their provider in almost all cases.

### Retention — keeping Firebase free of abandoned signups

Two mechanisms, both free:

1. **No Firestore record until verified.** `ensureUserDoc()`
   (`lib/rate-limit.ts`) deliberately does nothing for an unverified
   account — the `users/{uid}` document (plan, usage counters) is only
   created the first time a request comes in from a verified account.
   An account that never verifies never accumulates any Firestore
   footprint at all.
2. **Scheduled cleanup of stale unverified Firebase Auth accounts.**
   `/api/cron/cleanup-unverified`, wired to run daily via Vercel Cron
   (`vercel.json`, free on Hobby), deletes any email/password account
   that was created more than 7 days ago and still hasn't verified.
   Federated (Google/GitHub) accounts are never targeted. Protected by
   `CRON_SECRET` — see `.env.example`.

We can't prevent the Firebase Auth record from being created at
sign-up time (that's how Firebase's client SDK works — building a fully
custom pre-verification flow would require running our own transactional
email infrastructure, which isn't free), but between these two
mechanisms, an abandoned signup leaves no lasting trace after a week.

### OAuth reliability (Google & GitHub)

Google/GitHub sign-in tries a popup first, and **automatically falls
back to a full-page redirect** if the popup is blocked, closed, or fails
for reasons unrelated to your Firebase config — this covers browsers/
webviews that block third-party popups even when everything is
configured correctly on the console side.

### Required setup in the Firebase Console

1. **Authentication → Sign-in method** → enable Email/Password, Google, and GitHub.
2. For GitHub: create a GitHub OAuth App (see `.env.example` for the exact callback URL) and paste its Client ID/Secret into the GitHub provider config in the Firebase Console.
3. **Authentication → Settings → Authorized domains** → add every domain you'll sign in from.
4. **Project settings → Service accounts** → generate a private key and fill `FIREBASE_PROJECT_ID` / `FIREBASE_CLIENT_EMAIL` / `FIREBASE_PRIVATE_KEY` in `.env.local`.
5. **Firestore Database** → create a database, then deploy `firestore.rules` (denies all direct client access — every read/write goes through the Admin SDK server-side).

## Settings

`/settings` (`app/settings/page.tsx`) — every control is fully wired to
a real backend:

- **Profile** — display name, updated via the Firebase client SDK and mirrored server-side.
- **Security** — shows linked sign-in methods; password change re-authenticates with the current password before calling `updatePassword` (federated-only accounts see an explanatory message instead).
- **Plan & billing** — links to `/account` and `/pricing`.
- **Data & privacy** — "Export my data" downloads your profile + usage snapshot as JSON. "Delete my account" removes the Firestore `users/{uid}` and `usage/{uid}` docs server-side first, then deletes the Firebase Auth account client-side — ordered so a failure never strands an account that can't reach its own data to retry.

There is no tone/personality selector — a single, direct verdict is
generated for every audit; a constructive/roast toggle was tested and
added nothing useful, so it was removed.

## Plans, pricing & rate limiting

Every account is created on the **Free** plan by default (`lib/plans.ts`).
Limits are enforced server-side, per account, atomically, via a Firestore
transaction (`lib/rate-limit.ts`) — never trust-the-client:

| Plan     | Daily audits | Competitor comparison | 30-day price | 365-day price |
|----------|--------------|------------------------|---------------|----------------|
| Free     | 3            | No                     | $0            | $0             |
| Standard | 20           | Yes                    | $5            | $39            |
| Pro      | 50           | Yes                    | $12           | $99            |

Prices are defined in USD in `lib/plans.ts` and converted to the
visitor's local currency client-side on `/pricing` using two free,
keyless public APIs — `ipapi.co` for geolocation and
`exchangerate-api.com`'s open endpoint for the live conversion rate.

### Manual upgrade flow (no payment gateway wired up)

There's no Stripe/PayPal integration — upgrades are approved manually:
a signed-in user picks a plan/duration on `/pricing`, which opens a
pre-filled `mailto:` with their account details; they attach a payment
screenshot and send it. To approve, open Firebase Console → Firestore →
`users/{uid}` and set `plan` and `planExpiresAt` (an ISO date 30 or 365
days out). Access reverts to Free automatically the moment
`planExpiresAt` passes — checked live on every request, no cron needed
for this part.

Firestore layout: `users/{uid}` (`plan`, `planExpiresAt`, `displayName`,
`createdAt` — created only once verified, see Retention above) and
`usage/{uid}` (`date`, `count`).

## Environment variables

See `.env.example` for the full commented list. Highlights:

| Variable | Purpose |
|---|---|
| `FIREBASE_PROJECT_ID` / `FIREBASE_CLIENT_EMAIL` / `FIREBASE_PRIVATE_KEY` | Required. Admin SDK service account. |
| `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` | GitHub OAuth App (configured in Firebase Console). |
| `CRON_SECRET` | Protects the retention cleanup cron job. Free — generate any random string. |
| `PAGESPEED_API_KEY` | Optional. Free (no billing) key for a higher quota on the real browser-rendered audit. Works keyless at a lower rate limit. |
| `GEMINI_API_KEY` (+ per-task variants) | Optional. Powers the written verdict/promo/banner copy. Falls back to a rule-based generator if unset or unavailable — the app always returns a complete result either way. |

### Failover behavior

Any `GEMINI_API_KEY*` variable accepts a comma-separated list of keys,
tried in order on failure, with a model-fallback chain per key. If every
key for a task fails or none is configured, that task falls back to the
deterministic generator in `lib/analyze.ts`.

## What gets analyzed

Every score, fix, and finding is computed live — nothing requires any
paid API, and nothing is mocked or random.

### 6 top-level score categories (`result.categories`)

Messaging & Copy Clarity, UI/UX & Visual Hierarchy, Conversion Rate
Optimization, Technical & Metadata Health, Brand Distinctiveness,
Security & Performance.

### 17-area deep audit breakdown (`result.modules`)

SEO, Performance, Security Headers, Accessibility, Mobile
Responsiveness, UX/UI, Technical Stack, HTML Structure, Meta Tags,
Sitemap & Robots.txt, Structured Data, Broken Links, Image Optimization,
Third-Party Scripts, Social Metadata, Basic Monetization Setup, and
**Browser-Rendered Audit** (real Chrome, via PageSpeed Insights — see
below).

### Real evidence on every finding

Every fix (`result.fixes`) and every module finding
(`result.modules[].findings[].evidence`) carries concrete, checkable
proof — the exact URL fetched, the HTTP status returned, or a literal
count of elements found — not just an assertion. If a fix says your
sitemap is missing, the evidence field states exactly which URL was
requested and what (if anything) came back.

## Real browser-level auditing (free)

Rather than bundling a headless Chromium binary into a serverless
function (fragile, slow cold starts, a real risk of silently failing in
production), `lib/pagespeed.ts` calls Google's **PageSpeed Insights**
API. This is not a simulation: PSI actually launches real Chrome,
renders the page, and runs a full Lighthouse audit — the same engine
behind Chrome DevTools — on Google's infrastructure. Free with no key at
a modest rate limit, or with a free (no billing required) API key for a
much higher quota. If PSI is slow or unavailable for a given request,
the rest of the audit still completes normally using Audityxe's own
signal-based checks.

## Privacy — audits are never stored

Audit results are computed fresh for every request and returned
directly to the browser. There is no server-side database of results,
no public report page, and no cross-account history — once a result
reaches your browser, it's yours; use the copy/export/share/email
buttons on any result to keep your own copy. See `/privacy` and
`/methodology` for the full statement.

## Copy, export, share & email

Every audit view includes an icon-only action bar
(`components/AuditActionBar.tsx`):

- **Copy** copies a plain-text summary (with a `document.execCommand`
  fallback for browsers/contexts where the async Clipboard API is
  unavailable — this was a real bug in an earlier version that made the
  button silently do nothing in some environments).
- **Export** downloads a complete JSON snapshot (scores, all 17 modules
  with evidence, fixes).
- **Share** uses the native Web Share API where supported, falling back
  to a clipboard copy.
- **Email** opens a pre-filled `mailto:` with the summary.

None of these depend on a hosted URL — consistent with the no-storage
privacy design above.

## SSRF hardening & abuse prevention

Every outbound fetch to a user- or site-supplied URL — the audited page
itself, each redirect hop, robots.txt/sitemap.xml, sampled links/images,
and `og:image` — is validated by `lib/url-safety.ts` before the request
is made: only `http:`/`https:` schemes, known-internal hostnames
blocked outright, and every resolved DNS address checked against the
full private/loopback/link-local/reserved IP ranges (including the
cloud metadata endpoint `169.254.169.254`). This check runs again on
**every redirect hop**, not just the initial URL.

Additional protections: an 8MB streamed response cap, a 45-second
overall audit-pipeline timeout, URL/body length limits, and
`/api/banner-bg` requiring authentication (it has a real per-call cost
and would otherwise be an open, unmetered proxy).

**Known limitation:** IP validation happens at check time, not at
socket-connect time — a malicious DNS server could in theory change its
answer in between (DNS rebinding). Full protection requires IP-pinning
at the socket level, which isn't exposed by native `fetch`.
Re-validating on every redirect hop closes the most common practical
exploitation path.

## Bulk audit (Pro plan)

`/bulk` accepts up to 20 URLs and audits them in one request
(`/api/audit/bulk`, 4 concurrent fetches), gated to the Pro plan and
checked server-side against the account's real, non-expired plan. Each
URL consumes one slot from the same daily quota as single audits,
reserved transactionally before any network work starts. Results
include a **CSV export** button with per-category score columns.

## Security headers on Audityxe itself

`next.config.js` sets a scoped Content-Security-Policy, HSTS,
X-Frame-Options, X-Content-Type-Options, Referrer-Policy, and
Permissions-Policy, plus `poweredByHeader: false`.

## Brand assets

The logo (favicon, Apple touch icon, in-app mark, banner watermark, and
Open Graph image) is a real PNG, not a generated placeholder —
`public/logo-mark-trimmed.png` is the source of truth, auto-trimmed of
padding, reused via `components/Logo.tsx`. `app/icon.png` and
`app/apple-icon.png` are pre-sized static exports of the same source
image, picked up automatically by Next.js's file-based icon convention.

## AI-generated banner backgrounds

The shareable banner's background art is generated on demand via
[Pollinations.ai](https://pollinations.ai) (free, keyless) using a
prompt derived from the audit's score. Proxied server-side through
`/api/banner-bg` (auth required) to avoid canvas CORS-tainting. Falls
back to a designed gradient if generation is slow/unavailable — the
download button always produces a complete image either way.

## Code quality & dependency security

- **ESLint is configured and enforced** (`next/core-web-vitals`,
  `.eslintrc.json`) — previously this project had no lint config at all,
  so real issues (unused variables, missing hook dependencies) could go
  undetected. `npx next lint` currently reports zero warnings or errors,
  and `next build` runs linting as part of the build, so a regression
  fails the build rather than shipping silently. The one rule
  deliberately disabled is `react/no-unescaped-entities` — it flags
  plain apostrophes in JSX text (e.g. "don't"), which render perfectly
  correctly; converting every contraction to `&apos;` would only hurt
  readability for zero functional benefit.
- **`npm audit`**: all vulnerabilities in the Firebase dependency chain
  are resolved — `firebase`/`firebase-admin` were bumped to their latest
  major versions, and the remaining transitive `uuid`/`teeny-request`/
  `retry-request` advisories (pulled in by `firebase-admin`'s bundled,
  unused Google Cloud Storage client) are pinned to patched versions via
  `overrides` in `package.json`.
- **Next.js**: pinned to `14.2.35`, the latest patch on the 14.x line,
  which resolves the disclosed CVEs that 14.x *does* receive backports
  for. A handful of newer (July 2026) CVEs are only patched in the 15.x/
  16.x lines and won't be backported to 14.x — however, all of them are
  scoped to features this app doesn't use: Server Actions (`"use
  server"`), a custom Node HTTP server, and Turbopack middleware. This
  app uses none of the three (API routes only, no `middleware.ts`,
  standard Vercel deployment), so it isn't exposed to those specific
  vectors on 14.x. A move to Next 15 is a reasonable follow-up, but is
  deliberately not bundled into this change set as a forced,
  unverified major-version jump — App Router behavior changes enough
  between majors that it deserves its own dedicated test pass.

## Zelvior Runtime

Loaded via `next/script` in the root layout for lightweight client-side
performance instrumentation. Remove the two `<Script>` tags in
`app/layout.tsx` (and drop `cdn.jsdelivr.net` from the CSP) if you fork
this without needing it.
