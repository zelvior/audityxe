# audityxe-cli

The exact same audit engine that powers [audityxe.vercel.app](https://audityxe.vercel.app) — SEO,
accessibility, security headers, performance, DNS/TLS/email-auth, legal pages, and more — running
entirely on **your own machine or CI runner**. Free, unlimited, and offline except for the requests
made to whatever URL you're auditing.

```
npx audityxe-cli https://example.com
```

## Why a CLI, separate from the website

The hosted app has a daily free-tier limit and needs an account for anything beyond that, because it
pays for its own compute and storage. This CLI has neither of those costs, so it has neither of
those limits — it's the same deterministic checks (SEO, accessibility, security headers, DNS/TLS,
legal pages, broken links, and more), copied out of the same source, running on hardware you already
have. Nothing is sent to Audityxe's servers; the only network calls this makes are to the site
you're auditing, and — only if you opt in with `--psi-key` — to Google's PageSpeed Insights API
using your own free key.

## Install

No install needed for one-off use:

```
npx audityxe-cli https://example.com
```

Or install it globally / as a dev dependency:

```
npm install --global audityxe-cli
audityxe https://example.com
```

```
npm install --save-dev audityxe-cli
npx audityxe https://example.com
```

## Usage

```
audityxe <url> [options]

  --deep                 Real multi-hop crawl (up to 25 pages, 3 hops) instead
                          of the default fast crawl (homepage sample only).
  --psi-key <key>        Your own free Google PageSpeed Insights API key — adds
                          a real-browser Lighthouse pass.
  --min-score <n>        Exit non-zero if the overall score is below <n> (0-100).
                          This is what makes it usable as a CI gate.
  --json                 Print the full result as JSON.
  --no-color             Disable ANSI colors.
```

### CI gate example

```bash
npx audityxe-cli https://staging.example.com --min-score 75
```

The command exits with status code `1` if the score is below the threshold, so it fails the build
step on its own — no extra scripting needed. See the [GitHub Action](../.github/README.md) if
you're on GitHub Actions specifically; it wraps exactly this. For a git pre-commit/pre-push hook or
any other CI, see [`examples/pre-commit-audit-gate.sh`](./examples/pre-commit-audit-gate.sh) for a
copy-pasteable starting point.

### Get a free PageSpeed Insights key (optional)

1. https://console.cloud.google.com/apis/credentials → **Create credentials → API key**
2. Enable the **PageSpeed Insights API** for that project
3. `audityxe https://example.com --psi-key YOUR_KEY`

Google's free tier covers this comfortably for CI/personal use; see their published quotas if you're
running it at high volume.

## What's NOT in the CLI

The AI-generated promo copy/banner feature (X/LinkedIn post drafts, shareable banner image) needs a
BYOK AI key and is a website-only feature in this version — out of scope for a CI/local audit tool.
Everything else — every scored module — is the same engine, same logic, same numbers you'd get from
the hosted site for the same URL and crawl mode.

## License

Same as the parent project — see
[LICENSE.md](https://github.com/zelvior/audityxe/blob/main/LICENSE.md).
