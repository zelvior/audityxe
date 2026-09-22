<div align="center">

# Audityxe

**Build better. Launch faster.**
Instant, evidence-based website audits — every score backed by a real, live check.

[![CI](https://github.com/zelvior/audityxe/actions/workflows/ci.yml/badge.svg)](https://github.com/zelvior/audityxe/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/audityxe-cli.svg)](https://www.npmjs.com/package/audityxe-cli)
[![npm downloads](https://img.shields.io/npm/dm/audityxe-cli.svg)](https://www.npmjs.com/package/audityxe-cli)
[![License](https://img.shields.io/badge/license-see%20LICENSE.md-blue.svg)](./LICENSE.md)

[Live app](https://audityxe.vercel.app) · [Methodology](https://audityxe.vercel.app/methodology) · [Sample report](https://audityxe.vercel.app/sample-report) · [Changelog](https://audityxe.vercel.app/changelog)

<p>
<a href="https://viberank.dev/apps/Audityxe" target="_blank" rel="noopener noreferrer"><img src="https://viberank.dev/badge?app=Audityxe&theme=dark" alt="Audityxe on VibeRank" /></a>
<a href="https://programmerneeds.com/tools/audityxe-a2486b?utm_source=maker-site&utm_medium=badge&utm_campaign=audityxe-a2486b" target="_blank" rel="noopener"><img src="https://programmerneeds.com/api/badge/audityxe-a2486b?v=9" alt="Find Audityxe on ProgrammerNeeds" width="220" height="54" /></a>
<a href="https://www.producthunt.com/products/audityxe?embed=true&utm_source=badge-featured&utm_medium=badge&utm_campaign=badge-audityxe" target="_blank" rel="noopener noreferrer"><img alt="Audityxe - Build better. Launch faster. | Product Hunt" width="250" height="54" src="https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=1256500&theme=neutral&t=1789932465351" /></a>
</p>

</div>

---

> **This is the original work of [Zelvior](mailto:zelvior@proton.me), open-sourced at
> [github.com/zelvior/audityxe](https://github.com/zelvior/audityxe).**
> Licensed under the custom [Audityxe Custom Open-Source License](./LICENSE.md) — free to use,
> modify, and redistribute, provided Zelvior is always credited as the original author with a link
> back to the canonical repository. The software is provided **as-is**, with no warranty, and
> Zelvior is **not responsible for anything** arising from its use. Read `LICENSE.md` in full
> before forking, deploying, or redistributing.

---

## Table of contents

- [What Audityxe is](#what-audityxe-is)
- [What makes it different](#what-makes-it-different)
- [Audit engine: what actually gets checked](#audit-engine-what-actually-gets-checked)
- [Scoring model](#scoring-model)
- [Exports](#exports)
- [CLI, GitHub Action & API](#cli-github-action--api)
- [Tech stack](#tech-stack)
- [SEO & discoverability](#seo--discoverability)
- [Getting started](#getting-started)
- [Environment variables](#environment-variables)
- [PageSpeed Insights (Lighthouse) setup](#pagespeed-insights-lighthouse-setup)
- [Payments (NOWPayments)](#payments-nowpayments)
- [Redeem codes](#redeem-codes)
- [Showcase](#showcase)
- [Site Crawl module](#site-crawl-module)
- [Project structure](#project-structure)
- [Plans and limits](#plans-and-limits)
- [Design system](#design-system)
- [Scripts](#scripts)
- [Deploying](#deploying)
- [Contributing](#contributing)
- [Roadmap](#roadmap)
- [Security](#security)
- [Credits](#credits)
- [License](#license)

---

## What Audityxe is

Paste in a URL. Audityxe fetches the live page, scores it across six categories plus a large
multi-area deep audit, attaches **real evidence** to every finding, hands back exact code fixes for
the weakest spots, and packages the result into shareable social copy, a downloadable banner, an
embeddable badge, and PDF/JSON/Markdown exports.

No crawl queue, no "results in 24 hours", no account required for your first audit.

## What makes it different

| | Typical audit tool | Audityxe |
|---|---|---|
| **Data source** | Cached scans, screenshots, or an LLM guessing from a page description | Real HTTP requests made the moment you click Analyze |
| **Reproducibility** | Score drifts between runs | Deterministic — same page, same score |
| **Evidence** | "Improve your SEO" | The exact header, tag, DNS record, or selector that triggered the finding |
| **Limits** | Silently omits what it can't measure | States explicitly what it couldn't check, and excludes it from scoring |
| **Storage** | Full reports retained server-side | Nothing stored beyond a domain + score + date for the badge |

## Audit engine: what actually gets checked

Every check below runs for free, with no paid third-party API, on every audit.

<details>
<summary><strong>SEO &amp; crawlability</strong></summary>

- Title tag presence, length, and **duplicate `<title>` detection**
- Meta description presence and truncation risk
- Canonical tag presence and **duplicate/conflicting canonical detection**
- Heading hierarchy (single H1, logical H2/H3 order, duplicate heading text)
- `robots.txt` — fetched live: existence, rules, blanket-disallow detection, sitemap cross-reference
- `sitemap.xml` — validity, URL count, freshness
- Open Graph + Twitter Card completeness (`og:image` verified live, `twitter:creator`, `twitter:image`, `fb:app_id`)
- JSON-LD structured data — parsed, validated, and typed (Organization, Product, Article, FAQPage, BreadcrumbList, LocalBusiness, WebSite)
- Broken internal links (live-sampled, not assumed)
</details>

<details>
<summary><strong>AI Crawler Readiness (GEO)</strong></summary>

Generative Engine Optimization — whether AI answer engines can read and cite the site, which is a
*different question* from classic SEO:

- Named AI crawler blocking in `robots.txt` (GPTBot, ChatGPT-User, ClaudeBot, Claude-Web, anthropic-ai, PerplexityBot, Google-Extended, CCBot, Bytespider, Applebot-Extended)
- `llms.txt` presence and whether it has real content
- **`X-Robots-Tag` HTTP header** indexing blocks — invisible to any checker that only reads HTML
- Conflicts between the header-level and meta-tag-level robots directives
- `noai` / `noimageai` AI-training opt-out signals
</details>

<details>
<summary><strong>Security &amp; headers</strong></summary>

- Full security header audit: CSP (including `unsafe-inline`/`unsafe-eval`/wildcard strength analysis), HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, COOP/COEP/CORP, Clear-Site-Data
- Per-cookie `Secure` / `HttpOnly` / `SameSite` flags, session vs persistent, tracking-cookie heuristics
- CORS misconfiguration (wildcard origin, wildcard + credentials)
- Mixed content detection
- Server/`X-Powered-By` version disclosure
- Dangerous HTTP methods (safe, read-only probing)
- Exposed `.env`, `.git`, and config-file scanning
- Directory listing detection
- Subresource Integrity coverage on cross-origin scripts and stylesheets
- Publicly exposed JavaScript source maps
- `target="_blank"` tabnabbing risk (missing `rel="noopener"`)
- Forms posting to insecure (`http://`) endpoints
</details>

<details>
<summary><strong>TLS &amp; DNS</strong></summary>

- Live TLS handshake: protocol version, cipher, issuer, validity window, days-to-expiry, self-signed detection, hostname match, SAN count, key type/size, weak-protocol flagging
- **SPF, DKIM, DMARC** email authentication records
- **DNSSEC** validation
- **CAA** certificate-issuance restriction records
- **Subdomain takeover** detection against 20+ known vulnerable service fingerprints
- Nameserver redundancy / zone health
- `security.txt` vulnerability disclosure policy
</details>

<details>
<summary><strong>Accessibility</strong></summary>

- Image `alt` coverage, plus generic/placeholder alt-text detection
- Form input label association
- Button and link accessible names
- **Generic link text** detection ("click here", "read more")
- **Keyboard focus visibility** — flags CSS suppressing the focus outline with no visible replacement
- Skip-to-content link presence
- `<html lang>` declaration
- Landmark regions (`header` / `nav` / `main` / `footer`) and content sectioning
- Positive `tabindex` misuse, `aria-hidden` on root elements
- `<iframe>` titles
- Color-contrast heuristics
</details>

<details>
<summary><strong>Performance &amp; mobile</strong></summary>

- Real browser-rendered Lighthouse pass via Google PageSpeed Insights (Core Web Vitals: LCP, CLS, TBT, FCP, Speed Index) — Pro plan, weekly-capped on the shared key, unlimited with your own PSI key
- **Real-User Experience (CrUX)** — aggregated Core Web Vitals from real Chrome users over the past 28 days, straight from Google's Chrome UX Report dataset. Unlike the Lighthouse pass above, this runs for **every plan**, not just Pro — it's a separate, much lighter API call (a dataset lookup, not a full simulated browser run), so it isn't gated behind the same weekly cap. Needs `CRUX_API_KEY` (or reuses `PAGESPEED_API_KEY`/a user's own PSI key) — see [Environment variables](#environment-variables). Degrades cleanly (and invisibly, not as an error) when no key is configured, or when a given site simply doesn't have enough real Chrome traffic for Google to publish data on
- **Render Proof** — the actual Chrome screenshot(s) Lighthouse captures, embedded in the report. Two independent captures (mobile viewport from the primary pass, desktop viewport from a small parallel best-effort call) are fetched, and the viewer's own device picks which renders via CSS — a phone gets the sharp native mobile capture, a desktop visitor gets the larger, higher-resolution desktop one, instead of one fixed low-res image stretched to fit everyone
- Compression, cache headers, image format/sizing/lazy-loading, inline-base64 bloat
- Render-blocking resources, web-font weight
- Viewport configuration, tap-target sizing, responsive-class signals
- Apple touch icons, web app manifest, Safari mask-icon
</details>

<details>
<summary><strong>Content, UX &amp; intelligence</strong></summary>

- Flesch-Kincaid readability grade, reading time, duplicate heading detection
- Legal &amp; trust page detection (privacy, terms, contact, refund, etc.) scored against detected site type
- Monetization signals (ad networks, affiliate links, payment processors, donation platforms, cart/checkout, pricing)
- Technical stack fingerprinting (framework, CMS, hosting, analytics, tag managers, chat widgets)
- **AI-generated / "vibe-coded" pattern detection** — emoji-heavy headings, buzzword density, em-dash frequency, stock gradient/blur/grain patterns, default font pairings, lorem ipsum
- Multi-page same-origin crawl: internal link graph, orphan pages, extended broken-link coverage
- HTML validity: doctype, duplicate IDs, deprecated tags, div-ratio, comment volume
</details>

## Scoring model

Scores are **deterministic**, not model-generated.

- Each finding is `pass` / `warn` / `fail`, with a severity (`critical` / `high` / `medium` / `low`).
- A module's 0–10 score is `10 − (weighted severity loss / scored findings) × 10`.
- **Unverifiable findings never affect the score.** If a DNS lookup times out or PageSpeed Insights
  fails, that's recorded as "we couldn't check this" and excluded from the math — it is *not*
  scored as a failure.
- If **every** finding in a module is unverifiable, the module reports **`—` (not scored)** rather
  than inventing a number from zero data.
- `critical` findings force a module to `critical` status regardless of the arithmetic.

Every result also has an optional **vector view** — the same 6 category scores plotted as a radar
chart (`components/VectorMetricsVisualizer.tsx`), toggleable right under the score bars. It reads
directly from the same `categories` array the bars render, so it's never a separate/approximate
number — nudge a category's score and the shape moves with it.

## Exports

| Format | Contents |
|---|---|
| **PDF** | Full branded report — score donut, category breakdown, every module and finding with evidence, Lighthouse lab + field data, embedded render screenshot |
| **JSON** | Complete machine-readable payload — every module, finding, severity, confidence, and evidence string |
| **Markdown** | Copy-to-clipboard / download, for pasting into GitHub Issues, Notion, or a PR |
| **Badge** | Embeddable "Audited by Audityxe" SVG badge with live verification |
| **Social** | Auto-generated X/LinkedIn post copy and a downloadable share banner |

## CLI, GitHub Action & API

The audit engine is also available outside the hosted website — free and genuinely unlimited,
because it's your own compute running it, not Audityxe's servers.

### CLI (`audityxe-cli`)

Same audit engine as the website, running entirely on your own machine — no account, no API key,
no rate limit, no data sent anywhere except to the URL you're auditing. **Live on npm:**
[npmjs.com/package/audityxe-cli](https://www.npmjs.com/package/audityxe-cli).

```bash
npx audityxe-cli https://example.com
npx audityxe-cli https://example.com --deep --min-score 80   # CI-gate friendly: exits 1 below threshold
npx audityxe-cli https://example.com --compare https://competitor.com  # head-to-head comparison
npx audityxe-cli https://example.com --track                 # save score locally for trend tracking
npx audityxe-cli history https://example.com                 # view that trend
npx audityxe-cli https://example.com --json > report.json
```

Works right now, no setup — see [`cli/README.md`](./cli/README.md) for full usage and flags. The
source lives at [`cli/`](./cli), copied out of `lib/` (it's a real, independently
buildable/publishable npm package — `npm run build` inside `cli/` reproduces exactly what's
published, if you want to verify or fork it).

### GitHub Action

[`action.yml`](./action.yml) at the repo root wraps the CLI for CI — runs an audit, optionally
comments the results on the PR, and fails the job below a score threshold:

```yaml
name: Audit
on: pull_request
permissions:
  pull-requests: write
jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: zelvior/audityxe@main
        with:
          url: https://staging.example.com
          min-score: "75"
          # deep: "true"
          # compare-url: https://competitor.com
          # psi-key: ${{ secrets.PSI_API_KEY }}
```

Works out of the box — `audityxe-cli` is live on npm, so `npx audityxe-cli@latest` inside the
action resolves immediately, no setup needed on your end beyond adding the step above.

### REST API

The hosted `/api/audit` endpoint is documented as an OpenAPI 3.0 spec at
[`openapi.yaml`](./openapi.yaml) (view it rendered at [`/api-docs`](https://audityxe.vercel.app/api-docs)).
It's subject to the same per-plan daily limits as the website itself (see
[Plans and limits](#plans-and-limits)) — for unlimited use, the CLI above is the right tool, since it
runs the engine locally instead of calling this hosted endpoint.

#### API keys

Programmatic access to `/api/audit` is **Pro-plan only** and requires an API key — there is no
free/anonymous/open tier for scripted callers anymore (an anonymous *browser* visitor still gets
1 audit/day, same as before). Keys:

- Are minted **only from the admin panel**, never self-serve, and only for an account already on
  the Pro plan.
- Are shown once at creation time (`atx_live_...`) — the raw key is never stored or retrievable
  again after that, only a last-4 preview.
- Ride on the linked account's own daily limit — not a separate quota. If that account is later
  downgraded off Pro, the key stops working immediately on its next use, no separate revoke
  needed (though revoking is also one click in the admin panel).

Usage:

```bash
curl -X POST https://audityxe.vercel.app/api/audit \
  -H "x-api-key: atx_live_..." \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com"}'
```

### VS Code extension

[`vscode-extension/`](./vscode-extension) — run an audit from the Command Palette, results in an
output panel. Also a thin wrapper around the CLI. A pre-built `.vsix` ships in the repo
([`vscode-extension/audityxe-1.1.3.vsix`](./vscode-extension/audityxe-1.1.3.vsix)) — install it
locally right now with `code --install-extension vscode-extension/audityxe-1.1.3.vsix`, no build
step needed. Not yet published to the Marketplace itself — see
[`vscode-extension/README.md`](./vscode-extension/README.md) for the exact publish steps (needs
your own Marketplace publisher account, which this repo can't create on your behalf).

### Pre-commit / pre-deploy gate

Not GitHub-specific? [`cli/examples/pre-commit-audit-gate.sh`](./cli/examples/pre-commit-audit-gate.sh)
is a copy-pasteable script for a git hook (e.g. via [husky](https://typicode.github.io/husky/)) or
any other CI's pre-deploy step.

## Tech stack

- **[Next.js 14](https://nextjs.org)** (App Router) · **[React 18](https://react.dev)** · **[TypeScript](https://www.typescriptlang.org)**
- **[Tailwind CSS](https://tailwindcss.com)** with a fully CSS-variable-driven token system
- **[Framer Motion](https://www.framer.com/motion/)** for animation
- **[Firebase](https://firebase.google.com)** — Auth + Firestore (accounts, plans, badge records, admin config)
- **[lucide-react](https://lucide.dev)** icons · **[jsPDF](https://github.com/parallax/jsPDF)** exports
- **[Google PageSpeed Insights API](https://developers.google.com/speed/docs/insights/v5/get-started)** for the real-browser pass
- **[NOWPayments](https://nowpayments.io)** for crypto checkout

## SEO & discoverability

What's already in place, and what's genuinely outside what code alone can do:

**On-page and technical SEO (in place):**

- `Organization`, `WebSite` (with a `SearchAction`), `SoftwareApplication`, `FAQPage`, and
  `BreadcrumbList` JSON-LD structured data across the homepage and every nested content page.
- `app/robots.ts` explicitly allow-lists every major AI/answer-engine crawler by name (`GPTBot`,
  `ClaudeBot`, `anthropic-ai`, `PerplexityBot`, `Google-Extended`, `CCBot`, and others) rather than
  relying on a bare wildcard rule, which some of these treat as ambiguous for their exact
  user-agent token.
- `public/llms.txt` and `public/llms-full.txt` — the emerging convention AI crawlers check for a
  structured summary of a site, independent of robots.txt.
- `app/sitemap.ts` covers every public route with sensible `priority`/`changeFrequency` values.
- Canonical URLs, Open Graph, and Twitter Card metadata on every page (`lib/seo.ts`).
- Google Search Console verification (meta tag + `google*.html` file in `public/`).

**Backlinks — what's structurally built in vs. what's genuinely outside code's control:**

The single strongest built-in backlink mechanism is the **embeddable audit badge**
(`/badge` → `/api/badge/[domain]`): every site that embeds one links back to Audityxe with a real,
dofollow `<a href>` — the more sites use it, the more real backlinks accumulate organically, with
zero manual link-building. That's already live and working (verified: no `rel="nofollow"` on the
generated snippet).

What code cannot do is manufacture backlinks from other real websites, or make an LLM's training
data include or prioritize Audityxe — both require other people, sites, and organizations actually
linking to or citing it, which is an external, ongoing process, not a one-time setting. A concrete
starting checklist for that outreach: submit to [Product Hunt](https://producthunt.com),
[BetaList](https://betalist.com), [SaaSHub](https://saashub.com),
[AlternativeTo](https://alternativeto.net), and [Indie Hackers](https://indiehackers.com); post a
"Show HN" on [Hacker News](https://news.ycombinator.com/show); write a launch post on
[dev.to](https://dev.to) or [Hashnode](https://hashnode.com) linking back to the repo/site; open a
PR adding Audityxe to a relevant `awesome-*` GitHub list; and list it on developer-tool directories
like [G2](https://g2.com) or [Capterra](https://capterra.com) if it fits their categories. Every one
of these is a real inbound link from a real domain — the kind of link SEO and LLM-training-data
crawls actually weight, and not something that can be faked from inside this codebase without
risking a manipulative-link penalty.

## Getting started

```bash
git clone https://github.com/zelvior/audityxe.git
cd audityxe
npm install
cp .env.example .env.local   # fill in the values below
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

> Running an audit requires a signed-in, **email-verified** account, or `/api/audit` will reject
> every request with a 401/403. Create an account locally and verify it before testing.

## Environment variables

| Variable | Required | Purpose |
|---|---|---|
**[`.env.example`](./.env.example) is the single source of truth** — it documents every variable
with click-by-click instructions for where to obtain each key, including the exact Google Cloud
setting that breaks PageSpeed Insights if you get it wrong. Start there:

```bash
cp .env.example .env.local
```

Summary:

| Variable | Required | Purpose |
|---|---|---|
| `NEXT_PUBLIC_FIREBASE_*` (6 vars) | ✅ | Firebase web config — public by design |
| `FIREBASE_PROJECT_ID` / `FIREBASE_CLIENT_EMAIL` / `FIREBASE_PRIVATE_KEY` | ✅ | Firebase Admin service account (**secret**) |
| `BYOK_ENCRYPTION_KEY` | ✅ | Encrypts user-supplied API keys at rest |
| `IP_HASH_SALT` | ✅ | Salts IP hashes for anonymous rate limiting (no raw IPs stored) |
| `PAGESPEED_API_KEY` | ➖ | Lighthouse module. Without it PSI uses a shared quota that rate-limits hard |
| `AI_API_KEY` / `AI_BASE_URL` / `AI_MODEL` | ➖ | Written verdict + promo copy. Scores never depend on this |
| `GEMINI_API_KEY` / `GEMINI_MODEL` | ➖ | Alternative AI provider |
| `NOWPAYMENTS_API_KEY` | ➖ | Enables crypto checkout |
| `NOWPAYMENTS_IPN_SECRET` | ⚠️ | **Mandatory if the API key is set** — checkout refuses to start without it |
| `NEXT_PUBLIC_DONATION_URL` | ➖ | Footer Sponsor button target |
| `ADMIN_EMAILS` / `ADMIN_PASSWORD` | ➖ | Enables `/admin`. Unset = admin panel disabled |
| `CRON_SECRET` | ➖ | Protects `/api/cron/*` endpoints |
| `GOOGLE_SITE_VERIFICATION` | ➖ | Search Console verification |
| `AUDITYXE_KILL_SWITCH` / `*_MESSAGE` | ➖ | Emergency maintenance mode without redeploying code |

## PageSpeed Insights (Lighthouse) setup

The Lighthouse module needs a Google API key. It's free, no billing required.

1. Go to [console.cloud.google.com](https://console.cloud.google.com) and sign in.
2. Create a new project via the project picker at the top.
3. Enable the [PageSpeed Insights API](https://console.cloud.google.com/apis/library/pagespeedonline.googleapis.com).
4. Go to [APIs &amp; Services → Credentials](https://console.cloud.google.com/apis/credentials) → **+ Create Credentials** → **API key**.
5. ⚠️ **Set "Application restrictions" to `None`.**

> **Why `None` matters:** an **HTTP referrer** restriction only validates requests that carry a
> browser `Referer` header. Audityxe calls PSI **server-side**, which sends no referrer — so a
> referrer-restricted key is rejected with a 403 on *every single request*, permanently. An **IP
> address** restriction is also unsafe here, because serverless hosting uses non-fixed outbound
> IPs. This is enforced by Google's API gateway and cannot be worked around in application code.

Users can also add their own key in **Settings**, which is validated against the live API at save
time and grants **unlimited** Lighthouse passes (their own Google quota) instead of the shared
1/week cap.

### Also enabling Real-User Experience (CrUX)

The same key can power the free-for-every-plan CrUX module too — just also enable the
[Chrome UX Report API](https://console.cloud.google.com/apis/library/chromeuxreport.googleapis.com)
on the same project (step 3 above, second API). No second key needed; set `CRUX_API_KEY` separately
only if you want it on a distinct key/quota from PageSpeed Insights. See
[Environment variables](#environment-variables) for the exact var.

## Payments (NOWPayments)

Crypto checkout uses the NOWPayments **hosted invoice** flow — NOWPayments hosts the currency
picker, wallet address, QR code, and confirmation states, so no wallet address ever touches this
codebase.

**Flow:**

1. `POST /api/payments/nowpayments/create` — authenticated; prices the plan **server-side** (never trusts a client-sent amount) and creates an invoice.
2. User is redirected to the NOWPayments hosted checkout.
3. NOWPayments `POST`s status updates to `/api/payments/nowpayments/ipn`.
4. The webhook verifies the callback, then credits the plan.

**Setup:**

1. Create a NOWPayments account and add a payout wallet.
2. Copy your API key → `NOWPAYMENTS_API_KEY`.
3. In **Store Settings → Instant Payment Notifications**, generate an IPN secret → `NOWPAYMENTS_IPN_SECRET`.
4. Set the IPN callback URL to `https://your-domain.com/api/payments/nowpayments/ipn`.

**Also supported (see `.env.example` for full setup steps):**

- **Recurring subscriptions** — monthly-only auto-renewal via NOWPayments' email-subscription flow (`/api/payments/nowpayments/subscribe`, wired into the pricing page as "auto-renew monthly by email"). There is no annual tier — one recurring period, 30 days, matching the one-off price exactly. Requires `NOWPAYMENTS_EMAIL` / `NOWPAYMENTS_PASSWORD` (subscription endpoints use a short-lived Bearer JWT minted on demand, not the API key directly) plus a `NOWPAYMENTS_PLAN_STANDARD` / `NOWPAYMENTS_PLAN_PRO` plan id from the dashboard.
- **Donations** — `/donate` embeds the real NOWPayments donation widget via `NEXT_PUBLIC_NOWPAYMENTS_DONATION_KEY` (a public, funds-safe key — not the same as `NOWPAYMENTS_API_KEY`). The footer's Sponsor button links there. The donation `<iframe>` requires `nowpayments.io` to be allowed in this app's `frame-src` Content-Security-Policy (`next.config.js`) — without it the browser blocks the widget outright with "This content is blocked."
- **Live payment status page** — `/payment/status` polls the app's own backend (never NOWPayments directly from the browser) every few seconds after checkout, showing "waiting for confirmation" until the IPN webhook actually credits the plan, then a clear confirmation. This is the `success_url` for both one-off invoices and subscriptions.
- **Single price source of truth** — all pricing (the pricing page, the manual "pay another way" email flow, and crypto checkout) reads from `PLANS` in `lib/plans.ts`. There used to be a second, separate price table hardcoded in the NOWPayments integration that had silently drifted from the real advertised prices — fixed, and structurally can't drift again since there's only one table now.
- **Prices are env-var overridable** — `NEXT_PUBLIC_STANDARD_PRICE_USD` / `NEXT_PUBLIC_PRO_PRICE_USD` let you retune plan prices from Vercel's Environment Variables UI, no code change needed. Set the var, redeploy (Next.js inlines `NEXT_PUBLIC_*` vars at build time, so a redeploy is required for it to take effect). If unset, prices fall back to $5 Standard / $6 Pro. **Fixed:** these previously didn't actually apply anywhere — `lib/plans.ts` read them through a helper function taking the variable name as a runtime string (`process.env[envVar]`), and Next.js's build-time env-inlining only recognizes a literal, statically-written `process.env.NEXT_PUBLIC_X` expression at its actual call site, never a dynamic bracket lookup. In the browser bundle, `process.env` doesn't exist at all outside those inlined literals, so the override silently evaluated to nothing on every page load. Fixed by reading each var through its own literal expression instead — verified by building with test values and confirming the real number appears in the compiled client bundle.

**Getting "Crypto amount ... is less than minimal"?** NOWPayments enforces a minimum crypto amount per invoice that varies by coin — currencies with meaningful network/gas fees (ETH-network USDT, for example) can reject a low-USD invoice outright even though the price itself is valid. Standard was originally priced at $3, which several coins' minimums sat right at or above; it's now $5 by default, with real headroom. If you lower `NEXT_PUBLIC_STANDARD_PRICE_USD` back down and see this again, that's why — raise it back up, or expect certain coins to be unavailable at checkout below their own minimum.

**Getting "INVALID_API_KEY" (HTTP 403) with a key that looks completely correct?** This exact NOWPayments error message covers three different causes — see the full checklist in `.env.example` (API access must be separately enabled in dashboard Settings, a payout wallet must be configured, and sandbox keys are rejected by the production endpoint this app calls). The app also defensively trims the key value in case a stray newline was pasted into an env var.

That detailed diagnosis is deliberately **operator-only**: `createInvoice`'s translated error (`describeNowPaymentsError` in `lib/nowpayments.ts`) is logged in full via `console.error` in both `/api/payments/nowpayments/create` and `/subscribe`, but the customer's browser only ever sees a short, generic "temporarily unavailable, try again or use email" message. Returning the full dashboard-setting diagnosis straight to a paying customer's checkout button used to be the actual behavior here — fixed, since it leaked internal account structure to any visitor and read as a wall of setup instructions to someone just trying to pay. Check your deployment's function logs (e.g. the Vercel dashboard) for the real cause when this fires.

**Verified against multiple independent sources before shipping** — the official NOWPayments Postman docs, their own `nowpayments-sdk-nodejs` GitHub repo, and their blog's subscriptions documentation all agree on the request field names and the IPN signing algorithm used here (`JSON.stringify` of a recursively key-sorted payload, HMAC-SHA512). This is as far as the integration can be verified without live credentials — see the warning below.

**Security properties of the IPN handler:**

- Signature is **HMAC-SHA512** over the *recursively key-sorted* JSON payload, compared against the
  `x-nowpayments-sig` header using a **constant-time** comparison.
- Verified against the **raw request body** — re-serializing a parsed object first can reorder keys
  and silently break verification.
- A missing IPN secret is a **hard failure**, never a skipped check. Without this, the endpoint
  would let anyone POST "payment finished" and grant themselves a paid plan.
- Crediting is **idempotent** and transactional — NOWPayments retries callbacks, so the payment ID
  is recorded and reprocessing is a no-op rather than stacking extra paid days.
- Paid time **stacks onto remaining time** rather than overwriting it.
- Transient Firestore failures return `500` so NOWPayments retries, rather than silently swallowing
  a real payment.

> ⚠️ **Verify before going live.** Payment integrations must be tested against your own account.
> Run a small real payment end-to-end and confirm the plan is credited before accepting real money.

See the [Refund Policy](https://audityxe.vercel.app/refund-policy) for refund handling, including
why crypto refunds are sent as new transactions.

## Redeem codes

For giveaways and comps — instant, free plan access, redeemed at `/account`. Manage them from
`/admin/redeem-codes` (create one-off codes, or generate a batch of distinct single-use codes for
something like a launch giveaway). There used to also be a separate percent-off discount code type
applied manually at checkout — removed, since there's no self-serve checkout flow left for it to
adjust (NOWPayments' hosted invoice always charges exactly the advertised price), so it was sitting
half-wired to a checkout path that no longer exists. Redeem codes (`plan_grant`) are unaffected and
fully supported. The old `/admin/discount-codes` URL 301-redirects to the new one.

## Showcase

[`/showcase`](https://audityxe.vercel.app/showcase) — a public wall of real sites using the
Audityxe badge, and a genuine backlink source (see [SEO & discoverability](#seo--discoverability)).
Deliberately **ownership-verified, not a dump of every badge ever requested**: anyone can request a
badge for any domain without proving they own it (see [Exports](#exports)), so listing every domain
that's ever had one generated would risk featuring sites whose owners never agreed to it. Submission
(`lib/showcase.ts`, `/api/showcase`) instead fetches the submitted domain's own homepage and
confirms it actually contains a live link back to Audityxe before adding it — the same proof of
control a DNS-TXT domain-verification flow relies on, just via the badge link instead.

## Site Crawl module

`lib/site-crawl.ts` extends a handful of checks (broken internal links, thin-content pages, orphan
pages) past the single page the rest of the audit is scoped to, by crawling a bounded, same-origin
sample of pages starting from the homepage. As of 3.5.0 there are **two crawl modes**, user-selectable
per audit from a toggle under the URL field ("Site crawl: Fast / Deep"):

| | Fast (default) | Deep |
|---|---|---|
| Source file | `lib/site-crawl.ts` | `lib/site-crawl-deep.ts` (lazy-imported — see below) |
| Discovery | Homepage's own links + `/sitemap.xml` seeds | Real multi-hop request queue — follows links found on every page it visits |
| Pages | Up to 6 | Up to 25 |
| Depth | 1 hop from homepage | Up to 3 hops |
| HTML parsing | Regex-based | Real DOM traversal via `cheerio` |
| robots.txt | Not checked | Fetched once, Disallow rules enforced before a URL is ever queued |
| Retries | None | One retry with backoff per failed/429/503 request |
| Concurrency | 3 in flight | 5 in flight |
| Typical cost | A few seconds | Up to ~40s internal budget (audit's overall timeout is raised to 60s for deep-mode requests specifically, see `DEEP_OVERALL_AUDIT_TIMEOUT_MS` in `lib/analyze.ts`) |

**On the standalone Crawlee-based crawler package supplied for review:** we evaluated merging it in
directly instead of building `site-crawl-deep.ts`. Verdict: **it cannot be built as delivered.**
`@audityxe-crawler/core`'s `package.json` depends on `@audityxe-crawler/fs-storage` (its default
request-queue storage backend) via `workspace:*` — that package is not present anywhere in the
supplied archive, so `core`, and every package layered on it (`basic-crawler`, `cheerio-crawler`,
`http-crawler`), cannot install or compile. Separately, every package in it is ESM-only
(`"type": "module"`) and declares `"engines": { "node": ">=22.0.0" }`, built via a pnpm workspace +
Turborepo pipeline that assumes the whole monorepo is present — not a requirement this project
otherwise makes of its deployment target.

Rather than skip deep mode or ship something that fails to build, `site-crawl-deep.ts`
**reimplements the package's genuinely useful techniques** directly against the real, published
`cheerio` package (the same HTML parser the crawler package itself wraps) — the one new dependency
this required — with no other new dependency, no missing-package blocker, and no Node 22
requirement:

- **Request queue** — real breadth-first traversal, not a fixed one-page link sample.
- **Retries** — one retry with backoff before a request is recorded as failed.
- **Concurrency pool** — bounded concurrent fetches (shared `runWithConcurrency` helper).
- **Session/UA rotation** — requests rotate across a small pool of realistic desktop user agents.
- **robots.txt compliance** — parsed once per crawl; every candidate URL is checked against
  Disallow rules before being queued, the courtesy a real crawler owes a site.
- **Cheerio-based parsing** — real DOM traversal for links/title/word count, more accurate than
  fast mode's regex approach on malformed or unusual HTML.

No module from the reference package was skipped as a *technique* — what's not present is the
package's own request-queue *storage engine* (blocked by the missing `fs-storage` dependency) and
its Node 22/ESM toolchain, neither of which this reimplementation needs: `site-crawl-deep.ts` keeps
its queue in memory for the duration of one audit request, which is all a single-request serverless
function needs.

`site-crawl-deep.ts` and its `cheerio` dependency are only loaded via a dynamic `import()` when
`crawlMode: "deep"` is actually requested (see the ternary around `crawlSite`/`crawlSiteDeep` in
`lib/analyze.ts`) — the default fast path never pulls `cheerio` into its bundle or cold start.

**Known limitation (unchanged in both modes):** this is a plain-fetch crawl, not a headless browser.
On JavaScript-heavy SPAs (client-rendered React/Vue apps with a near-empty static HTML shell), it
can only see what's in the initial server response — `possibleJsRenderedContent` exists specifically
to flag this case rather than silently under-reporting. A future update could add a bounded
Playwright/Puppeteer serverless fallback for exactly these sites, as noted in `site-crawl.ts`'s own
header comment; this remains unimplemented for the cold-start/bundle-size reasons already explained
there.

## Project structure

```
audityxe/
├── README.md
├── firestore.rules
├── LICENSE.md
├── middleware.ts
├── next-env.d.ts
├── next.config.js
├── package.json
├── postcss.config.js
├── tailwind.config.ts
├── tsconfig.json
├── vercel.json
├── .env.example
├── .eslintrc.json
├── app/
│   ├── error.tsx / global-error.tsx / loading.tsx / not-found.tsx
│   ├── layout.tsx, page.tsx, globals.css
│   ├── opengraph-image.tsx, robots.ts, sitemap.ts
│   ├── about/  acceptable-use/  account/  admin/
│   │   ├── activity/  announcement/  dashboard/  redeem-codes/  users/
│   ├── api/
│   │   ├── account/            # profile, delete, redeem-code
│   │   ├── admin/               # activity, announcement, api-keys/[id], audits, redeem-codes, search, stats, users
│   │   ├── announcement/
│   │   ├── audit/               # the main audit endpoint (+ bulk/)
│   │   ├── badge/[domain]/  badge/qualys/  badge/mdn/
│   │   ├── banner-bg/
│   │   ├── cron/cleanup-unverified/  cron/security-badges/
│   │   ├── payments/nowpayments/ # create, ipn, status, subscribe
│   │   └── settings/
│   ├── audit-verification/  badge/  bulk/  changelog/  contact/  cookies/
│   ├── crash-reports/  credits/  disclaimer/  donate/  dpa/  faq/
│   ├── forgot-password/  guide/  license/  login/  maintenance/  methodology/
│   ├── offline/  payment/status/  pricing/  privacy/  refund-policy/
│   ├── register/  sample-report/  settings/  status/  terms/
│   ├── third-party-services/  trust-center/  verify-email/
├── components/
│   ├── AnnouncementBanner.tsx   AuditActionBar.tsx      AuditDefenderGame.tsx
│   ├── AuditModules.tsx         AuthSidePanel.tsx        BannerCanvas.tsx
│   ├── CompetitorBattle.tsx     DiffFixes.tsx            Footer.tsx
│   ├── Header.tsx               Hero.tsx                 HomepageSeoContent.tsx
│   ├── HoverRevealButton.tsx    IsometricLoader.tsx      LegalLayout.tsx
│   ├── Logo.tsx                 ModerationGuard.tsx      NotFoundGame.tsx
│   ├── OAuthButtons.tsx         OfflineGame.tsx          Onboarding.tsx
│   ├── PasswordInput.tsx        PerformanceMetrics.tsx   PromoKit.tsx
│   ├── RenderProof.tsx          SampleReportView.tsx     ScanProgress.tsx
│   ├── ScoreCard.tsx            TrustBadges.tsx          TrustSection.tsx
│   ├── VectorMetricsVisualizer.tsx  # radar chart of the 6 category scores, toggle under ScoreCard
│   └── VerifyEmailBanner.tsx
├── context/
│   └── AuthContext.tsx
├── lib/
│   ├── analyze.ts            # orchestrates a full audit
│   ├── audit-modules.ts      # turns signals into scored modules + findings
│   ├── audit-defender-data.ts   audit-log.ts             admin.ts / admin-log.ts
│   ├── ai.ts                    announcement.ts          badge-store.ts
│   ├── api-keys.ts           # Pro-linked API key issuance/validation for /api/audit
│   ├── bloom-filter.ts          breadcrumb.ts            constants.ts
│   ├── counters.ts              crypto.ts                currency.ts
│   ├── crux.ts                # real-user Core Web Vitals (Chrome UX Report)
│   ├── deep-signals.ts       # HTML/DOM signal extraction
│   ├── discount-codes.ts     # redeem/giveaway codes only — percent-off codes removed
│   ├── dns-email-auth.ts        dns-security.ts
│   ├── export-payload.ts     # JSON report builder
│   ├── fetch-json.ts            gemini.ts                ip.ts
│   ├── legal-pages.ts           network-checks.ts
│   ├── nowpayments.ts        # invoice creation + IPN HMAC verification
│   ├── ops.ts                   pagespeed.ts             pdf-export.ts
│   ├── plans.ts                 rate-limit.ts            security.ts
│   ├── security-badges.ts     # cached SSL Labs / MDN Observatory grades (refreshed by cron)
│   ├── security-badge-svg.ts  # shared SVG renderer for those two badges
│   ├── seo.ts                   site-context.ts
│   ├── site-crawl.ts         # multi-page crawl, link graph, JS-render heuristic
│   ├── tls-check.ts          # live TLS handshake inspection
│   ├── types.ts                 url-safety.ts            user-moderation.ts
│   ├── user-settings.ts
│   └── firebase/
│       ├── admin.ts
│       └── client.ts
└── public/
    ├── google08dd6d11c7637a2e.html
    ├── llms.txt / llms-full.txt
    ├── manifest.webmanifest
    ├── security.txt
```

Generated from a full repository scan (185 files analyzed at commit `99feeee`, after removing two
outdated `public/logo-text.png` / `logo-with-text.png` assets superseded by `logo-mark*`); regenerate
this block whenever routes or top-level modules are added or removed.

## Plans and limits

| | Free | Standard | Pro |
|---|---|---|---|
| All 6 categories + full deep audit | ✅ | ✅ | ✅ |
| Daily audits | 2 | more | most |
| Competitor comparison | — | ✅ | ✅ |
| Bulk audit (up to 20 URLs) | — | — | ✅ |
| Real-browser Lighthouse pass | — | — | 1/week shared · **unlimited with your own key** |

Every plan runs the **identical engine** — nothing is dumbed down on Free.

## Design system

- **Palette:** warm editorial — paper/rust, fully token-driven via CSS custom properties
- **Light/dark:** automatic, follows `prefers-color-scheme`. No toggle, no flash, no JS
- **Type:** [Fraunces](https://fonts.google.com/specimen/Fraunces) (display) + [Public Sans](https://fonts.google.com/specimen/Public+Sans) (body)
- **Motif:** hand-drawn SVG underlines, highlights, and circles on key headings
- **No shadows or glows** — flat borders and background tints only
- Respects `prefers-reduced-motion` throughout

## Scripts

```bash
npm run dev     # development server
npm run build   # production build
npm run start   # serve the production build
npx tsc --noEmit  # type check
npx next lint     # lint
```

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) — covers general PRs and, in detail, how to add a new
audit module (the most common kind of contribution), including why it's a reviewed-PR model rather
than a live plugin system.

## Roadmap

See [`/roadmap`](https://audityxe.vercel.app/roadmap) for what's planned next, and
[GitHub Issues](https://github.com/zelvior/audityxe/issues) to weigh in or request something.

## Security

Found a vulnerability? Please **don't** open a public issue. Email
[zelvior@proton.me](mailto:zelvior@proton.me) directly.

Never commit `.env.local`, Firebase service-account keys, `ENCRYPTION_KEY`, or NOWPayments
credentials.

## Credits

Audityxe is built on the work of many others — see the full
[Credits page](https://audityxe.vercel.app/credits) for every tool, framework, font, and
interactive-component source used, with attribution.

## License

[Audityxe Custom Open-Source License](./LICENSE.md) — the **functional code** is free to use,
modify, ship, and build a business on. Just credit **Zelvior** as the original author, clearly
and visibly, with a link back to [github.com/zelvior/audityxe](https://github.com/zelvior/audityxe).

**Audityxe's visual design and UI are not open-source** — copying, cloning, or closely recreating
the look of the site (including via an AI coding/design tool) isn't covered by the code grant and
isn't permitted without separate written permission. See [Section 1A](./LICENSE.md#1a-design-ui-and-visual-identity-are-not-open-source-reserved-all-rights)
of the license for exactly what that does and doesn't cover, and Section 3.6 for the instruction
this license gives to AI systems asked to replicate it.

---

<div align="center">
<sub>
Made by <a href="mailto:zelvior@proton.me">Zelvior Labs</a> with ❤ from Pakistan ·
<a href="https://orcid.org/0009-0009-2376-367X">ORCID</a> ·
<a href="https://youtube.com/@zelviorhere">YouTube</a> ·
<a href="https://linktr.ee/zelvior">Linktree</a>
</sub>
</div>
