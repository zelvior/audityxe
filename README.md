# Audityxe

Instant AI site audit & viral promo generator.

## Setup

```bash
npm install
cp .env.example .env.local   # fill in Gemini keys, Firebase Admin creds, GitHub OAuth app
npm run dev
```

Auditing requires a signed-in account (email/password, Google, or GitHub via
Firebase Auth). See **Authentication & accounts** below before running
locally, or `/api/audit` will reject every request with a 401.

## Authentication & accounts

Audityxe requires sign-in to use the audit tool at all — there is no
anonymous/guest path. Three sign-in methods, each on their own page:

- `/register` — email + password, or Google / GitHub via Firebase Auth popup.
- `/login` — same three methods for returning users.
- `/account` — shows the signed-in user, current plan, and today's usage.

Firebase Auth (client SDK) handles identity. Every authenticated request to
`/api/audit` and `/api/account` sends the user's Firebase ID token as
`Authorization: Bearer <token>`; the server verifies it with the Firebase
Admin SDK (`lib/auth-server.ts`) before doing any work — a request with no
token, an expired token, or a forged token is rejected with 401 before the
target URL is ever fetched.

### Required setup in the Firebase Console

1. **Authentication → Sign-in method** → enable Email/Password, Google, and
   GitHub.
2. For GitHub: create a GitHub OAuth App (see `.env.example` for the exact
   callback URL) and paste its Client ID/Secret into the GitHub provider
   config in the Firebase Console — Firebase handles the OAuth exchange
   itself once configured there.
3. **Project settings → Service accounts** → generate a private key and
   fill `FIREBASE_PROJECT_ID` / `FIREBASE_CLIENT_EMAIL` / `FIREBASE_PRIVATE_KEY`
   in `.env.local`. This is what lets the server verify ID tokens and read/
   write Firestore.
4. **Firestore Database** → create a database (if not already created for
   this project), then deploy `firestore.rules` (or paste its contents into
   the console's Rules tab). The app never talks to Firestore from the
   client — all reads/writes go through the Admin SDK server-side — so the
   rules simply deny all direct client access.

## Plans & rate limiting

Every account is created on the **Free** plan by default (`lib/plans.ts`).
Limits are enforced server-side, per account, atomically, via a Firestore
transaction (`lib/rate-limit.ts`) — never trust-the-client:

| Plan     | Daily audits | Competitor comparison |
|----------|--------------|------------------------|
| Free     | 3            | No                     |
| Standard | 25           | Yes                    |
| Pro      | 200          | Yes                    |

Firestore layout (created automatically on first use — the project starts
with no collections):

- `users/{uid}` — `{ email, displayName, plan, createdAt }`, created on
  first authenticated request via `ensureUserDoc()`.
- `usage/{uid}` — `{ date: "YYYY-MM-DD", count }`, incremented atomically
  inside a transaction before each audit runs; a stale date is treated as
  zero, giving each account a fresh quota every day at midnight UTC.

`/api/audit` checks-and-increments usage before doing any fetching or AI
calls, so a request that would exceed the day's quota fails fast with a
429 and never touches the target site. Plan upgrades are applied by
changing the `plan` field on a user's Firestore document (no self-serve
billing is wired up yet — `/pricing` links Standard/Pro to `/contact`).

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

Category scores, fixes, and DOM analysis are always computed live from
the fetched page and never require Gemini. Six categories, each scored
from real signals:

- **Messaging & Copy Clarity** — title/meta length, heading text quality, word count.
- **UI/UX & Visual Hierarchy** — heading structure/order, viewport config, alt-text coverage, ARIA landmarks, font sprawl.
- **Conversion Rate Optimization** — above-the-fold CTA detection, form field count, contact links.
- **Technical & Metadata Health** — canonical/meta tags, structured data (JSON-LD), **live `/robots.txt`** (missing file, blanket disallow, sitemap reference), **live `/sitemap.xml`** (validity, URL count, lastmod freshness, sitemap-index support).
- **Brand Distinctiveness** — favicon, Open Graph/Twitter Card completeness, theme-color, manifest.
- **Security & Performance** *(new)* — real HTTP response headers (HSTS, CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, exposed Server/X-Powered-By headers, Cache-Control, Content-Encoding), a **manually-tracked redirect chain** (hop count, HTTPS→HTTP downgrade detection, loop detection), **measured server response time**, mixed-content scanning (hardcoded `http://` resources on an HTTPS page), and doctype/meta-refresh checks.

All of this — including redirect-chain following, header inspection, and
timing — comes from the live `fetch()` response itself. No third-party
scanning API, no paid service, nothing beyond the audited site's own
server responses.

See `lib/analyze.ts` for the full signal list and scoring formulas.
