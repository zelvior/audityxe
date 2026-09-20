# Audityxe for VS Code

Run a free, unlimited [Audityxe](https://audityxe.vercel.app) website audit from the Command
Palette — SEO, accessibility, security headers, performance, DNS/TLS, and more — without leaving
the editor.

## Commands

- **Audityxe: Audit a URL** — fast crawl (homepage sample)
- **Audityxe: Audit a URL (Deep crawl)** — real multi-hop crawl, up to 25 pages

Results print to the "Audityxe" output panel.

## How it works

This extension is a thin wrapper around [`audityxe-cli`](../cli) — it runs
`npx audityxe-cli <url> --json` in the background and formats the result. Same requirements as the
CLI: Node.js and npm on `PATH`. No account, no API key, no rate limit — it runs the audit engine on
your own machine.

## Development

```bash
cd vscode-extension
npm install
npm run build
```

Then press `F5` in VS Code (with this folder open) to launch an Extension Development Host and try
it out.

### Publishing (not done yet)

This extension is not yet published to the VS Code Marketplace. To publish it under your own
publisher account:

```bash
npm install --global @vscode/vsce
vsce package   # produces a .vsix you can install locally to test
vsce publish   # requires a Marketplace publisher account + Personal Access Token
```

See [Microsoft's publishing docs](https://code.visualstudio.com/api/working-with-extensions/publishing-extension)
for the account setup — that part needs your own Microsoft/Azure DevOps account, not something this
repo can do on your behalf.
