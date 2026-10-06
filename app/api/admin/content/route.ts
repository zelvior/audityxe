import { NextRequest, NextResponse } from "next/server";
import { adminGate, adminFail } from "@/lib/admin-api";
import { adminDb } from "@/lib/firebase/admin";
import { logAdminAction } from "@/lib/admin-log";
import { CONTENT_BLOCKS, getEffectivePrices, getSiteContent, savePrices, saveSiteContent } from "@/lib/site-config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Everything the Content page edits: prices, text blocks, categories. */
export async function GET(req: NextRequest) {
  try {
    await adminGate(req);
    const db = adminDb();
    const [prices, content] = await Promise.all([getEffectivePrices(db, { fresh: true }), getSiteContent(db, { fresh: true })]);
    return NextResponse.json({ prices, content, blockDefs: CONTENT_BLOCKS });
  } catch (err) {
    return adminFail(err, "Failed to load content settings.");
  }
}

/** PUT { prices?: {standard?,pro?}, blocks?: {...}, categories?: string[] } — any subset. */
export async function PUT(req: NextRequest) {
  try {
    const identity = await adminGate(req);
    const body = await req.json().catch(() => ({}));
    const actor = identity.email || "admin";
    const db = adminDb();
    const out: Record<string, unknown> = {};
    if (body?.prices !== undefined) {
      const r = await savePrices(db, body.prices || {}, actor);
      if (!r.ok) return NextResponse.json({ error: r.error }, { status: 400 });
      out.prices = r.prices;
      await logAdminAction(actor, "prices_update", null, JSON.stringify(body.prices).slice(0, 200));
    }
    if (body?.blocks !== undefined || body?.categories !== undefined) {
      const r = await saveSiteContent(db, { blocks: body.blocks, categories: body.categories }, actor);
      if (!r.ok) return NextResponse.json({ error: r.error }, { status: 400 });
      out.content = r.content;
      await logAdminAction(actor, "content_update", null, Object.keys({ ...(body.blocks || {}), ...(body.categories ? { categories: 1 } : {}) }).join(",").slice(0, 200));
    }
    if (!Object.keys(out).length) return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
    return NextResponse.json({ ok: true, ...out });
  } catch (err) {
    return adminFail(err, "Failed to save.", 400);
  }
}
