# Changelog

The CLI (`audityxe-cli`) shares its audit engine byte-for-byte with the web app at
[audityxe.vercel.app](https://audityxe.vercel.app) — `src/engine/*.ts` here is kept in sync with
the web app's `lib/*.ts` on every release, so the full, detailed changelog (every module added,
every scoring change, every fix) lives in one place: the web app's in-product changelog
(`/changelog` on the site, sourced from `lib/changelog-data.ts`). This file only tracks the CLI
package's own version number against that shared history.

## 1.2.0

Engine parity with web app release 3.13.0. Highlights relevant to CLI/CI usage:

- New audit modules: **CRO** (Conversion Rate Optimization) and **TTFB** (Time to First Byte,
  graded against Google's official Core Web Vitals thresholds) now run and are scored like every
  other module — both previously had no dedicated module output.
- The AI-search module was relabeled and deepened to explicitly cover AIO / AEO / GEO / LLMO / AI
  SEO / LLM SEO / AAO / ACO, with two new checks: an Organization/entity-schema authorship signal,
  and an agent-readiness check (ARIA landmarks, form-input labeling) for autonomous browsing
  agents specifically, not just chat answer-engines.
- Scoring made stricter across the board — see the web app's Scoring model docs for the full
  rationale. `--json` output and exit codes reflect the same stricter thresholds.
- `scoringMethodology` field in JSON output rewritten to describe the stricter rules.

## 1.1.3 and earlier

See the web app's `/changelog` page for full history prior to the CLI adopting this dedicated
changelog file.
