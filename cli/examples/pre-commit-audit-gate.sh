#!/usr/bin/env bash
# Example audit gate — copy this into your own project (e.g. as
# .husky/pre-push, a pre-deploy step in your CI, or a Vercel "Ignored
# Build Step") and adjust URL/MIN_SCORE for your site.
#
# Usage as a git hook (with husky, https://typicode.github.io/husky/):
#   npx husky add .husky/pre-push "bash scripts/audit-gate.sh"
#
# Usage as a plain CI step (any CI, not just GitHub Actions — for
# GitHub Actions specifically, prefer the dedicated action at
# https://github.com/zelvior/audityxe/blob/main/action.yml instead,
# which also handles PR comments):
#   - run: bash scripts/audit-gate.sh
#
# Requires Node.js + npm on PATH. Runs entirely locally/on your CI
# runner — no account, no API key, no rate limit.

set -euo pipefail

URL="${AUDIT_URL:-https://example.com}"
MIN_SCORE="${AUDIT_MIN_SCORE:-70}"

echo "Running Audityxe audit gate: $URL (min score: $MIN_SCORE)"

if ! npx --yes audityxe-cli@latest "$URL" --min-score "$MIN_SCORE"; then
  echo ""
  echo "❌ Audit gate failed — $URL scored below $MIN_SCORE/100."
  echo "   Run 'npx audityxe-cli $URL' locally for the full report."
  exit 1
fi

echo "✅ Audit gate passed."
