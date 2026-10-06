import { NextRequest, NextResponse } from "next/server";
import { adminGate, adminFail, pageSize } from "@/lib/admin-api";
import { adminDb } from "@/lib/firebase/admin";
import { backfillPayments, listPayments, paymentsSummary, type PaymentState } from "@/lib/payments";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const STATES = new Set(["paid", "refunded", "failed", "expired", "partially_paid"]);

/** Cursor-paginated transactions (`?state=failed` for the failed queue) plus, on request, a 30-day summary. */
export async function GET(req: NextRequest) {
  try {
    await adminGate(req);
    const sp = req.nextUrl.searchParams;
    const state = sp.get("state") || "";
    const db = adminDb();
    const page = await listPayments(db, {
      state: STATES.has(state) ? (state as PaymentState) : "",
      uid: (sp.get("uid") || "").slice(0, 128) || undefined,
      cursor: sp.get("cursor"),
      limit: pageSize(req),
    });
    const days = Math.min(Math.max(Number(sp.get("days")) || 30, 1), 365);
    const summary = sp.get("summary") === "1" ? await paymentsSummary(db, days) : undefined;
    return NextResponse.json({ ...page, summary });
  } catch (err) {
    return adminFail(err, "Failed to load payments.");
  }
}

/** POST { action: "backfill" } — one-time upgrade of records written before `state` existed. */
export async function POST(req: NextRequest) {
  try {
    await adminGate(req);
    const body = await req.json().catch(() => ({}));
    if (body?.action !== "backfill") return NextResponse.json({ error: "Invalid action." }, { status: 400 });
    return NextResponse.json({ ok: true, ...(await backfillPayments(adminDb())) });
  } catch (err) {
    return adminFail(err, "Backfill failed.");
  }
}
