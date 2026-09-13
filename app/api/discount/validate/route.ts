import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase/admin";
import { validatePercentOffCode } from "@/lib/discount-codes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const code = typeof body?.code === "string" ? body.code.slice(0, 64) : "";

    // Auth is optional here — an unauthenticated visitor can still
    // preview a discount, just without the per-user "already used"
    // check (that's enforced again, authoritatively, at consume time).
    let uid: string | null = null;
    const authHeader = req.headers.get("authorization");
    if (authHeader?.startsWith("Bearer ")) {
      try {
        const decoded = await adminAuth().verifyIdToken(authHeader.slice(7));
        uid = decoded.uid;
      } catch {
        // Invalid/expired token — treat as unauthenticated rather than erroring.
      }
    }

    const result = await validatePercentOffCode(uid, code);
    if (!result.ok) return NextResponse.json({ error: result.error || "Invalid code." }, { status: 400 });
    return NextResponse.json({ plan: result.plan, percentOff: result.percentOff });
  } catch {
    return NextResponse.json({ error: "Something went wrong checking that code." }, { status: 500 });
  }
}
