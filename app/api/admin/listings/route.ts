import { NextRequest, NextResponse } from "next/server";
import { adminGate, adminFail, pageSize } from "@/lib/admin-api";
import { adminDb } from "@/lib/firebase/admin";
import { listListings } from "@/lib/showcase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await adminGate(req);
    const sp = req.nextUrl.searchParams;
    const v = sp.get("visibility");
    const page = await listListings(adminDb(), {
      q: (sp.get("q") || "").slice(0, 120),
      visibility: v === "hidden" || v === "featured" ? v : "",
      cursor: sp.get("cursor"),
      limit: pageSize(req),
    });
    return NextResponse.json(page);
  } catch (err) {
    return adminFail(err, "Failed to load listings.");
  }
}
