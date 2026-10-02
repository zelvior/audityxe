# Security Policy

## Reporting a vulnerability

If you find a security issue in Audityxe — in the hosted web app, the CLI, the VS Code
extension, or the GitHub Action — please report it **privately** rather than opening a public
GitHub issue or discussing it publicly first:

- Email **`zelvior@proton.me`** with a description of the issue, steps to reproduce, and its
  potential impact. Include "SECURITY" in the subject line so it isn't missed among general
  contact/support email.
- If you'd rather not email, the Contact page on the site
  ([audityxe.xyz](https://audityxe.xyz)) also reaches the same inbox.

Please give a reasonable amount of time to investigate and address a report before any public
disclosure. This is a small, largely self-funded project (see the License and Sponsor pages) —
response times are best-effort, not covered by an SLA, but security reports are treated as a
priority over feature work.

## Supported versions

Only the **latest** deployed version of the web app, and the **latest published** versions of
`audityxe-cli` (npm) and the VS Code extension, are supported for security fixes. There are no
older maintained release branches — see `CHANGELOG.md` for what's currently shipped.

## Scope

In scope:

- The web app at `audityxe.xyz` and its API routes (`app/api/**`)
- `audityxe-cli` (the npm package and its GitHub Action usage)
- The VS Code extension
- This repository's source code generally (`lib/`, `components/`, `cli/`, `vscode-extension/`)

Out of scope (please don't spend your time on these — they're either known/accepted, or belong
to someone else's security program, not this project's):

- Third-party sites this tool is used to *audit* — Audityxe reports on other sites' security
  posture, it doesn't control it. Report those issues to the site owner, not to us.
- Findings that require a compromised device, browser, or account the reporter already fully
  controls (self-XSS, physically-present-attacker scenarios, etc.).
- Missing security headers or best-practice suggestions *about Audityxe itself* — please use
  the Contact page or a GitHub issue for those, since they aren't exploitable vulnerabilities;
  this file is for reportable, exploitable security issues.
- Denial-of-service via sheer volume of legitimate-looking requests — rate limiting (see
  `lib/rate-limit.ts`) is a cost/abuse control, not a claim of DoS-proofing.
- Vulnerabilities only reachable by an authenticated Pro-plan API-key holder attacking their
  own account/data.

## What happens after a report

1. Acknowledgement, typically within a few days.
2. Investigation and, if confirmed, a fix — timeline depends on severity.
3. Credit, if you'd like it, in `CHANGELOG.md`/the in-app changelog once the fix ships (or none,
   if you'd rather stay anonymous — your call).

Thank you for reporting responsibly rather than exploiting or publicly disclosing first — it's
what keeps a small, independent project like this safe to keep building.
