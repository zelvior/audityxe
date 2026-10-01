import { NextRequest, NextResponse } from "next/server";
import { verifyAndSubmitToShowcase, listShowcaseEntries, ShowcaseVerificationError } from "@/lib/showcase";
import { getLastAuditScore } from "@/lib/badge-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const entries = await listShowcaseEntries();
    // Attach each entry's last known audit score (from the same
    // zero-retention record the badge itself uses) purely for display —
    // never a second source of truth, and never blocks the listing if a
    // particular lookup fails.
    const withScores = await Promise.all(
      entries.map(async (e) => {
        const record = await getLastAuditScore(e.host).catch(() => null);
        return { ...e, overall: record?.overall ?? null };
      })
    );
    return NextResponse.json({ entries: withScores });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load showcase.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// Deliberately no auth required — the real gate is the ownership proof
// inside verifyAndSubmitToShowcase (a live badge link found on the
// submitted domain itself), not an account. A basic per-IP submission
// cap keeps this from being trivially spammed with fetch attempts even
// though each one is cheap and self-limiting (it can only ever add a
// domain that already links back to us).
const submissionsByIp = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS = 60 * 60 * 1000;
const MAX_PER_WINDOW = 5;

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = submissionsByIp.get(ip);
  if (!entry || entry.resetAt < now) {
    submissionsByIp.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  entry.count++;
  return entry.count > MAX_PER_WINDOW;
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (rateLimited(ip)) {
    return NextResponse.json({ error: "Too many submission attempts — try again later." }, { status: 429 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const host = typeof body?.host === "string" ? body.host : "";
    if (!host) {
      return NextResponse.json({ error: "A domain is required." }, { status: 400 });
    }
    const entry = await verifyAndSubmitToShowcase(host);
    return NextResponse.json({ entry });
  } catch (err) {
    if (err instanceof ShowcaseVerificationError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    const message = err instanceof Error ? err.message : "Something went wrong.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
