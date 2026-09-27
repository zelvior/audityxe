import { NextRequest, NextResponse } from "next/server";
import { runAudit } from "@/lib/analyze";
import { refundWeeklyFeatureUsage } from "@/lib/rate-limit";
import { saveLastAuditScore } from "@/lib/badge-store";
import { logAuditRecord } from "@/lib/audit-log";
import { resolveAuditRequest } from "@/lib/audit-request";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 90;

export async function POST(req: NextRequest) {
  const resolved = await resolveAuditRequest(req);
  if (!resolved.ok) return resolved.response;
  const {
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
  } = resolved.data;

  try {
    const result = await runAudit(url, competitorUrl, { includePromo, promoLockReason, includePageSpeed, byok, psiByokKey, cruxByokKey, crawlMode });

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
