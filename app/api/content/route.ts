import { NextResponse } from "next/server";
import { getSiteContent } from "@/lib/site-config";

export const runtime = "nodejs";
// Read at request time (never prerendered at build — it needs Firestore). The
// Cache-Control header below lets the CDN absorb the traffic.
export const dynamic = "force-dynamic";

/** Public: admin-editable text blocks (plain text) and showcase categories. */
export async function GET() {
  const c = await getSiteContent();
  return NextResponse.json(
    { blocks: c.blocks, categories: c.categories },
    { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } }
  );
}
