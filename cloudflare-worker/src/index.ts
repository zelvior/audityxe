import { getGoogleAccessToken, ServiceAccount } from "./google-auth";
import { drainOlderThanDetailed, getDocumentData, setDocumentData } from "./firestore";
import { cleanupUnverifiedUsers } from "./identity-toolkit";
// Shared with the Next.js app (admin API + fallback runner) by relative path, so
// the policy registry, validation and cutoff maths are literally the same code.
import { resolveRetention, cutoffFor, type StoredRetention, type RetentionRunSummary } from "../../lib/retention-core";

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

const MAX_PAGES_PER_POLICY = 20; // 20 x 500 = 10,000 docs per policy per run; a bigger backlog continues next run

/**
 * Policy-driven cleanup. WHAT gets deleted and HOW LONG data is kept is no
 * longer hard-coded here: it comes from the `config/retention` document the
 * admin panel edits (defaults from the shared registry apply when a policy
 * hasn't been customised). Each policy is independent — one failing never
 * stops the rest — and the outcome is written to `config/retention_status`
 * so the admin panel can show the last run.
 */
export async function runCleanup(env: Env, deps: { accessToken?: string } = {}): Promise<RetentionRunSummary> {
  const projectId = env.FIREBASE_PROJECT_ID;
  const accessToken =
    deps.accessToken ||
    (await getGoogleAccessToken({ projectId, clientEmail: env.GOOGLE_CLIENT_EMAIL, privateKey: env.GOOGLE_PRIVATE_KEY } satisfies ServiceAccount));

  let stored: StoredRetention | null = null;
  try {
    stored = (await getDocumentData(projectId, accessToken, "config/retention")) as StoredRetention | null;
  } catch (err) {
    // Can't read the admin's settings: fall back to the registry defaults rather than skipping cleanup.
    console.log("retention config unreadable, using defaults:", err instanceof Error ? err.message : err);
  }
  const cfg = resolveRetention(stored);
  const results: RetentionRunSummary["results"] = {};

  await Promise.allSettled([
    ...cfg.policies.map(async (p) => {
      if (!p.enabled) { results[p.id] = { ok: true, skipped: "disabled" }; return; }
      try {
        const cutoff = cutoffFor(p);
        const r = await drainOlderThanDetailed(projectId, accessToken, p.collection, p.field, cutoff, 500, MAX_PAGES_PER_POLICY, p.fieldType === "timestamp" ? "timestamp" : "string");
        results[p.id] = { ok: true, deleted: r.deleted, ...(r.capped ? { skipped: "more remain — will continue on the next run" } : {}) };
      } catch (err) {
        results[p.id] = { ok: false, error: (err instanceof Error ? err.message : String(err)).slice(0, 300) };
      }
    }),
    (async () => {
      if (!cfg.unverifiedUsers.enabled) { results.unverifiedUsers = { ok: true, skipped: "disabled" }; return; }
      try {
        const stats = await cleanupUnverifiedUsers(projectId, accessToken, cfg.unverifiedUsers.ttlDays);
        results.unverifiedUsers = { ok: true, deleted: stats.deleted };
      } catch (err) {
        results.unverifiedUsers = { ok: false, error: (err instanceof Error ? err.message : String(err)).slice(0, 300) };
      }
    })(),
  ]);

  const summary: RetentionRunSummary = { ranAt: new Date().toISOString(), source: "worker", results };
  try {
    await setDocumentData(projectId, accessToken, "config/retention_status", summary as unknown as Record<string, unknown>);
  } catch (err) {
    console.log("could not persist retention status:", err instanceof Error ? err.message : err);
  }
  return summary;
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
