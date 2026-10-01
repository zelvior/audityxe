import { NextRequest, NextResponse } from "next/server";
import { pruneExpired } from "@/lib/abuse/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Prunes expired abuse-engine documents (rate-limit counters, events,
 * trial counters, lapsed bans/strikes). Same CRON_SECRET protection as
 * /api/cron/cleanup-jobs. Not required if you set a Firestore TTL policy
 * on the `expireAt` field of abuse_rl / abuse_events / abuse_trial /
 * abuse_bans / abuse_strikes. */
export async function GET(req: NextRequest) {
  const expected = process.env.CRON_SECRET;
  if (!expected) return NextResponse.json({ error: "CRON_SECRET is not configured." }, { status: 500 });
  if (req.headers.get("authorization") !== `Bearer ${expected}`) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  try {
    return NextResponse.json({ ok: true, deleted: await pruneExpired() });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Cleanup failed." }, { status: 500 });
  }
}
