# Audityxe

Instant AI site audit & viral promo generator.

## Setup

```bash
npm install
cp .env.example .env.local   # then fill in GEMINI_API_KEY
npm run dev
```

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

### Failover behavior

Any `GEMINI_API_KEY*` variable accepts a comma-separated list of keys.
For each task, keys are tried in order: on a `429`/`503`/auth error/
timeout/malformed response, the next key is tried automatically. If
every key for a task fails, or none is configured, that task falls back
to the heuristic generator in `lib/analyze.ts` — all three tasks fail
over independently, so a broken `BANNER` key never affects `VERDICT` or
`PROMO` output, and the banner still renders using a deterministic
designed fallback (not a blank/placeholder banner).

Category scores, fixes, and DOM analysis are always computed live from
the fetched page and never require Gemini. The scoring engine inspects
title/meta tags, heading hierarchy and order, image alt-text coverage,
responsive viewport config, ARIA landmarks, canonical/OG/Twitter-card
tags, structured data (JSON-LD), robots directives, HTTPS, form/field
counts, above-the-fold CTA presence, and more — see `lib/analyze.ts`
for the full signal list.
