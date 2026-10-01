import { NextRequest, NextResponse } from "next/server";
import { requireAuth, AuthError } from "./auth-server";
import {
  ensureUserDoc,
  checkAndIncrementUsage,
  checkAndIncrementWeeklyFeatureUsage,
} from "./rate-limit";
import { PLANS } from "./plans";
import { isTrustedOrigin, looksLikeBot } from "./security";
import { getByokCredentials, getPsiByokCredentials, getCruxByokCredentials } from "./user-settings";
import { resolveApiKeyIdentity, ApiKeyError } from "./api-keys";

const MAX_BODY_BYTES = 10 * 1024; // this endpoint only ever needs two short URLs
const MAX_URL_LENGTH = 2048;

export interface ResolvedAuditRequest {
  url: string;
  competitorUrl?: string;
  crawlMode: "fast" | "deep" | "max" | "ultra";
  includePromo: boolean;
  promoLockReason?: "plan" | "byok_missing";
  byok?: { apiKey: string; baseUrl?: string | null; model?: string | null };
  includePageSpeed: boolean;
  pageSpeedLockReason?: "not_confirmed" | "weekly_limit" | "byok_required";
  psiByokKey: string | null;
  cruxByokKey: string | null;
  consumedSharedPsiQuota: boolean;
  identity: { uid: string; email: string | null };
  plan: string;
  used: number;
  limit: number;
  remaining: number;
}

export type AuditRequestResolution = { ok: true; data: ResolvedAuditRequest } | { ok: false; response: NextResponse };

/**
 * Everything that has to happen before an audit can actually run — origin
 * checks, auth, quota, and BYOK-key lookups — factored out of
 * app/api/audit/route.ts (the synchronous, quick-audit path) so
 * app/api/audit/start/route.ts (the background-job path used for the
 * "notify me when it's ready" flow) can share the exact same rules
 * instead of a second, inevitably-drifting copy of them.
 */
export async function resolveAuditRequest(req: NextRequest): Promise<AuditRequestResolution> {
  const fail = (body: Record<string, unknown>, status: number): AuditRequestResolution => ({
    ok: false,
    response: NextResponse.json(body, { status }),
  });

  const apiKeyHeader = req.headers.get("x-api-key");

  if (!apiKeyHeader) {
    if (!isTrustedOrigin(req)) return fail({ error: "Cross-site request rejected." }, 403);
    if (looksLikeBot(req)) return fail({ error: "Automated requests are not permitted on this endpoint." }, 403);
  }

  const contentLength = Number(req.headers.get("content-length") || 0);
  if (contentLength > MAX_BODY_BYTES) return fail({ error: "Request body is too large." }, 413);

  const hasAuthHeader = !!(req.headers.get("authorization") || req.headers.get("Authorization"));

  let identity: { uid: string; email: string | null };
  if (apiKeyHeader) {
    try {
      identity = await resolveApiKeyIdentity(apiKeyHeader);
    } catch (err) {
      if (err instanceof ApiKeyError) return fail({ error: err.message, code: "INVALID_API_KEY" }, 401);
      return fail({ error: "API key validation failed." }, 401);
    }
  } else if (hasAuthHeader) {
    try {
      identity = await requireAuth(req, { requireEmailVerified: true });
    } catch (err) {
      if (err instanceof AuthError) return fail({ error: err.message, code: err.code }, err.status);
      return fail({ error: "Authentication failed." }, 401);
    }
  } else {
    return fail({ error: "Authentication required. Sign in to run an audit." }, 401);
  }

  let body: { url?: string; competitorUrl?: string; confirmPageSpeed?: boolean; crawlMode?: string };
  try {
    body = await req.json();
  } catch {
    return fail({ error: "Invalid request body." }, 400);
  }

  const url = (body.url || "").trim();
  if (!url) return fail({ error: "A URL is required." }, 400);
  if (url.length > MAX_URL_LENGTH) return fail({ error: "That URL is too long." }, 400);
  if (typeof body.competitorUrl === "string" && body.competitorUrl.length > MAX_URL_LENGTH) {
    return fail({ error: "The competitor URL is too long." }, 400);
  }

  if (!apiKeyHeader) {
    try {
      await ensureUserDoc(identity as Awaited<ReturnType<typeof requireAuth>>);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to set up your account.";
      return fail({ error: message }, 500);
    }
  }

  let used: number, limit: number, remaining: number, plan: string, competitorAllowed: boolean;

  let usage;
  try {
    usage = await checkAndIncrementUsage(identity.uid);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to check your usage limit.";
    return fail({ error: message }, 500);
  }
  if (!usage.allowed) {
    return fail(
      {
        error: `You've used all ${usage.limit} audits on your ${PLANS[usage.plan].name} plan today. It resets at midnight UTC, or upgrade for a higher limit.`,
        code: "RATE_LIMITED",
        plan: usage.plan,
        limit: usage.limit,
      },
      429
    );
  }
  ({ used, limit, remaining, plan } = usage);
  competitorAllowed = PLANS[usage.plan].competitorAudits;

  const competitorUrl = competitorAllowed ? body.competitorUrl : undefined;
  const crawlMode: "fast" | "deep" | "max" | "ultra" = body.crawlMode === "deep" ? "deep" : body.crawlMode === "max" ? "max" : body.crawlMode === "ultra" ? "ultra" : "fast";

  let includePromo = false;
  let promoLockReason: "plan" | "byok_missing" | undefined;
  let byok: { apiKey: string; baseUrl?: string | null; model?: string | null } | undefined;

  if (plan === "pro") {
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

  let includePageSpeed = false;
  let pageSpeedLockReason: "not_confirmed" | "weekly_limit" | "byok_required" | undefined;
  let psiByokKey: string | null = null;
  let consumedSharedPsiQuota = false;
  if (body.confirmPageSpeed) {
    psiByokKey = await getPsiByokCredentials(identity.uid);
    if (psiByokKey) {
      includePageSpeed = true;
    } else if (plan === "pro") {
      const psiUsage = await checkAndIncrementWeeklyFeatureUsage(identity.uid, "pagespeed", 1);
      includePageSpeed = psiUsage.allowed;
      consumedSharedPsiQuota = psiUsage.allowed;
      if (!psiUsage.allowed) pageSpeedLockReason = "weekly_limit";
    } else {
      pageSpeedLockReason = "byok_required";
    }
  } else {
    pageSpeedLockReason = "not_confirmed";
  }
  const cruxByokKey = await getCruxByokCredentials(identity.uid);

  return {
    ok: true,
    data: {
      url,
      competitorUrl,
      crawlMode,
      includePromo,
      promoLockReason,
      byok,
      includePageSpeed,
      pageSpeedLockReason,
      psiByokKey,
      cruxByokKey,
      consumedSharedPsiQuota,
      identity,
      plan,
      used,
      limit,
      remaining,
    },
  };
}
