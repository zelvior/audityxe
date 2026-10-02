# Audityxe — Website Audits in VS Code

Audit any public website without leaving your editor. Audityxe scores a live URL across **SEO,
performance, accessibility, security headers, TLS/DNS, UX, and AI-search readiness**, and prints
evidence-based findings straight into VS Code's Output panel.

It runs the same audit engine as [audityxe.xyz](https://audityxe.xyz), **entirely on your own
machine** — no account, no API key, no rate limit, no telemetry.

## Features

- **Audit a URL** — a fast, single-pass audit of the page and a sample of its links.
- **Deep crawl** — a real multi-hop crawl (up to 25 pages) for site-wide issues like broken links,
  orphan pages, and thin content.
- **Compare two URLs** — audit your site and a competitor's and get a head-to-head,
  category-by-category comparison.
- **View score history** — see how a site's score has trended over time.

All results appear in the **Audityxe** output panel.

## Getting started

1. Install **Audityxe** from the Extensions view (search `Audityxe`), or from the Command Line:

   ```bash
   code --install-extension zelvior.audityxe
   ```

2. Open the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`) and run any **Audityxe:** command.
3. Enter a URL (for example `https://example.com`). The report prints in the Output panel.

## Commands

| Command | What it does |
| --- | --- |
| **Audityxe: Audit a URL** | Fast audit of one URL (homepage-sample crawl). |
| **Audityxe: Audit a URL (Deep crawl)** | Multi-hop crawl, up to 25 pages. Takes longer. |
| **Audityxe: Compare Two URLs** | Prompts for your URL and a competitor's; audits both fully, so it takes longer than a single audit. |
| **Audityxe: View Score History** | Shows the score trend for a URL, or lists every tracked URL if you leave it blank. |

## Requirements

- **VS Code 1.85 or newer**
- **Node.js 18.17 or newer** and **npm** available on your `PATH` (check with `node --version`)
- An internet connection — to reach the site you audit and, on first use, to let `npx` download
  the CLI

## How it works

The extension is a thin wrapper around the open-source
[`audityxe-cli`](https://www.npmjs.com/package/audityxe-cli) package. Each command runs
`npx audityxe-cli@latest <url> --json` in the background and formats the result, so you always get
the latest audit checks without updating the extension. The first run may take a moment while `npx`
fetches the CLI.

## Score history

**View Score History** reads a local file, `~/.audityxe/history.json`. Entries are written when you
run the CLI yourself with the `--track` flag from a terminal:

```bash
npx audityxe-cli https://example.com --track
```

This extension only *reads* history; it never records anything by itself.

## Privacy

- No telemetry, no analytics, no account.
- The only network requests are to the URL you choose to audit and to the npm registry (when `npx`
  fetches the CLI). Nothing is sent to Audityxe's servers.
- Score history stays in a local file on your own machine.

## What it is — and isn't

Audityxe audits **deployed, publicly reachable URLs** from the outside using passive, read-only
checks. It does **not** lint the file you have open, scan your source code or dependencies, test
for exploitable vulnerabilities, or produce compliance reports. See
[what Audityxe does and doesn't do](https://audityxe.xyz/capabilities).

## Troubleshooting

- **"audit failed to run"** — open the **Audityxe** output panel for details. The usual cause is
  Node.js/npm not being on `PATH` for VS Code. Run `npx audityxe-cli https://example.com` in a
  terminal to confirm it works there, then restart VS Code.
- **The first audit is slow** — `npx` is downloading the CLI. Later runs are faster.
- **A deep crawl or comparison seems stuck** — those modes audit many pages (or two sites) and can
  take a couple of minutes.
- **Behind a corporate proxy** — configure npm's proxy (`npm config set proxy` /
  `https-proxy`) so `npx` can reach the registry.
- **URLs on `localhost` or private networks** — the CLI audits what your machine can reach, so
  these work from the extension even though the hosted web app blocks them.

More help: [audityxe.xyz/troubleshooting](https://audityxe.xyz/troubleshooting).

## Links

- Website and web app: [audityxe.xyz](https://audityxe.xyz)
- CLI guide: [audityxe.xyz/cli](https://audityxe.xyz/cli)
- Source and issues: [github.com/zelvior/audityxe](https://github.com/zelvior/audityxe)
- npm package: [audityxe-cli](https://www.npmjs.com/package/audityxe-cli)

## License

Audityxe Custom Open-Source License (ACOL-1.0) — see [LICENSE.md](LICENSE.md).
