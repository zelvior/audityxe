# Session Changes — 2026-09-30

## 1. Cloudflare Worker Deployment

### What was done
- Cloned `https://github.com/zelvior/audityxe.git`
- Deployed the `audityxe-cleanup-worker` Cloudflare Worker

### Files involved
- `cloudflare-worker/wrangler.toml` — Worker configuration
- `cloudflare-worker/src/index.ts` — Worker entry point
- `cloudflare-worker/src/google-auth.ts` — Google OAuth2 token minting
- `cloudflare-worker/src/firestore.ts` — Firestore REST client
- `cloudflare-worker/src/identity-toolkit.ts` — Identity Toolkit client

### Deployment details
- **Worker name:** `audityxe-cleanup-worker`
- **URL:** `https://audityxe-cleanup-worker.faizudemon.workers.dev`
- **Schedule:** Every 4 hours (`0 */4 * * *`)
- **Health endpoint:** `GET /health` → `{"ok":true}`
- **Manual trigger:** `POST /run` with `x-cleanup-secret` header

### Secrets set
| Secret | Purpose |
|---|---|
| `FIREBASE_PROJECT_ID` | Firebase project ID |
| `GOOGLE_CLIENT_EMAIL` | Service account email |
| `GOOGLE_PRIVATE_KEY` | Service account private key (PEM) |
| `CLEANUP_SHARED_SECRET` | Protects manual POST /run endpoint |

---

## 2. Removed "1 Audit Without Signup" Feature

### What was done
Completely removed the anonymous audit feature that allowed unauthenticated users to run 1 free audit per IP per day.

### Files modified

#### Core logic removed
| File | Change |
|---|---|
| `lib/plans.ts` | Removed `ANON_DAILY_LIMIT` constant |
| `lib/rate-limit.ts` | Removed `checkAndIncrementAnonymousUsage()` and `AnonUsageResult` interface |
| `lib/audit-request.ts` | Removed anonymous path; unauthenticated requests now get `401`. Changed `identity` from nullable to required. Removed imports of `checkAndIncrementAnonymousUsage`, `ANON_DAILY_LIMIT`, `getClientIp`, `hashIp` |
| `lib/ip.ts` | Removed entire file content (`getClientIp` and `hashIp` — no longer used anywhere) |
| `app/page.tsx` | Removed `null` token path for signed-out visitors; now shows "Please sign in to run an audit" error |

#### Docs/marketing updated
| File | Change |
|---|---|
| `app/faq/page.tsx` | Removed "no signup required for your first audit" |
| `components/HomepageSeoContent.tsx` | Removed "no signup required for your first check" |
| `public/llms.txt` | Same FAQ text update |
| `public/llms-full.txt` | Same FAQ text update |
| `openapi.yaml` | Changed "Neither header → anonymous visitor" to "rejected with 401" |
| `app/api-docs/page.tsx` | Same auth docs update |
| `README.md` | Removed `IP_HASH_SALT` from env var table, updated API key section, updated rate-limiting reference |
| `.env.example` | Removed `IP_HASH_SALT` section |
| `lib/api-keys.ts` | Updated comment about anonymous access |
| `lib/push.ts` | Updated comment about anonymous visitors |
| `lib/types.ts` | Updated comment referencing "Free/anonymous" |
| `components/Hero.tsx` | Replaced "1 free audit, no account needed" with "Sign up free to run an audit" |
| `components/SampleReportView.tsx` | Corrected free plan daily audit count (2, not 3) |
| `lib/user-moderation.ts` | Removed `anon_usage` collection reference |

### Behavior after change
- Unauthenticated requests to `/api/audit` or `/api/audit/start` return `401` with message "Authentication required. Sign in to run an audit."
- The homepage shows "Please sign in to run an audit" error when a signed-out user tries to analyze
- All marketing text now directs users to sign up

---

## 3. Fixed Firestore `undefined` Value Error

### What was done
Fixed the error: `Value for argument "dataOrField" is not a valid Firestore value. Cannot use "undefined" as a Firestore value (found in field "result.modules.0.findings.0.evidence")`

### Root cause
`AuditModuleFinding.evidence` and `.confidence` are optional fields. When omitted, the helper functions (`pass`, `warn`, `fail`, `unknown`) returned `undefined` for these fields. Firestore rejects `undefined` as a field value.

### Files modified

#### `lib/audit-modules.ts`
Helper functions now convert `undefined` to `null`:
```typescript
function pass(label: string, detail: string, evidence?: string, confidence?: Confidence): AuditModuleFinding {
  return { label, status: "pass", detail, evidence: evidence ?? null, confidence: confidence ?? null };
}
function warn(label: string, detail: string, evidence?: string, severity: Severity = "medium", confidence?: Confidence): AuditModuleFinding {
  return { label, status: "warn", detail, evidence: evidence ?? null, severity, confidence: confidence ?? null };
}
function fail(label: string, detail: string, evidence?: string, severity: Severity = "high", confidence?: Confidence): AuditModuleFinding {
  return { label, status: "fail", detail, evidence: evidence ?? null, severity, confidence: confidence ?? null };
}
function unknown(label: string, detail: string, evidence?: string): AuditModuleFinding {
  return { label, status: "warn", detail, evidence: evidence ?? null, severity: "low", confidence: "low", unverifiable: true };
}
```

#### `lib/audit-jobs.ts`
Added `stripUndefined()` recursive sanitizer that strips any remaining `undefined` values from the result object before writing to Firestore:
```typescript
function stripUndefined<T>(value: T): T {
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) {
    return value.map((item) => stripUndefined(item)) as unknown as T;
  }
  if (typeof value === "object") {
    const result: record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      if (val !== undefined) {
        result[key] = stripUndefined(val);
      }
    }
    return result as T;
  }
  return value;
}
```

#### `lib/types.ts`
Updated `AuditModuleFinding` type to reflect that `evidence` and `confidence` can be `null`:
```typescript
evidence?: string | null;
confidence?: "high" | "medium" | "low" | null;
```

---

## 4. Fixed OpenGraph Image Error

### What was done
Fixed the build error: `TypeError: Invalid URL at new URL (node:internal/url:899:25)` in `@vercel/og`

### Root cause
Next.js 14.2.35's bundled `@vercel/og` has a known bug that occurs at module load time during static generation. The error happens inside `next/dist/compiled/@vercel/og/index.node.js` when it tries to resolve a URL.

### Fix applied
Replaced the dynamic OG image route with a static one:

#### Deleted
- `app/opengraph-image.tsx` — Dynamic OG image generator (used `next/og`)

#### Created
- `public/opengraph.png` — Static OG image (1200×630, brand gradient background)

#### Modified
- `app/layout.tsx` — Updated `openGraph` metadata to reference the static image:
```typescript
openGraph: {
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  type: "website",
  url: SITE_URL,
  siteName: SITE_NAME,
  images: [
    {
      url: "/opengraph.png",
      width: 1200,
      height: 630,
      alt: SITE_TITLE,
    },
  ],
},
```

#### Added dependency
- `@vercel/og` installed as a direct dependency (though the static image approach avoids using it)

---

## 5. Added Proper Onboarding Pages

### What was done
Created 3 dedicated onboarding pages and connected them to the existing UI.

### Files created

#### `app/onboarding/welcome/page.tsx`
- Welcome page with 6 feature cards (Instant Results, Evidence-Based, 6 Categories, Real Scores, Exact Fixes, For Any URL)
- Links to `/onboarding/features` and `/login`

#### `app/onboarding/features/page.tsx`
- Detailed breakdown of all 6 audit categories:
  - SEO Audit (6 checks)
  - Performance (6 checks)
  - Accessibility (6 checks)
  - Security (6 checks)
  - UX & CRO (6 checks)
  - Technical (6 checks)
- Links to `/onboarding/get-started` and `/methodology`

#### `app/onboarding/get-started/page.tsx`
- 6-step guide with links:
  1. Run Your First Audit → `/`
  2. Read Your Report → `/sample-report`
  3. Share Your Score → `/badge`
  4. Get Notified → `/settings`
  5. Export Results → `/pricing`
  6. Use the API → `/api-docs`
- Final CTA section with sign-up button

### Files modified

#### `components/Onboarding.tsx`
- Added "View full guide" link to `/onboarding/welcome` at the bottom of the onboarding card

#### `components/Header.tsx`
- Added "Guide" link to the desktop navigation (points to `/onboarding/welcome`)

#### `app/sitemap.ts`
- Added 3 new routes:
  - `/onboarding/welcome` (priority 0.7)
  - `/onboarding/features` (priority 0.6)
  - `/onboarding/get-started` (priority 0.6)

---

## Build Status

All changes verified with `npm run build`:
- **Compiled successfully** — no TypeScript errors
- **Linting and type checking passed**
- **All 55 pages generate successfully**
- **Zero build errors**

## Git History

| Commit | Description |
|---|---|
| `ebe1e59` | Remove anonymous audit feature and fix Firestore undefined value error |
| `c525e40` | Remove remaining anonymous audit UI references |
| `fa4bbc7` | Fix opengraph-image error and add proper onboarding pages |
