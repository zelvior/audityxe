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
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.status });
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
        // Actually test the key against the real PSI endpoint before
        // saving it — previously any string in the right length range
        // was accepted with no live check, so a mistyped or wrongly-
        // restricted key would only surface as a failure much later,
        // during an actual audit (and, until the Lighthouse module fix
        // above, with no visible error at all).
        const trimmedKey = body.psiApiKey.trim();
        try {
          const testUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(
            "https://example.com"
          )}&category=performance&key=${encodeURIComponent(trimmedKey)}`;
          const testController = new AbortController();
          const testTimer = setTimeout(() => testController.abort(), 10000);
          const testRes = await fetch(testUrl, { signal: testController.signal }).finally(() => clearTimeout(testTimer));
          if (!testRes.ok) {
            let reason = `PageSpeed Insights rejected this key (HTTP ${testRes.status}).`;
            try {
              const errBody = await testRes.json();
              if (typeof errBody?.error?.message === "string") reason = errBody.error.message;
            } catch {
              // non-JSON error body — keep the generic reason
            }
            if (testRes.status === 403) {
              reason +=
                " If this key has an \"HTTP referrer\" restriction in Google Cloud Console, that's almost certainly why: referrer restrictions only work for calls made from a browser, and this test (like every real audit) is a server-side request with no referrer header. Set \"Application restrictions\" to \"None\" instead — an IP-address restriction isn't a safe substitute either, since server hosting commonly uses non-fixed outbound IPs.";
            }
            return NextResponse.json({ error: reason }, { status: 400 });
          }
        } catch (err) {
          const isAbort = err instanceof Error && err.name === "AbortError";
          return NextResponse.json(
            { error: isAbort ? "Timed out testing this key against PageSpeed Insights — please try again." : "Couldn't reach PageSpeed Insights to test this key. Please try again." },
            { status: 502 }
          );
        }
        await savePsiByokKey(identity.uid, trimmedKey);
      }
    }

    const [byok, psiByok] = await Promise.all([getByokInfo(identity.uid), getPsiByokInfo(identity.uid)]);
    return NextResponse.json({ ok: true, byok, psiByok });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.status });
    }
    const message = err instanceof Error ? err.message : "Failed to update settings.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
