# Changelog

This extension is a thin wrapper that shells out to `npx audityxe-cli@latest` for every command
(see `src/extension.ts`) — it always runs whatever the latest published CLI version is, regardless
of this extension's own version number. That means every CLI engine change (new audit modules,
scoring changes, new checks) reaches this extension automatically, with no extension update
required. This file tracks changes to the *extension* itself (commands, UI, packaging) plus the
CLI version it was tested against at time of release.

## 1.3.1

- Repackaged and version-bumped alongside `audityxe-cli@1.3.1`.
- No changes to the extension's own commands or UI in this release.

## 1.3.0

- Repackaged and version-bumped alongside `audityxe-cli@1.3.0` (max/ultra crawl modes, full
  timeout matrix, `cruxByokKey` option, `crawlMode` in JSON output — see `cli/CHANGELOG.md`).
- No changes to the extension's own commands or UI in this release.

## 1.2.1

- Repackaged and version-bumped alongside `audityxe-cli@1.2.1` (deepened, more accurate
  Content-Security-Policy and HSTS-preload-eligibility checks — see `cli/CHANGELOG.md`).
- No changes to the extension's own commands or UI in this release.

## 1.2.0

- Repackaged and version-bumped alongside `audityxe-cli@1.2.0` (new CRO and TTFB modules, deepened
  AI-search module covering AIO/AEO/GEO/LLMO/AI SEO/LLM SEO/AAO/ACO, stricter scoring — see
  `cli/CHANGELOG.md` for the full engine changelog this extension inherits automatically).
- No changes to the extension's own commands or UI in this release — the version bump keeps the
  Marketplace listing's tested-CLI-version note accurate.

## 1.1.3 and earlier

No dedicated changelog was kept prior to this release.
