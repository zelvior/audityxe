# Audityxe

Instant AI site audit & viral promo generator — with a live, deterministic
scoring engine underneath the AI commentary, full public methodology, a
real sample report, and shareable public audit pages.

## Setup

```bash
npm install
cp .env.example .env.local   # fill in Gemini keys, Firebase Admin creds, GitHub OAuth app
npm run dev
```

Auditing requires a signed-in account (email/password, Google, or GitHub via
Firebase Auth). See **Authentication & accounts** below before running
locally, or `/api/audit` will reject every request with a 401.

## Pages

| Route | Purpose |
|---|---|
| `/` | Landing + audit tool (gated behind sign-in) + trust/differentiation section |
| `/login`, `/register` | Auth (email/password, Google, GitHub) |
| `/account` | Plan, usage, expiry, and real audit history |
| `/settings` | Profile, password, linked providers, default tone preference, data export, account deletion |
| `/pricing` | Plans, dynamic local-currency pricing, manual upgrade flow |
| `/bulk` | Pro-only bulk audit (up to 20 URLs) |
| `/methodology` | Full transparency on what's measured, how, and its limits |
| `/faq` | Common questions, answered honestly |
| `/sample-report` | A real, live, unedited audit — regenerated hourly |
| `/report/[id]` | Public, read-only shareable report for a completed audit |
| `/about`, `/contact`, `/privacy`, `/terms`, `/cookies`, `/disclaimer` | Standard/legal pages |

## Authentication & accounts

Audityxe requires sign-in to use the audit tool at all — there is no
anonymous/guest path. Three sign-in methods, each on their own page:

- `/register` — email + password, or Google / GitHub via Firebase Auth.
- `/login` — same three methods for returning users.
- `/account` — shows the signed-in user, current plan, today's usage, and
  a real history of past audits with shareable links.

Firebase Auth (client SDK) handles identity. Every authenticated request to
`/api/audit`, `/api/account`, `/api/reports`, and `/api/audit/bulk` sends
the user's Firebase ID token as `Authorization: Bearer <token>`; the
server verifies it with the Firebase Admin SDK (`lib/auth-server.ts`)
before doing any work — a request with no token, an expired token, or a
forged token is rejected with 401 before the target URL is ever fetched.

### Email verification required before running audits

New email/password accounts get a verification email on sign-up
(`sendEmailVerification`). Until it's clicked, a banner on the homepage
blocks the audit form and offers "Resend email" / "I've verified — check
again" (the latter calls Firebase's `reload()` so the app notices without
requiring a logout/login). This is enforced **server-side**, not just in
the UI: `/api/audit` and `/api/audit/bulk` call `requireAuth(req, {
requireEmailVerified: true })`, which checks the `email_verified` claim
on the decoded ID token and rejects with a 403 (`code:
"EMAIL_NOT_VERIFIED"`) if it's false — a request forged or replayed
without going through the UI gate is rejected just the same. Google and
GitHub sign-ins are effectively pre-verified by their provider in almost
all cases, so this mostly affects email/password sign-ups.

### OAuth reliability (Google & GitHub)

Google/GitHub sign-in tries a popup first, and **automatically falls back
to a full-page redirect** (`signInWithRedirect`) if the popup is blocked,
closed, or fails for reasons unrelated to your Firebase config — this
covers the most common real-world failure mode: Safari's Intelligent
Tracking Prevention, in-app browsers (Instagram/TikTok/LinkedIn webviews),
and some corporate networks block third-party popups even when
everything on the Firebase Console side is configured correctly. The
redirect result is picked up automatically on the next page load
(`getRedirectResult()` in `context/AuthContext.tsx`).

If sign-in still fails, the error message shown is the *real* Firebase
error, mapped to plain English — check it against this list:

| Error you see | What it means |
|---|---|
| "This domain isn't authorized for sign-in yet" | Add your domain in Firebase Console → Authentication → Settings → Authorized domains (include `localhost` for local dev). |
| "This sign-in method isn't enabled yet" | Enable Google/GitHub in Firebase Console → Authentication → Sign-in method. |
| "Firebase rejected the request — check that the OAuth provider is fully configured" | For GitHub specifically: the callback URL in your GitHub OAuth App must exactly match `https://<your-project>.firebaseapp.com/__/auth/handler`, and the Client ID/Secret must be pasted into the Firebase Console's GitHub provider settings (not just left in `.env.local` — that copy is for your own reference only). |
| "An account already exists with this email using a different sign-in method" | The user previously signed up with email/password (or the other OAuth provider) using the same email — have them use that method instead. |

### Required setup in the Firebase Console

1. **Authentication → Sign-in method** → enable Email/Password, Google, and
   GitHub.
2. For GitHub: create a GitHub OAuth App (see `.env.example` for the exact
   callback URL) and paste its Client ID/Secret into the GitHub provider
   config in the Firebase Console — Firebase handles the OAuth exchange
   itself once configured there.
3. **Authentication → Settings → Authorized domains** → add every domain
   you'll actually sign in from (`localhost` is included by default;
   add your production domain when you deploy).
4. **Project settings → Service accounts** → generate a private key and
   fill `FIREBASE_PROJECT_ID` / `FIREBASE_CLIENT_EMAIL` / `FIREBASE_PRIVATE_KEY`
   in `.env.local`. This is what lets the server verify ID tokens and read/
   write Firestore.
5. **Firestore Database** → create a database (if not already created for
   this project), then deploy `firestore.rules` (or paste its contents into
   the console's Rules tab). The app never talks to Firestore from the
   client — all reads/writes go through the Admin SDK server-side — so the
   rules simply deny all direct client access.
6. **Firestore index** → the report-history query (`reports` collection,
   filtered by `uid` and ordered by `createdAt`) needs a composite index.
   Firestore will throw an error containing a direct "create this index"
   link the first time the query runs — click it once, or create it
   manually: collection `reports`, fields `uid` (Ascending) + `createdAt`
   (Descending).

## Settings

`/settings` (`app/settings/page.tsx`) — every control on it is fully wired
to a real backend, nothing is a placeholder:

- **Profile** — display name, updated via the Firebase client SDK
  (`updateProfile`) and mirrored server-side for admin visibility
  (`PATCH /api/settings`).
- **Security** — shows which sign-in methods are linked
  (`user.providerData`: Google/GitHub/email-password); password change
  for email/password accounts re-authenticates with the current password
  (`reauthenticateWithCredential`) before calling `updatePassword` —
  federated-only accounts see an explanatory message instead, since
  Firebase has no password to change for them.
- **Preferences** — a default report tone (Constructive/Brutal Roast),
  persisted in Firestore (`users/{uid}.defaultTone` via `GET`/`PATCH
  /api/settings`) and applied automatically the next time the homepage
  loads results for that account.
- **Plan & billing** — links out to `/account` (live usage) and
  `/pricing` (upgrade) rather than duplicating that state.
- **Data & privacy** — "Export my data" bundles the account's profile,
  usage snapshot, and full report history into one downloadable JSON
  file, built entirely from data the existing `/api/account` and
  `/api/reports` endpoints already return. "Delete my account" is a real,
  two-step deletion: `POST /api/account/delete` removes the Firestore
  `users/{uid}` doc, `usage/{uid}` doc, and every `reports/{id}` the
  account owns (server-side, via `lib/user-settings.ts`), and only after
  that succeeds does the client call Firebase's `deleteUser()` to remove
  the Auth account itself — ordered this way so a failure never leaves an
  Auth account that can no longer reach its own data to retry.

## Plans, pricing & rate limiting

Every account is created on the **Free** plan by default (`lib/plans.ts`).
Limits are enforced server-side, per account, atomically, via a Firestore
transaction (`lib/rate-limit.ts`) — never trust-the-client:

| Plan     | Daily audits | Competitor comparison | 30-day price | 365-day price |
|----------|--------------|------------------------|---------------|----------------|
| Free     | 3            | No                     | $0            | $0             |
| Standard | 25           | Yes                    | $5            | $39            |
| Pro      | 200          | Yes                    | $12           | $99            |

Prices are defined in USD in `lib/plans.ts` and converted to the visitor's
local currency client-side on `/pricing` using two free, keyless public
APIs — `ipapi.co` for geolocation and `exchangerate-api.com`'s open
endpoint for the live conversion rate (see `lib/currency.ts`). If either
call fails, prices simply stay in USD — never a broken or negative price.

### Manual upgrade flow (no payment gateway wired up)

There's no Stripe/PayPal integration — upgrades are approved manually:

1. A signed-in user picks Standard or Pro and a duration (30 or 365 days)
   on `/pricing` and clicks "Get Standard"/"Get Pro".
2. This opens their email client with a `mailto:` to **zelvior@proton.me**,
   pre-filled with their account email, Firebase UID, display name, the
   plan/duration requested, and the price shown.
3. They manually attach a payment screenshot and send it.
4. **To approve:** open Firebase Console → Firestore → `users/{uid}` (the
   UID is in the email) and set:
   - `plan`: `"standard"` or `"pro"`
   - `planExpiresAt`: an ISO date string (or Firestore Timestamp) 30 or
     365 days from now, matching what was requested.

Access reverts to Free **automatically** the moment `planExpiresAt`
passes — checked live on every request in `lib/rate-limit.ts`'s
`effectivePlan()`, no cron job or background task needed. The account
page shows the expiry date, and a banner if a plan has just expired.

Firestore layout (created automatically on first use — the project starts
with no collections):

- `users/{uid}` — `{ email, displayName, plan, planExpiresAt, createdAt }`,
  created on first authenticated request via `ensureUserDoc()`.
- `usage/{uid}` — `{ date: "YYYY-MM-DD", count }`, incremented atomically
  inside a transaction before each audit runs; a stale date is treated as
  zero, giving each account a fresh quota every day at midnight UTC.

`/api/audit` checks-and-increments usage before doing any fetching or AI
calls, so a request that would exceed the day's quota fails fast with a
429 and never touches the target site.

## Environment variables

See `.env.example` for the full list with comments. Summary:

Audityxe calls Gemini for three independent tasks — `VERDICT` (roast/verdict
copy), `PROMO` (X + LinkedIn post copy), and `BANNER` (the shareable
banner's creative direction, written with a senior-graphic-designer
persona: headline, tagline, one emphasized accent word, and a layout
choice between a centered score badge or a compact stat block). Each
task reads its own env vars first, falling back to the shared ones if
unset:

| Variable                     | Scope   | Purpose                                              |
|-------------------------------|---------|-------------------------------------------------------|
| `GEMINI_API_KEY_VERDICT`      | Verdict | Key(s) for verdict generation. Comma-separate for failover. |
| `GEMINI_MODEL_VERDICT`        | Verdict | Model override for this task.                         |
| `GEMINI_TIMEOUT_MS_VERDICT`   | Verdict | Timeout override for this task.                        |
| `GEMINI_API_KEY_PROMO`        | Promo   | Key(s) for promo copy generation. Comma-separate for failover. |
| `GEMINI_MODEL_PROMO`          | Promo   | Model override for this task.                          |
| `GEMINI_TIMEOUT_MS_PROMO`     | Promo   | Timeout override for this task.                         |
| `GEMINI_API_KEY_BANNER`       | Banner  | Key(s) for banner art-direction. Comma-separate for failover. |
| `GEMINI_MODEL_BANNER`         | Banner  | Model override for this task.                          |
| `GEMINI_TIMEOUT_MS_BANNER`    | Banner  | Timeout override for this task.                         |
| `GEMINI_API_KEY`              | Shared  | Fallback key(s) used when a task has no dedicated key. Comma-separate for failover. |
| `GEMINI_MODEL`                | Shared  | Fallback model. Defaults to `gemini-2.0-flash`.         |
| `GEMINI_TIMEOUT_MS`           | Shared  | Fallback timeout. Defaults to `15000`.                  |
| `FIREBASE_PROJECT_ID`         | Auth    | Required. Service account project ID.                  |
| `FIREBASE_CLIENT_EMAIL`       | Auth    | Required. Service account email.                        |
| `FIREBASE_PRIVATE_KEY`        | Auth    | Required. Service account private key.                  |
| `GITHUB_CLIENT_ID`            | Auth    | GitHub OAuth App Client ID (configured in Firebase Console). |
| `GITHUB_CLIENT_SECRET`        | Auth    | GitHub OAuth App Client Secret (configured in Firebase Console). |

### Getting Gemini working (free, no billing required)

If AI-written verdict/promo/banner copy isn't showing up, it's almost
always a missing or malformed key — the app is designed to **never**
error out, so a bad key silently falls back to the built-in heuristic
generator instead of failing loudly. To confirm what's happening, check
your terminal running `npm run dev`: every failed attempt logs a line
like `[gemini:VERDICT] all keys failed — key #1: auth error 401`.

1. Get a free key at https://aistudio.google.com/apikey (no card needed).
2. Put it in `GEMINI_API_KEY=` in `.env.local` — that alone enables all
   three AI tasks (verdict, promo copy, banner design), since task-specific
   keys are optional and fall back to this shared one.
3. Restart `npm run dev` — Next.js only reads `.env.local` on startup.
4. Leave any key field you're not using **completely empty**, not a
   placeholder string — the client does filter out obvious
   `your_..._here` placeholders automatically, but an empty value is the
   safest way to signal "not configured."

### Failover behavior

Any `GEMINI_API_KEY*` variable accepts a comma-separated list of keys.
For each task, keys are tried in order: on a `429`/`503`/auth error/
timeout/malformed response, the next key is tried automatically. If
every key for a task fails, or none is configured, that task falls back
to the heuristic generator in `lib/analyze.ts` — all three tasks fail
over independently, so a broken `BANNER` key never affects `VERDICT` or
`PROMO` output, and the banner still renders using a deterministic
designed fallback (not a blank/placeholder banner).

## What gets analyzed

Every score, fix, and finding is computed live from the fetched page (plus
a handful of real follow-up requests) — nothing requires Gemini, and
nothing is mocked or random.

### 6 top-level score categories (`result.categories`)

- **Messaging & Copy Clarity** — title/meta length, heading text quality, word count.
- **UI/UX & Visual Hierarchy** — heading structure/order, viewport config, alt-text coverage, ARIA landmarks, font sprawl.
- **Conversion Rate Optimization** — above-the-fold CTA detection, form field count, contact links.
- **Technical & Metadata Health** — canonical/meta tags, structured data (JSON-LD), live `/robots.txt`, live `/sitemap.xml`.
- **Brand Distinctiveness** — favicon, Open Graph/Twitter Card completeness, theme-color, manifest.
- **Security & Performance** — real response headers, redirect-chain tracking, response timing, mixed content.

### 16-area deep audit breakdown (`result.modules`)

Beyond the 6 headline scores, every audit also runs a full **16-module**
breakdown (`lib/audit-modules.ts`), each with individual pass/warn/fail
findings shown in the "Full Deep Audit" section of the results:

1. **SEO** — title/description length, canonical, H1 count, robots/sitemap presence and cross-referencing, structured data presence.
2. **Performance** — measured response time, HTML weight, render-blocking stylesheet count, external script count, redirect hops, compression, live-sampled image weight.
3. **Security Headers** — HTTPS, HSTS, CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, X-Powered-By exposure.
4. **Accessibility** — `lang` attribute, unlabeled form inputs, unnamed buttons/links, missing alt text, positive `tabindex` misuse, `aria-hidden` misuse, landmark regions.
5. **Mobile Responsiveness** — viewport config, pinch-to-zoom, `@media` query count, Apple touch icon, theme-color.
6. **UX/UI** — above-the-fold CTA, heading clarity/nesting, div-to-semantic-tag ratio, form length, content depth.
7. **Technical Stack** — CMS/platform, JS framework, jQuery, analytics tool, and CDN library detection via real markup signatures.
8. **HTML Structure** — doctype, semantic landmark tags, duplicate IDs, deprecated tags (`<font>`, `<center>`, etc.), lang/charset declarations.
9. **Meta Tags** — full head-section audit: title, description, language, charset, viewport, canonical, robots meta, generator.
10. **Sitemap & Robots.txt** — both files **fetched live** from the target origin; existence, blanket-disallow detection, URL count, `<lastmod>` freshness, cross-referencing.
11. **Structured Data** — JSON-LD blocks parsed and validated per schema.org type (Organization, Product, Article, BreadcrumbList, FAQPage, LocalBusiness, Review), flagging missing required fields per type.
12. **Broken Links** — a real sample of on-page links (up to 10) is **live HTTP-checked** with HEAD/GET requests; genuine 404/410/5xx responses are flagged separately from ambiguous 401/403/429s (which may just be bot-blocking).
13. **Image Optimization** — missing width/height, modern-format (WebP/AVIF) usage, lazy-loading, inline base64 bloat, plus a **live-sampled** check of actual image file sizes over HTTP.
14. **Third-Party Scripts** — every external script domain categorized in real time: analytics, ad networks, chat widgets, font services, tag managers, or uncategorized.
15. **Social Metadata** — Open Graph/Twitter Card completeness, plus a **live check that the `og:image` URL actually loads** as an image.
16. **Basic Monetization Setup** — ad network detection (AdSense, Ezoic, Mediavine, etc.), affiliate-link pattern detection, payment processor detection (Stripe, PayPal, Paddle, etc.), donation platform detection, and a **live `/ads.txt` fetch and entry count**.

All of this — redirect-chain following, header inspection, timing,
robots/sitemap fetches, broken-link sampling, image sampling, and
`ads.txt` — comes from real HTTP requests the server makes at audit
time. No third-party scanning API, no paid service, nothing beyond the
audited site's own server responses (and Gemini, which is optional and
free-tier — see above).

See `lib/analyze.ts`, `lib/deep-signals.ts`, `lib/network-checks.ts`, and
`lib/audit-modules.ts` for the full signal list and scoring formulas.

## Shareable reports & audit history

Every completed audit is saved to Firestore (`reports/{id}`, via
`lib/reports.ts`) as a real snapshot of that result — not a live pointer
that changes later. This powers three things:

- A **"View shareable report"** link appears after every audit, opening
  `/report/[id]` — a public, read-only page anyone can view without an
  account, showing the exact scores/modules/fixes from that run.
- `/account` shows a real **audit history** list (via `/api/reports`,
  scoped to the signed-in user's own `uid`) linking back to each past
  report.
- `/sample-report` uses the same rendering path against a fixed public
  demo target (`https://github.com` by default), regenerated at most
  once an hour (`revalidate = 3600`) — a genuinely live example visitors
  can see before creating an account.

Saving a report is best-effort: if it fails for any reason, the audit
itself still succeeds and returns normally — history/sharing never blocks
the core feature.

## SSRF hardening & abuse prevention

Every outbound fetch to a user- or site-supplied URL — the audited page
itself, each redirect hop, robots.txt/sitemap.xml, sampled links/images,
and `og:image` — is validated by `lib/url-safety.ts` before the request
is made:

- Only `http:`/`https:` schemes are allowed.
- Known-internal hostnames (`localhost`, `*.local`, `*.internal`, etc.)
  are blocked outright.
- Every hostname is resolved via DNS, and **every** resolved address is
  checked against the full private/loopback/link-local/reserved IPv4 and
  IPv6 ranges — including `169.254.169.254` (the AWS/GCP/Azure cloud
  metadata endpoint), a classic SSRF target.
- This check runs again on **every redirect hop**, not just the initial
  URL — otherwise a legitimate public URL could redirect straight to an
  internal address and be fetched anyway. Native `fetch(..., {redirect:
  "follow"})` is deliberately avoided everywhere for this reason; redirects
  are followed manually so each one can be re-validated.
- A sitemap URL declared inside a site's own `robots.txt` is treated as
  attacker-controlled content and validated the same way before being
  fetched.

**Known limitation:** this validates the resolved IP at check time, not
at the moment the socket actually connects — a malicious/compromised DNS
server could in theory change its answer between the two (DNS
rebinding). Full protection requires pinning the connection to the
validated IP at the socket level, which isn't exposed by native `fetch`.
Re-validating on every redirect hop closes the most common practical
exploitation path; this residual gap is disclosed here rather than left
implicit.

Additional abuse prevention:

- **Response size cap** — the target page's HTML is read via a streamed,
  capped reader (8MB max) rather than buffered in one shot, so a hostile
  or oversized response can't exhaust memory.
- **Overall audit timeout** — the whole audit pipeline (main fetch + all
  parallel checks + AI calls) is wrapped in a 45-second ceiling
  (`withOverallTimeout` in `lib/analyze.ts`), independent of the
  per-request timeouts each individual fetch already has.
- **Input validation** — URLs are capped at 2048 characters, bulk audit
  requests are capped at 20 URLs with a request body size limit, and
  malformed JSON/oversized bodies are rejected with 400/413 before any
  work starts.
- **`/api/banner-bg` requires authentication.** It proxies a real
  (non-free-to-us) AI image generation call — without an auth
  requirement, it would be an open, unmetered image-generation proxy for
  anyone on the internet, not just Audityxe's own banner feature.

## Copy, export, share & email

Every audit view (the main results page, `/sample-report`, and public
`/report/[id]` pages) includes an icon-only action bar
(`components/AuditActionBar.tsx`) — Copy, Export, Share, Email — so
results are easy to reuse without leaving the page:

- **Copy** copies the report's shareable link.
- **Export** downloads a complete JSON snapshot (scores, all 16 modules,
  fixes) for your own records or tooling.
- **Share** uses the native Web Share API on supported devices (mobile
  share sheets), falling back to a clipboard copy elsewhere.
- **Email** opens a pre-filled `mailto:` with a plain-text summary and
  the report link.

## Bulk audit (Pro plan)

`/bulk` accepts up to 20 URLs (one per line) and audits all of them in a
single request (`/api/audit/bulk`, `lib/audit-modules.ts`/`lib/analyze.ts`
reused as-is, 4 concurrent fetches). It's gated to the Pro plan, checked
against the account's real, non-expired plan server-side — not by
anything the client sends. Each URL consumes one slot from the same daily
quota as single audits, checked and reserved transactionally *before* any
network work starts, so a request that would exceed the day's quota fails
fast without partially running. Results include a **CSV export** button
(client-side, no extra request) with per-category score columns — built
for agencies compiling client reports.

## Security headers on Audityxe itself

Beyond auditing *other* sites for security headers, Audityxe sets its own
via `next.config.js`: a scoped Content-Security-Policy, HSTS,
X-Frame-Options, X-Content-Type-Options, Referrer-Policy, and a
Permissions-Policy — plus `poweredByHeader: false` so it doesn't leak
`X-Powered-By: Next.js`. If you add new third-party scripts/domains,
update the CSP's `script-src`/`connect-src`/`frame-src` directives in
`next.config.js` accordingly, or they'll be silently blocked.

## AI-generated banner backgrounds

The shareable banner's background art is a real AI-generated image, not
a stock template — generated on demand via
[Pollinations.ai](https://pollinations.ai) (free, keyless, Stable
Diffusion-based) using a prompt derived from the audit's score and tone.
Requests are proxied server-side through `/api/banner-bg` rather than
fetched directly from the client, because Pollinations doesn't reliably
send CORS headers — fetching it client-side would taint the `<canvas>`
and break `canvas.toDataURL()` (the PNG download). If image generation
is slow or unavailable, the banner falls back to the original
gradient/grid design — the download button always produces a complete,
correctly-composited image either way.

## Zelvior Runtime

Audityxe loads [`zelvior-runtime`](https://www.npmjs.com/package/zelvior-runtime)
from jsDelivr via `next/script` (`strategy="afterInteractive"`) in the
root layout, for lightweight client-side performance instrumentation. If
you fork this project without needing it, remove the two `<Script>` tags
in `app/layout.tsx` and drop `https://cdn.jsdelivr.net` from the CSP's
`script-src` in `next.config.js`.
