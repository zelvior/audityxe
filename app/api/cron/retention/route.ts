import { NextRequest, NextResponse } from "next/server";
import { runRetention } from "@/lib/retention";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** In-app retention run (same policies the admin edits and the Cloudflare Worker
 * applies). The Worker is the scheduled runner; this exists so retention can
 * also be triggered without it. Protected by CRON_SECRET like the other cron routes. */
export async function GET(req: NextRequest) {
  const expected = process.env.CRON_SECRET;
  if (!expected) return NextResponse.json({ error: "CRON_SECRET is not configured." }, { status: 500 });
  if (req.headers.get("authorization") !== `Bearer ${expected}`) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  try {
    return NextResponse.json({ ok: true, summary: await runRetention({ source: "app" }) });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Retention run failed." }, { status: 500 });
  }
}
