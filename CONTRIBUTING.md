# Contributing to Audityxe

Issues and pull requests are welcome. This file covers the two most common contributions: general
fixes, and adding a new audit module (the most-requested kind of PR).

## General PRs

Before opening one:

```bash
npx tsc --noEmit && npx next lint && npm run build
```

All three must pass. If your change touches `lib/analyze.ts` or anything it imports, also check the
[`cli/`](./cli) package still builds — those files are copied into it (see "Adding a new audit
module" below for why that matters):

```bash
cd cli && npm run build
```

## Adding a new audit module

**Why this is a reviewed PR, not a live plugin system:** a plugin *loader* — third-party code
executing inside the audit engine at runtime — means arbitrary code execution against whatever URL
someone audits, which is a real security risk (SSRF, credential theft from the runtime environment,
supply-chain attacks via a malicious "plugin"). A reviewed PR gets the same result — new checks,
written by the community — without that risk, the same model ESLint, axe-core, and most mature
open-source scanners actually use at scale.

### The shape every module follows

Every audit module returns this (from `lib/types.ts`):

```ts
export interface AuditModule {
  id: string;                        // stable, kebab-case, never renamed once shipped
  label: string;                     // shown in the UI
  status: "good" | "warning" | "critical";
  score: number | null;              // null means "couldn't run at all", not "scored zero"
  summary: string;
  findings: AuditModuleFinding[];
}

export interface AuditModuleFinding {
  label: string;
  status: "pass" | "warn" | "fail";
  severity?: "critical" | "high" | "medium" | "low";  // defaults: fail→high, warn→medium
  detail: string;                    // plain-language explanation
  evidence: string;                  // the actual proof — real markup, a real header value,
                                      // a real count. Never a claim without something checkable.
}
```

**The one hard rule: every finding needs real evidence from the live page/response.** If a check
can't point at something concrete it actually observed — a header value, a count of elements, a
snippet of real markup, an HTTP status — it doesn't belong in the engine. No heuristics dressed up
as certainty, no guessing.

### Steps

1. **Write the check as a pure function** in its own file under `lib/` (e.g. `lib/my-check.ts`),
   following the pattern of an existing one close to what you're building — `lib/dns-security.ts`
   for a live network/DNS check, `lib/deep-signals.ts` for a static-HTML-parsing check,
   `lib/network-checks.ts` for something that needs its own fetch. It should take already-fetched
   data (HTML, headers, a hostname) as input wherever possible rather than fetching independently —
   keeps it testable and keeps the total number of requests against the audited site predictable.
2. **No new dependencies unless truly necessary**, and if one is, it needs to work from both
   `lib/` (the Next.js app) *and* `cli/src/engine/` (the standalone CLI) — check
   [`cli/README.md`](./cli/README.md) for why the CLI is a flat copy of the portable subset of
   `lib/`. A check that only works inside Next.js (imports `next/server`, Firebase, etc.) can't be
   part of the core engine — put framework-specific glue in the API route instead, not the check
   itself.
3. **Wire it into `lib/analyze.ts`**: add your check to the `Promise.all` in `runAuditInner`, add its
   result type to `ModuleContext` in `lib/audit-modules.ts`.
4. **Build the `AuditModule` from your check's output** in `lib/audit-modules.ts`'s
   `buildAuditModules` — score it, write the summary, map each real problem found to a
   `AuditModuleFinding` with real evidence attached.
5. **Copy your new file into `cli/src/engine/`** (same flat structure) so the CLI stays in sync —
   see [`cli/README.md`](./cli/README.md).
6. **Add a line to `CHANGELOG`** (`app/changelog/page.tsx`'s `CHANGELOG_ENTRIES`, imported from
   `lib/changelog-data.ts`) in plain, user-facing language — no file names, no internals, just what
   changed for someone using the product. See existing entries for the tone.
7. Run the check commands at the top of this file, then open the PR.

### What gets accepted

- Deterministic, evidence-backed, and doesn't meaningfully increase audit time (the whole audit has
  a shared timeout budget every module races against).
- Doesn't call a paid third-party API — the free/unlimited nature of the CLI and the low cost of the
  hosted service both depend on the engine itself never needing a paid key to run its core checks.
  (PageSpeed Insights is the one deliberate exception, and it's already opt-in/BYOK-friendly.)
- Scoped to something checkable from an already-fetched page/response, DNS, or TLS handshake — not
  something that requires rendering the page in a real browser (that's the headless-browser fallback
  on the [roadmap](https://audityxe.vercel.app/roadmap), not something to bolt onto individual PRs).

## Security

Found a vulnerability? Please **don't** open a public issue. Email
[zelvior@proton.me](mailto:zelvior@proton.me) directly.
