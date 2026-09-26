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
  saveCruxByokKey,
  removeCruxByokKey,
  getCruxByokInfo,
} from "@/lib/user-settings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// The PSI-key validation call below waits up to 25s for a real test
// request to Google — give the function enough room to actually finish
// that wait instead of being killed by the platform default first.
export const maxDuration = 30;

export async function GET(req: NextRequest) {
  try {
    const identity = await requireAuth(req);
    await ensureUserDoc(identity);
    const [byok, psiByok, cruxByok, plan] = await Promise.all([
      getByokInfo(identity.uid),
      getPsiByokInfo(identity.uid),
      getCruxByokInfo(identity.uid),
      getUserPlan(identity.uid),
    ]);
    return NextResponse.json({ byok, psiByok, cruxByok, plan });
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
      cruxApiKey?: string | null;
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
      // BYOK Lighthouse/PageSpeed is available on every plan now — Pro
      // just also gets a small shared-key weekly allowance on top (see
      // /api/audit). No plan gate here.
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
          const testTimer = setTimeout(() => testController.abort(), 25000);
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

    if (body.cruxApiKey !== undefined) {
      // Optional, separate key for CrUX only — most people never touch
      // this and just reuse their Google Cloud API Key above for both.
      if (body.cruxApiKey === null || body.cruxApiKey === "") {
        await removeCruxByokKey(identity.uid);
      } else {
        if (typeof body.cruxApiKey !== "string" || body.cruxApiKey.length < 10 || body.cruxApiKey.length > 300) {
          return NextResponse.json({ error: "That doesn't look like a valid API key." }, { status: 400 });
        }
        const trimmedCruxKey = body.cruxApiKey.trim();
        try {
          const testController = new AbortController();
          const testTimer = setTimeout(() => testController.abort(), 15000);
          const testRes = await fetch(
            `https://chromeuxreport.googleapis.com/v1/records:queryRecord?key=${encodeURIComponent(trimmedCruxKey)}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ origin: "https://example.com" }),
              signal: testController.signal,
            }
          ).finally(() => clearTimeout(testTimer));
          // 404 = key is valid but example.com has no CrUX data — that's a
          // successful auth check, not a key failure. Anything else 4xx/5xx
          // means the key itself (or the CrUX API toggle) is the problem.
          if (!testRes.ok && testRes.status !== 404) {
            let reason = `Chrome UX Report rejected this key (HTTP ${testRes.status}).`;
            try {
              const errBody = await testRes.json();
              if (typeof errBody?.error?.message === "string") reason = errBody.error.message;
            } catch {
              // non-JSON error body — keep the generic reason
            }
            if (testRes.status === 403) {
              reason += " Make sure the \"Chrome UX Report API\" is enabled for this key's Google Cloud project (it's a separate toggle from the PageSpeed Insights API) — see the CrUX setup steps in Settings.";
            }
            return NextResponse.json({ error: reason }, { status: 400 });
          }
        } catch (err) {
          const isAbort = err instanceof Error && err.name === "AbortError";
          return NextResponse.json(
            { error: isAbort ? "Timed out testing this key against Chrome UX Report — please try again." : "Couldn't reach Chrome UX Report to test this key. Please try again." },
            { status: 502 }
          );
        }
        await saveCruxByokKey(identity.uid, trimmedCruxKey);
      }
    }

    const [byok, psiByok, cruxByok] = await Promise.all([getByokInfo(identity.uid), getPsiByokInfo(identity.uid), getCruxByokInfo(identity.uid)]);
    return NextResponse.json({ ok: true, byok, psiByok, cruxByok });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.status });
    }
    const message = err instanceof Error ? err.message : "Failed to update settings.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
