import { NextRequest, NextResponse } from "next/server";
import { runAudit } from "@/lib/analyze";
import { requireAuth, AuthError } from "@/lib/auth-server";
import { ensureUserDoc, checkAndIncrementUsage, checkAndIncrementAnonymousUsage } from "@/lib/rate-limit";
import { PLANS, ANON_DAILY_LIMIT } from "@/lib/plans";
import { isTrustedOrigin, looksLikeBot } from "@/lib/security";
import { getClientIp, hashIp } from "@/lib/ip";
import { saveLastAuditScore } from "@/lib/badge-store";
import { getByokCredentials } from "@/lib/user-settings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_BODY_BYTES = 10 * 1024; // this endpoint only ever needs two short URLs
const MAX_URL_LENGTH = 2048;

export async function POST(req: NextRequest) {
  if (!isTrustedOrigin(req)) {
    return NextResponse.json({ error: "Cross-site request rejected." }, { status: 403 });
  }
  if (looksLikeBot(req)) {
    return NextResponse.json({ error: "Automated requests are not permitted on this endpoint." }, { status: 403 });
  }

  // Reject oversized request bodies before even parsing JSON.
  const contentLength = Number(req.headers.get("content-length") || 0);
  if (contentLength > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "Request body is too large." }, { status: 413 });
  }

  // Every audit requires either a signed-in, email-verified account, or —
  // for a visitor with no account at all — a single free anonymous audit
  // per IP per day (see checkAndIncrementAnonymousUsage). No unverified
  // account can run a real audit either way.
  const hasAuthHeader = !!(req.headers.get("authorization") || req.headers.get("Authorization"));

  let identity: Awaited<ReturnType<typeof requireAuth>> | null = null;
  if (hasAuthHeader) {
    try {
      identity = await requireAuth(req, { requireEmailVerified: true });
    } catch (err) {
      if (err instanceof AuthError) {
        return NextResponse.json({ error: err.message, code: err.code }, { status: err.status });
      }
      return NextResponse.json({ error: "Authentication failed." }, { status: 401 });
    }
  }

  let body: { url?: string; competitorUrl?: string };
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

  if (identity) {
    try {
      await ensureUserDoc(identity);
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

  const includePageSpeed = plan === "pro";

  try {
    const result = await runAudit(url, competitorUrl, { includePromo, promoLockReason, includePageSpeed, byok });

    // Fire-and-forget: powers the embeddable badge only (domain + score +
    // date). Never blocks or fails the actual audit response.
    saveLastAuditScore(result.url, result.overall);

    return NextResponse.json({
      ...result,
      _usage: { used, limit, remaining, plan },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch and analyze the site.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
