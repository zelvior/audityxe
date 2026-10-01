import { NextRequest, NextResponse } from "next/server";
import { requireAuth, AuthError } from "@/lib/auth-server";
import { requireAdmin } from "@/lib/admin";
import { logAdminAction } from "@/lib/admin-log";
import { buildGraph, overview, adminBan, adminUnban } from "@/lib/abuse/graph";
import { clearStrikes, BanKind } from "@/lib/abuse/store";
import { abuseMode } from "@/lib/abuse/core";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const KINDS: BanKind[] = ["uid", "device", "ip", "fp"];

async function gate(req: NextRequest) {
  const identity = await requireAuth(req, { requireEmailVerified: true });
  await requireAdmin(identity, req);
  return identity;
}

function fail(err: unknown, fallback: string) {
  if (err instanceof AuthError) return NextResponse.json({ error: err.message, code: err.code }, { status: err.status });
  return NextResponse.json({ error: err instanceof Error ? err.message : fallback }, { status: 400 });
}

export async function GET(req: NextRequest) {
  try {
    await gate(req);
    const view = req.nextUrl.searchParams.get("view") || "overview";
    if (view === "graph") {
      const q = (req.nextUrl.searchParams.get("q") || "").slice(0, 200);
      return NextResponse.json(await buildGraph(q));
    }
    return NextResponse.json({ mode: abuseMode(), ...(await overview()) });
  } catch (err) {
    return fail(err, "Failed to load abuse data.");
  }
}

export async function POST(req: NextRequest) {
  try {
    const identity = await gate(req);
    const body = await req.json().catch(() => ({}));
    const action = body?.action;
    const kind: BanKind = KINDS.includes(body?.kind) ? body.kind : "uid";
    const target = typeof body?.target === "string" ? body.target.trim().slice(0, 200) : "";
    if (!target) return NextResponse.json({ error: "Missing target." }, { status: 400 });
    const by = identity.email || "admin";

    if (action === "ban") {
      const hoursRaw = body?.hours;
      const hours = hoursRaw === null || hoursRaw === "permanent" ? null : Math.min(Math.max(Number(hoursRaw) || 24, 1), 24 * 365);
      const reason = typeof body?.reason === "string" ? body.reason : "";
      await adminBan({ kind, target, hours, reason, by });
      await logAdminAction(by, "abuse_ban", `${kind}:${target}`, `${hours === null ? "permanent" : hours + "h"}${reason ? ` — ${reason}` : ""}`);
    } else if (action === "unban") {
      await adminUnban({ kind, target, by });
      await logAdminAction(by, "abuse_unban", `${kind}:${target}`, null);
    } else if (action === "clear-strikes") {
      await clearStrikes(kind, target);
      await logAdminAction(by, "abuse_clear_strikes", `${kind}:${target}`, null);
    } else {
      return NextResponse.json({ error: "Invalid action." }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    return fail(err, "Action failed.");
  }
}
