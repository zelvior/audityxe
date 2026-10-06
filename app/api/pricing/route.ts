import { NextResponse } from "next/server";
import { getEffectivePrices } from "@/lib/site-config";

export const runtime = "nodejs";
// Read at request time (never prerendered at build — it needs Firestore). The
// Cache-Control header below lets the CDN absorb the traffic.
export const dynamic = "force-dynamic";

/** Public: the prices currently charged (admin override, else the default). */
export async function GET() {
  const p = await getEffectivePrices();
  return NextResponse.json(
    { standard: p.standard, pro: p.pro },
    { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } }
  );
}
