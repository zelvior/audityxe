import { NextRequest, NextResponse } from "next/server";
import { requireAuth, AuthError } from "@/lib/auth-server";
import { ensureUserDoc, getUserPlan } from "@/lib/rate-limit";
import {
  updateDisplayNameOnRecord,
  saveByokKey,
  removeByokKey,
  getByokInfo,
  savePsiByokKey,
  removePsiByokKey,
  getPsiByokInfo,
} from "@/lib/user-settings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const identity = await requireAuth(req);
    await ensureUserDoc(identity);
    const [byok, psiByok, plan] = await Promise.all([
      getByokInfo(identity.uid),
      getPsiByokInfo(identity.uid),
      getUserPlan(identity.uid),
    ]);
    return NextResponse.json({ byok, psiByok, plan });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Failed to load settings." }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const contentLength = Number(req.headers.get("content-length") || 0);
  if (contentLength > 4096) {
    return NextResponse.json({ error: "Request body is too large." }, { status: 413 });
  }

  try {
    const identity = await requireAuth(req);
    await ensureUserDoc(identity);

    let body: {
      displayName?: string;
      aiApiKey?: string | null;
      aiBaseUrl?: string;
      aiModel?: string;
      psiApiKey?: string | null;
    };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
    }

    if (body.displayName !== undefined && typeof body.displayName !== "string") {
      return NextResponse.json({ error: "Invalid display name." }, { status: 400 });
    }
    if (typeof body.displayName === "string" && body.displayName.length > 80) {
      return NextResponse.json({ error: "Display name is too long." }, { status: 400 });
    }

    if (body.displayName !== undefined) {
      await updateDisplayNameOnRecord(identity.uid, body.displayName.trim() || null);
    }

    if (body.aiApiKey !== undefined) {
      const plan = await getUserPlan(identity.uid);
      if (plan !== "pro") {
        return NextResponse.json(
          { error: "Bringing your own AI key is a Pro-plan feature.", code: "PLAN_REQUIRED" },
          { status: 403 }
        );
      }

      if (body.aiApiKey === null || body.aiApiKey === "") {
        await removeByokKey(identity.uid);
      } else {
        if (typeof body.aiApiKey !== "string" || body.aiApiKey.length < 10 || body.aiApiKey.length > 300) {
          return NextResponse.json({ error: "That doesn't look like a valid API key." }, { status: 400 });
        }
        if (body.aiBaseUrl && (typeof body.aiBaseUrl !== "string" || body.aiBaseUrl.length > 300)) {
          return NextResponse.json({ error: "Invalid base URL." }, { status: 400 });
        }
        if (body.aiModel && (typeof body.aiModel !== "string" || body.aiModel.length > 200)) {
          return NextResponse.json({ error: "Invalid model name." }, { status: 400 });
        }
        await saveByokKey(identity.uid, body.aiApiKey.trim(), body.aiBaseUrl, body.aiModel);
      }
    }

    if (body.psiApiKey !== undefined) {
      const plan = await getUserPlan(identity.uid);
      if (plan !== "pro") {
        return NextResponse.json(
          { error: "Bringing your own PageSpeed key is a Pro-plan feature.", code: "PLAN_REQUIRED" },
          { status: 403 }
        );
      }

      if (body.psiApiKey === null || body.psiApiKey === "") {
        await removePsiByokKey(identity.uid);
      } else {
        if (typeof body.psiApiKey !== "string" || body.psiApiKey.length < 10 || body.psiApiKey.length > 300) {
          return NextResponse.json({ error: "That doesn't look like a valid API key." }, { status: 400 });
        }
        await savePsiByokKey(identity.uid, body.psiApiKey.trim());
      }
    }

    const [byok, psiByok] = await Promise.all([getByokInfo(identity.uid), getPsiByokInfo(identity.uid)]);
    return NextResponse.json({ ok: true, byok, psiByok });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    const message = err instanceof Error ? err.message : "Failed to update settings.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
