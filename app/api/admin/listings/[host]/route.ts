import { NextRequest, NextResponse } from "next/server";
import { adminGate, adminFail } from "@/lib/admin-api";
import { adminDb } from "@/lib/firebase/admin";
import { logAdminAction } from "@/lib/admin-log";
import { applyListingAction, type ListingAction } from "@/lib/showcase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: { host: string } }) {
  try {
    const identity = await adminGate(req);
    const host = decodeURIComponent(params.host || "").trim().toLowerCase().slice(0, 253);
    if (!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(host)) return NextResponse.json({ error: "Invalid host." }, { status: 400 });
    const body = await req.json().catch(() => ({}));
    let action: ListingAction | null = null;
    switch (body?.action) {
      case "hide": case "unhide": case "feature": case "unfeature": case "delete": action = { action: body.action }; break;
      case "set-category": action = { action: "set-category", category: typeof body.category === "string" && body.category ? body.category : null }; break;
      case "note": action = { action: "note", note: typeof body.note === "string" ? body.note : null }; break;
    }
    if (!action) return NextResponse.json({ error: "Invalid action." }, { status: 400 });
    const r = await applyListingAction(adminDb(), host, action);
    if (!r.ok) return NextResponse.json({ error: r.error }, { status: 400 });
    await logAdminAction(identity.email || "admin", `listing_${action.action.replace(/-/g, "_")}`, host, action.action === "set-category" ? action.category : null);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return adminFail(err, "Listing action failed.", 400);
  }
}
