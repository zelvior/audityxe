# Audityxe cleanup Worker

A small, scheduled Cloudflare Worker that replaces the two Vercel Cron routes
(`/api/cron/cleanup-jobs`, `/api/cron/cleanup-unverified`) for one concrete reason: **Vercel's
Hobby (free) plan caps cron triggers at once per day**, no matter what schedule you configure —
so the `cleanup-jobs` route's intended "every 4 hours" schedule was silently only ever going to
run once a day on the free tier. Cloudflare Workers' free tier has no such limit — this runs
every 4 hours for real, and the Worker itself, its Cron Trigger, and the ~5-10 Firestore/Identity
Toolkit calls it makes per run all comfortably fit inside Cloudflare's free tier (100,000
requests/day; a cron invocation counts as one).

**This does not replace or duplicate any audit-engine logic** — it only deletes trash data:

| Task | Collection / target | TTL | Mirrors |
|---|---|---|---|
| Expired background-audit-job docs | Firestore `auditJobs` | 24h | `lib/audit-jobs.ts`'s `JOB_TTL_MS` |
| Orphaned push-notification subscriptions | Firestore `auditJobPushSubs` | 48h | Safety net — `lib/push.ts` already deletes each one immediately after use; this only catches ones orphaned by a job that never reached that code path |
| Unverified Firebase Auth accounts | Firebase Auth (Identity Toolkit) | 7 days | The old `app/api/cron/cleanup-unverified/route.ts` |

The equivalent Next.js API routes are **left in place, unscheduled** (removed from
`vercel.json`'s `crons` array) — they still work if you want to trigger a cleanup manually or run
this project without ever touching Cloudflare, they're just no longer relied on for the
recurring schedule.

## Why a Worker instead of just "keep the Vercel routes but call them more often somehow"

Cloudflare Workers were chosen specifically because:
- **Free tier cron with no frequency cap**, unlike Vercel Hobby.
- **No cold-start/idle-sleep concept to work around.** This is *not* a "ping it to keep it warm"
  setup — a Worker with a Cron Trigger runs on Cloudflare's own schedule regardless of whether
  anything ever calls it over HTTP. The `GET /health` endpoint below exists purely so an uptime
  monitor can *alert you* if the Worker or its credentials ever break, not to keep anything alive.
- **Cheap to run at real scale.** Even at a startup's "millions of users" scale, this Worker's own
  cost stays near-zero — it does a handful of paginated Firestore/Identity Toolkit calls every few
  hours, not per-user work. The thing that scales with user count is Firestore/Firebase Auth usage
  itself, which this Worker doesn't add to beyond its periodic cleanup queries.

## Setup

### 1. Create a dedicated service account

Don't reuse the same Firebase Admin SDK service account key the Next.js app uses for
`FIREBASE_CLIENT_EMAIL`/`FIREBASE_PRIVATE_KEY` if you'd rather keep blast radius smaller — a
second, narrowly-scoped service account is cleaner, though reusing the existing one also works
fine since it already has the necessary Firestore + Firebase Auth admin permissions.

1. [Google Cloud Console → IAM & Admin → Service Accounts](https://console.cloud.google.com/iam-admin/serviceaccounts) → **Create Service Account** (or reuse the existing Firebase Admin SDK one).
2. Grant it the **Cloud Datastore User** (or **Firebase Admin**) role and the **Firebase Authentication Admin** role.
3. **Keys** tab → **Add Key** → **Create new key** → JSON. Download it.
4. From the downloaded JSON, you need three values: `project_id`, `client_email`, `private_key`.

### 2. Install and authenticate Wrangler

```bash
cd cloudflare-worker
npm install
npx wrangler login   # opens a browser to authorize Wrangler against your Cloudflare account
```

### 3. Set secrets (never put these in `wrangler.toml` or commit them)

```bash
npx wrangler secret put FIREBASE_PROJECT_ID
npx wrangler secret put GOOGLE_CLIENT_EMAIL
npx wrangler secret put GOOGLE_PRIVATE_KEY      # paste the full PEM, literal \n or real newlines both work
npx wrangler secret put CLEANUP_SHARED_SECRET   # any long random string — protects the manual POST /run endpoint
```

For local development, copy these into a `.dev.vars` file instead (already gitignored):

```
FIREBASE_PROJECT_ID=your-project-id
GOOGLE_CLIENT_EMAIL=your-sa@your-project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
CLEANUP_SHARED_SECRET=some-long-random-string
```

### 4. Deploy

```bash
npm run deploy
```

Wrangler prints the Worker's URL (`https://audityxe-cleanup-worker.<your-subdomain>.workers.dev`).
The Cron Trigger from `wrangler.toml` (`0 */4 * * *` — every 4 hours) is registered automatically
on deploy; no extra dashboard step needed.

### 5. Verify it actually works

```bash
curl https://audityxe-cleanup-worker.<your-subdomain>.workers.dev/health

curl -X POST https://audityxe-cleanup-worker.<your-subdomain>.workers.dev/run \
  -H "x-cleanup-secret: <your CLEANUP_SHARED_SECRET>"
```

The `/run` response reports exactly what each of the three tasks did (or which one failed and
why) — check this after your first deploy rather than waiting up to 4 hours for the first
scheduled run.

### 6. (Optional) Set up UptimeRobot monitoring

This step is monitoring/alerting only — see "Why a Worker" above for why it isn't required for
the Worker to actually function.

1. [uptimerobot.com](https://uptimerobot.com) → **Add New Monitor** → **HTTP(s)**.
2. URL: `https://audityxe-cleanup-worker.<your-subdomain>.workers.dev/health`.
3. Interval: 5 minutes (free plan default) is plenty for a "tell me if this ever breaks" check.
4. Add an alert contact (email/SMS/etc.) so a broken Worker actually reaches you, not just a
   dashboard nobody's looking at.

## Local development

```bash
npm run dev        # wrangler dev — runs the Worker locally, reads .dev.vars
npm run typecheck   # tsc --noEmit
npm run tail        # streams live logs from the deployed Worker (useful after a scheduled run)
```

## Files

- `src/index.ts` — the Worker's `fetch()` (HTTP: `/health`, `/run`) and `scheduled()` (Cron
  Trigger) entry points, and the shared `runCleanup()` that both call.
- `src/google-auth.ts` — mints a Google OAuth2 access token from the service account, entirely
  via the Web Crypto API (RS256 JWT signing) — Workers can't use `firebase-admin` or
  `googleapis`, both of which assume a Node runtime.
- `src/firestore.ts` — minimal Firestore REST client (structured query + batch delete) — just the
  two operations this Worker needs, not a general-purpose SDK.
- `src/identity-toolkit.ts` — minimal Identity Toolkit (Firebase Auth's REST surface) client —
  list users with pagination, delete a user.
