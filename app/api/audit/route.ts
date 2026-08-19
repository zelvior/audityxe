import { NextRequest, NextResponse } from "next/server";
import { runAudit } from "@/lib/analyze";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
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

  try {
    const result = await runAudit(url, body.competitorUrl);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch and analyze the site.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
