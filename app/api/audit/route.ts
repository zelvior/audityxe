import { NextRequest, NextResponse } from "next/server";
import { runAudit } from "@/lib/analyze";
import { requireAuth, AuthError } from "@/lib/auth-server";
import { ensureUserDoc, checkAndIncrementUsage, checkAndIncrementAnonymousUsage, checkAndIncrementWeeklyFeatureUsage, refundWeeklyFeatureUsage } from "@/lib/rate-limit";
import { PLANS, ANON_DAILY_LIMIT } from "@/lib/plans";
import { isTrustedOrigin, looksLikeBot } from "@/lib/security";
import { getClientIp, hashIp } from "@/lib/ip";
import { saveLastAuditScore } from "@/lib/badge-store";
import { getByokCredentials, getPsiByokCredentials } from "@/lib/user-settings";
import { logAuditRecord } from "@/lib/audit-log";
import { resolveApiKeyIdentity, ApiKeyError } from "@/lib/api-keys";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 90;

const MAX_BODY_BYTES = 10 * 1024; // this endpoint only ever needs two short URLs
const MAX_URL_LENGTH = 2048;

export async function POST(req: NextRequest) {
  // A Pro-linked API key is a stronger, revocable credential than the
  // Origin/UA heuristics below exist to approximate — a request that
  // carries a valid one skips both, same as the CLI's own trust model.
  // An invalid/revoked/downgraded key still fails closed at the
  // resolveApiKeyIdentity() call further down, so this isn't a bypass
  // of auth, only of the browser-CSRF heuristics that don't apply to a
  // keyed, non-browser caller.
  const apiKeyHeader = req.headers.get("x-api-key");

  if (!apiKeyHeader) {
    if (!isTrustedOrigin(req)) {
      return NextResponse.json({ error: "Cross-site request rejected." }, { status: 403 });
    }
    if (looksLikeBot(req)) {
      return NextResponse.json({ error: "Automated requests are not permitted on this endpoint." }, { status: 403 });
    }
  }

  // Reject oversized request bodies before even parsing JSON.
  const contentLength = Number(req.headers.get("content-length") || 0);
  if (contentLength > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "Request body is too large." }, { status: 413 });
  }

  // Every audit requires one of: a Pro-linked API key, a signed-in
  // email-verified account, or — for a visitor with no account at all —
  // a single free anonymous audit per IP per day (see
  // checkAndIncrementAnonymousUsage). No unverified account can run a
  // real audit either way.
  const hasAuthHeader = !!(req.headers.get("authorization") || req.headers.get("Authorization"));

  let identity: { uid: string; email: string | null } | null = null;
  if (apiKeyHeader) {
    try {
      identity = await resolveApiKeyIdentity(apiKeyHeader);
    } catch (err) {
      if (err instanceof ApiKeyError) {
        return NextResponse.json({ error: err.message, code: "INVALID_API_KEY" }, { status: 401 });
      }
      return NextResponse.json({ error: "API key validation failed." }, { status: 401 });
    }
  } else if (hasAuthHeader) {
    try {
      identity = await requireAuth(req, { requireEmailVerified: true });
    } catch (err) {
      if (err instanceof AuthError) {
        return NextResponse.json({ error: err.message, code: err.code }, { status: err.status });
      }
      return NextResponse.json({ error: "Authentication failed." }, { status: 401 });
    }
  }

  let body: { url?: string; competitorUrl?: string; confirmPageSpeed?: boolean; crawlMode?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const url = (body.url || "").trim();
  if (!url) {
    return NextResponse.json({ error: "A URL is required." }, { status: 400 });
  }
  if (url.length > MAX_URL_LENGTH) {
    return NextResponse.json({ error: "That URL is too long." }, { status: 400 });
  }
  if (typeof body.competitorUrl === "string" && body.competitorUrl.length > MAX_URL_LENGTH) {
    return NextResponse.json({ error: "The competitor URL is too long." }, { status: 400 });
  }

  // Skipped for API-key callers: an account only reaches Pro (a
  // prerequisite for owning a key at all — see resolveApiKeyIdentity)
  // by already existing, so there's nothing to bootstrap.
  if (identity && !apiKeyHeader) {
    try {
      await ensureUserDoc(identity as Awaited<ReturnType<typeof requireAuth>>);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to set up your account.";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }

  // Atomically check + increment the daily quota before doing any
  // expensive work (live fetch + AI calls) — account-based for signed-in
  // users, IP-based for anonymous visitors.
  let used: number, limit: number, remaining: number, plan: string, competitorAllowed: boolean;

  if (identity) {
    let usage;
    try {
      usage = await checkAndIncrementUsage(identity.uid);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to check your usage limit.";
      return NextResponse.json({ error: message }, { status: 500 });
    }

    if (!usage.allowed) {
      return NextResponse.json(
        {
          error: `You've used all ${usage.limit} audits on your ${PLANS[usage.plan].name} plan today. It resets at midnight UTC, or upgrade for a higher limit.`,
          code: "RATE_LIMITED",
          plan: usage.plan,
          limit: usage.limit,
        },
        { status: 429 }
      );
    }

    ({ used, limit, remaining, plan } = usage);
    competitorAllowed = PLANS[usage.plan].competitorAudits;
  } else {
    const ip = getClientIp(req);
    let anonUsage;
    try {
      anonUsage = await checkAndIncrementAnonymousUsage(hashIp(ip));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to check your usage limit.";
      return NextResponse.json({ error: message }, { status: 500 });
    }

    if (!anonUsage.allowed) {
      return NextResponse.json(
        {
          error: `You've used your ${ANON_DAILY_LIMIT} free audit for today without an account. Sign up free for more daily audits, or come back tomorrow.`,
          code: "RATE_LIMITED",
          plan: "anonymous",
          limit: anonUsage.limit,
        },
        { status: 429 }
      );
    }

    ({ used, limit, remaining } = anonUsage);
    plan = "anonymous";
    competitorAllowed = false;
  }

  const competitorUrl = competitorAllowed ? body.competitorUrl : undefined;
  // Deep crawl is opt-in and available to every plan (it trades speed
  // for coverage, not a paid capability) — anything other than the
  // literal string "deep" falls back to fast mode.
  const crawlMode: "fast" | "deep" = body.crawlMode === "deep" ? "deep" : "fast";

  // Promo copy/banner is Pro-only AND requires the user's own AI key
  // (BYOK) — Audityxe doesn't spend its own AI budget generating promo
  // content, only the audit's own verdict copy uses the shared keys.
  let includePromo = false;
  let promoLockReason: "plan" | "byok_missing" | undefined;
  let byok: { apiKey: string; baseUrl?: string | null; model?: string | null } | undefined;

  if (plan === "pro" && identity) {
    const creds = await getByokCredentials(identity.uid);
    if (creds) {
      includePromo = true;
      byok = creds;
    } else {
      promoLockReason = "byok_missing";
    }
  } else {
    promoLockReason = "plan";
  }

  // PageSpeed Insights runs a real Lighthouse pass and is comparatively
  // expensive, so it's opt-in per request (client must explicitly confirm).
  // On the shared site key it's capped to 1/week per person, to protect
  // Google's free quota for everyone. A person using their own PSI API key
  // pays for (and is limited by) their own Google Cloud quota, not ours —
  // so BYOK PSI has no weekly cap from Audityxe's side at all, rather than
  // just a higher one.
  let includePageSpeed = false;
  let pageSpeedLockReason: "not_confirmed" | "weekly_limit" | undefined;
  let psiByokKey: string | null = null;
  let consumedSharedPsiQuota = false;
  if (plan === "pro" && identity && body.confirmPageSpeed) {
    psiByokKey = await getPsiByokCredentials(identity.uid);
    if (psiByokKey) {
      includePageSpeed = true;
    } else {
      const psiUsage = await checkAndIncrementWeeklyFeatureUsage(identity.uid, "pagespeed", 1);
      includePageSpeed = psiUsage.allowed;
      consumedSharedPsiQuota = psiUsage.allowed;
      if (!psiUsage.allowed) pageSpeedLockReason = "weekly_limit";
    }
  } else if (plan === "pro" && !body.confirmPageSpeed) {
    pageSpeedLockReason = "not_confirmed";
  }

  try {
    const result = await runAudit(url, competitorUrl, { includePromo, promoLockReason, includePageSpeed, byok, psiByokKey, crawlMode });

    // The weekly shared-key slot was reserved before the PSI call ran
    // (has to be, to keep the check+increment atomic) — if that call
    // then failed for a reason that isn't the person's fault (a
    // transient PSI/network error, a Google-side outage), refund the
    // slot instead of letting a single hiccup burn their entire week's
    // one real-browser pass for zero benefit.
    if (consumedSharedPsiQuota && identity && result.pageSpeed?.attempted && !result.pageSpeed?.fetched) {
      await refundWeeklyFeatureUsage(identity.uid, "pagespeed");
    }

    // Powers the embeddable badge only (domain + score + date). Must be
    // awaited — see the comment on saveLastAuditScore for why an
    // un-awaited version of this silently never persisted on Vercel.
    // Errors are swallowed inside saveLastAuditScore itself, so this
    // never fails the actual audit response.
    await saveLastAuditScore(result.url, result.overall);

    // Fire-and-forget: powers Audit Management / audit history / the
    // dashboard's audit-volume charts. Never blocks or fails the audit
    // response itself.
    logAuditRecord({
      url: result.url,
      uid: identity?.uid || null,
      email: identity?.email || null,
      plan,
      score: result.overall,
      status: "success",
    }).catch(() => {});

    return NextResponse.json({
      ...result,
      _usage: { used, limit, remaining, plan },
      pageSpeedLockReason,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch and analyze the site.";
    logAuditRecord({
      url,
      uid: identity?.uid || null,
      email: identity?.email || null,
      plan,
      score: null,
      status: "failed",
      error: message,
    }).catch(() => {});
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
