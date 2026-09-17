<div align="center">

# Audityxe

**Instant, evidence-based website audits — every score backed by a real, live check.**

[Live app](https://audityxe.vercel.app) · [Methodology](https://audityxe.vercel.app/methodology) · [Sample report](https://audityxe.vercel.app/sample-report) · [Changelog](https://audityxe.vercel.app/changelog)

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
- [Tech stack](#tech-stack)
- [Getting started](#getting-started)
- [Environment variables](#environment-variables)
- [PageSpeed Insights (Lighthouse) setup](#pagespeed-insights-lighthouse-setup)
- [Payments (NOWPayments)](#payments-nowpayments)
- [Project structure](#project-structure)
- [Plans and limits](#plans-and-limits)
- [Design system](#design-system)
- [Scripts](#scripts)
- [Deploying](#deploying)
- [Contributing](#contributing)
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

- Real browser-rendered Lighthouse pass via Google PageSpeed Insights (Core Web Vitals: LCP, CLS, TBT, FCP, Speed Index)
- **Real-world CrUX field data** when Google has enough traffic on the origin — distinguished from lab data
- **Render Proof** — the actual Chrome screenshot Lighthouse captures, embedded in the report
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

## Exports

| Format | Contents |
|---|---|
| **PDF** | Full branded report — score donut, category breakdown, every module and finding with evidence, Lighthouse lab + field data, embedded render screenshot |
| **JSON** | Complete machine-readable payload — every module, finding, severity, confidence, and evidence string |
| **Markdown** | Copy-to-clipboard / download, for pasting into GitHub Issues, Notion, or a PR |
| **Badge** | Embeddable "Audited by Audityxe" SVG badge with live verification |
| **Social** | Auto-generated X/LinkedIn post copy and a downloadable share banner |

## Tech stack

- **[Next.js 14](https://nextjs.org)** (App Router) · **[React 18](https://react.dev)** · **[TypeScript](https://www.typescriptlang.org)**
- **[Tailwind CSS](https://tailwindcss.com)** with a fully CSS-variable-driven token system
- **[Framer Motion](https://www.framer.com/motion/)** for animation
- **[Firebase](https://firebase.google.com)** — Auth + Firestore (accounts, plans, badge records, admin config)
- **[lucide-react](https://lucide.dev)** icons · **[jsPDF](https://github.com/parallax/jsPDF)** exports
- **[Google PageSpeed Insights API](https://developers.google.com/speed/docs/insights/v5/get-started)** for the real-browser pass
- **[NOWPayments](https://nowpayments.io)** for crypto checkout

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

- **Recurring subscriptions** — auto-renewing plans via NOWPayments' email-subscription flow (`/api/payments/nowpayments/subscribe`, wired into the pricing page as "auto-renew monthly by email"). Requires `NOWPAYMENTS_EMAIL` / `NOWPAYMENTS_PASSWORD` (subscription endpoints use a short-lived Bearer JWT minted on demand, not the API key directly) plus a `NOWPAYMENTS_PLAN_STANDARD` / `NOWPAYMENTS_PLAN_PRO` plan id from the dashboard.
- **Donations** — `/donate` embeds the real NOWPayments donation widget via `NEXT_PUBLIC_NOWPAYMENTS_DONATION_KEY` (a public, funds-safe key — not the same as `NOWPAYMENTS_API_KEY`). The footer's Sponsor button links there.

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

## Project structure

```
app/
  api/
    audit/            # the main audit endpoint
    payments/
      nowpayments/    # create invoice + IPN webhook
    settings/         # account settings, BYOK key validation
    admin/            # admin-only endpoints
  (legal pages)/      # privacy, terms, license, refund-policy, credits, …
  status/             # live service status
components/           # UI — all Tailwind token-driven, light/dark aware
lib/
  analyze.ts          # orchestrates a full audit
  audit-modules.ts    # turns signals into scored modules + findings
  deep-signals.ts     # HTML/DOM signal extraction
  pagespeed.ts        # PSI client, error translation, screenshot extraction
  dns-security.ts     # DNSSEC, CAA, subdomain takeover
  dns-email-auth.ts   # SPF, DKIM, DMARC
  tls-check.ts        # live TLS handshake inspection
  nowpayments.ts      # invoice creation + IPN HMAC verification
  pdf-export.ts       # PDF report builder
  export-payload.ts   # JSON report builder
```

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

Issues and pull requests are welcome. Before opening a PR:

```bash
npx tsc --noEmit && npx next lint && npm run build
```

All three must pass. Please keep new audit checks **deterministic** and **evidence-backed** — if a
check can't state *why* it failed with a real artifact from the page, it doesn't belong in the
engine.

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

[Audityxe Custom Open-Source License](./LICENSE.md) — use it, modify it, ship it, build a business
on it. Just credit **Zelvior** as the original author, clearly and visibly, with a link back to
[github.com/zelvior/audityxe](https://github.com/zelvior/audityxe).

---

<div align="center">
<sub>Audityxe — original work of <a href="mailto:zelvior@proton.me">Zelvior</a> · <a href="https://zsupport.netlify.app">Support</a></sub>
</div>
