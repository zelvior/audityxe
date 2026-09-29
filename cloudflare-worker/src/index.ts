import { getGoogleAccessToken, ServiceAccount } from "./google-auth";
import { drainOlderThan } from "./firestore";
import { cleanupUnverifiedUsers } from "./identity-toolkit";

export interface Env {
  FIREBASE_PROJECT_ID: string;
  GOOGLE_CLIENT_EMAIL: string;
  /** PEM private key, literal `\n` newlines — same format as the
   * FIREBASE_PRIVATE_KEY secret already used by the Next.js app. */
  GOOGLE_PRIVATE_KEY: string;
  /** Shared secret required on the manual-trigger endpoint (POST /run)
   * — the scheduled() handler itself needs no auth, Cloudflare only
   * invokes it internally on the configured Cron Trigger. */
  CLEANUP_SHARED_SECRET: string;
}

const AUDIT_JOB_TTL_DAYS = 1; // matches lib/audit-jobs.ts's JOB_TTL_MS
const PUSH_SUB_TTL_DAYS = 2; // safety-net only — lib/push.ts already deletes each subscription immediately after sending (or attempting to send) its one-shot notification; this just catches any that were orphaned by a job that never reached that code path
const UNVERIFIED_USER_STALE_DAYS = 7; // matches the old Vercel cron's STALE_AFTER_DAYS

function isoDaysAgo(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

async function runCleanup(env: Env) {
  const sa: ServiceAccount = {
    projectId: env.FIREBASE_PROJECT_ID,
    clientEmail: env.GOOGLE_CLIENT_EMAIL,
    privateKey: env.GOOGLE_PRIVATE_KEY,
  };
  const accessToken = await getGoogleAccessToken(sa);
  const projectId = env.FIREBASE_PROJECT_ID;

  // Each of the three tasks is independent — one failing (e.g. a
  // transient Firestore/Identity Toolkit hiccup) must not prevent the
  // other two from running, and the response should say exactly which
  // task(s) failed rather than a single opaque 500 for the whole
  // invocation.
  const results: Record<string, { ok: boolean; detail: unknown }> = {};

  await Promise.allSettled([
    (async () => {
      try {
        const deleted = await drainOlderThan(projectId, accessToken, "auditJobs", "createdAt", isoDaysAgo(AUDIT_JOB_TTL_DAYS));
        results.auditJobs = { ok: true, detail: { deleted } };
      } catch (err) {
        results.auditJobs = { ok: false, detail: err instanceof Error ? err.message : String(err) };
      }
    })(),
    (async () => {
      try {
        const deleted = await drainOlderThan(projectId, accessToken, "auditJobPushSubs", "savedAt", isoDaysAgo(PUSH_SUB_TTL_DAYS));
        results.auditJobPushSubs = { ok: true, detail: { deleted } };
      } catch (err) {
        results.auditJobPushSubs = { ok: false, detail: err instanceof Error ? err.message : String(err) };
      }
    })(),
    (async () => {
      try {
        const stats = await cleanupUnverifiedUsers(projectId, accessToken, UNVERIFIED_USER_STALE_DAYS);
        results.unverifiedUsers = { ok: true, detail: stats };
      } catch (err) {
        results.unverifiedUsers = { ok: false, detail: err instanceof Error ? err.message : String(err) };
      }
    })(),
  ]);

  return { ranAt: new Date().toISOString(), results };
}

export default {
  /**
   * HTTP surface, for two purposes only:
   *  - GET /health — a cheap, unauthenticated 200 for UptimeRobot (or
   *    any monitor) to poll. This is NOT "keeping the Worker alive" —
   *    unlike a traditional always-on server, or even Vercel's
   *    serverless functions under sustained idle, a Cloudflare Worker
   *    with a Cron Trigger runs on its own schedule regardless of
   *    whether anything pings it; there's no idle-timeout/cold-sleep
   *    concept to defeat here. This endpoint exists purely so you (or
   *    UptimeRobot) get *alerted* if the Worker itself is ever down or
   *    misconfigured — monitoring, not life support.
   *  - POST /run (with the shared secret) — runs the same cleanup the
   *    Cron Trigger runs, on demand, for manual testing/verification
   *    without waiting for the schedule.
   * Anything else 404s.
   */
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === "GET" && url.pathname === "/health") {
      return Response.json({ ok: true, service: "audityxe-cleanup-worker", time: new Date().toISOString() });
    }

    if (request.method === "POST" && url.pathname === "/run") {
      const provided = request.headers.get("x-cleanup-secret");
      if (!env.CLEANUP_SHARED_SECRET || provided !== env.CLEANUP_SHARED_SECRET) {
        return Response.json({ error: "Unauthorized." }, { status: 401 });
      }
      try {
        const result = await runCleanup(env);
        return Response.json(result);
      } catch (err) {
        return Response.json({ error: err instanceof Error ? err.message : "Cleanup failed." }, { status: 500 });
      }
    }

    return Response.json({ error: "Not found. See GET /health or POST /run." }, { status: 404 });
  },

  /** Cloudflare invokes this directly on the Cron Trigger schedule
   * configured in wrangler.toml — no HTTP request, no external pinger,
   * involved at all. */
  async scheduled(_event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(
      runCleanup(env).then((result) => {
        // Cloudflare's dashboard captures console output from scheduled
        // invocations under Logs — this is the only "visibility" a cron
        // run has, since there's no HTTP response to return anything in.
        console.log(JSON.stringify(result));
      })
    );
  },
};
