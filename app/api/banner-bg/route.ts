import { NextRequest, NextResponse } from "next/server";
import { requireAuth, AuthError } from "@/lib/auth-server";
import { getUserPlan, checkAndIncrementFeatureUsage } from "@/lib/rate-limit";
import { PLANS } from "@/lib/plans";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

const MAX_PROMPT_LENGTH = 300;

/** Separate, smaller daily cap than the audit quota — banner image
 * generation is a heavier/more abusable resource than a JSON audit. */
const BANNER_IMAGE_DAILY_LIMIT: Record<"standard" | "pro", number> = {
  standard: 5,
  pro: 10,
};

/**
 * Proxies a real AI-generated image from Pollinations.ai — a free,
 * keyless, Stable-Diffusion-based image generation API — so the banner
 * can composite it via a same-origin <img> without hitting canvas
 * cross-origin tainting (Pollinations doesn't reliably send CORS
 * headers, so fetching it directly client-side and drawing it to
 * <canvas> would block canvas.toDataURL()). This route fetches the
 * image server-side and streams it back from our own origin instead.
 *
 * Gated to Standard/Pro plans with its own atomic daily quota, separate
 * from the audit quota — this endpoint has a real compute/bandwidth cost
 * per call, so it's metered like any other paid feature.
 */
export async function GET(req: NextRequest) {
  let identity;
  try {
    identity = await requireAuth(req);
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Authentication failed." }, { status: 401 });
  }

  const plan = await getUserPlan(identity.uid);
  if (plan !== "standard" && plan !== "pro") {
    return NextResponse.json(
      { error: "AI-generated promo banners are available on Standard and Pro plans.", code: "PLAN_REQUIRED" },
      { status: 403 }
    );
  }

  const dailyLimit = BANNER_IMAGE_DAILY_LIMIT[plan];
  const usage = await checkAndIncrementFeatureUsage(identity.uid, "banner-image", dailyLimit);
  if (!usage.allowed) {
    return NextResponse.json(
      {
        error: `You've generated all ${usage.limit} promo banners on your ${PLANS[plan].name} plan today. It resets at midnight UTC.`,
        code: "RATE_LIMITED",
      },
      { status: 429 }
    );
  }

  const prompt = req.nextUrl.searchParams.get("prompt");
  const seed = req.nextUrl.searchParams.get("seed") || "1";

  if (!prompt || !prompt.trim()) {
    return NextResponse.json({ error: "A prompt is required." }, { status: 400 });
  }
  if (prompt.length > MAX_PROMPT_LENGTH) {
    return NextResponse.json({ error: "Prompt is too long." }, { status: 400 });
  }
  if (!/^\d{1,10}$/.test(seed)) {
    return NextResponse.json({ error: "Invalid seed." }, { status: 400 });
  }

  const encoded = encodeURIComponent(prompt.trim().slice(0, MAX_PROMPT_LENGTH));
  const upstreamUrl = `https://image.pollinations.ai/prompt/${encoded}?width=1200&height=630&nologo=true&seed=${encodeURIComponent(
    seed
  )}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);

  try {
    const res = await fetch(upstreamUrl, {
      signal: controller.signal,
      headers: { "User-Agent": "Mozilla/5.0 (compatible; AudityxeBot/1.0; +https://audityxe.vercel.app)" },
    });

    if (!res.ok) {
      return NextResponse.json({ error: `Image generation failed (status ${res.status}).` }, { status: 502 });
    }

    const arrayBuffer = await res.arrayBuffer();
    if (arrayBuffer.byteLength > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "Generated image was unexpectedly large." }, { status: 502 });
    }

    return new NextResponse(arrayBuffer, {
      status: 200,
      headers: {
        "Content-Type": res.headers.get("content-type") || "image/jpeg",
        "Cache-Control": "private, max-age=86400, immutable",
      },
    });
  } catch (err) {
    const message =
      err instanceof Error && err.name === "AbortError"
        ? "Image generation timed out."
        : "Image generation is temporarily unavailable.";
    return NextResponse.json({ error: message }, { status: 502 });
  } finally {
    clearTimeout(timeout);
  }
}
