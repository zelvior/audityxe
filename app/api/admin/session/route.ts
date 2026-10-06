import { NextRequest, NextResponse } from "next/server";
import { adminGate, adminFail } from "@/lib/admin-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Cheap "am I allowed in?" check used by the admin shell's password gate. */
export async function GET(req: NextRequest) {
  try {
    const identity = await adminGate(req);
    return NextResponse.json({ ok: true, email: identity.email });
  } catch (err) {
    return adminFail(err, "Not authorised.");
  }
}
