import { NextRequest, NextResponse } from "next/server";
import { runAudit } from "@/lib/analyze";
import { requireAuth, AuthError } from "@/lib/auth-server";
import { ensureUserDoc, checkAndIncrementUsage } from "@/lib/rate-limit";
import { PLANS } from "@/lib/plans";
import { isTrustedOrigin, looksLikeBot } from "@/lib/security";

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

  // Every audit requires a signed-in, email-verified account — no
  // anonymous usage, and no unverified accounts running real audits.
  let identity;
  try {
    identity = await requireAuth(req, { requireEmailVerified: true });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.status });
    }
    return NextResponse.json({ error: "Authentication failed." }, { status: 401 });
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

  try {
    await ensureUserDoc(identity);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to set up your account.";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  // Atomically check + increment the account's daily quota before doing
  // any expensive work (live fetch + AI calls).
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

  const competitorUrl = PLANS[usage.plan].competitorAudits ? body.competitorUrl : undefined;

  try {
    const result = await runAudit(url, competitorUrl);

    return NextResponse.json({
      ...result,
      _usage: { used: usage.used, limit: usage.limit, remaining: usage.remaining, plan: usage.plan },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch and analyze the site.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
