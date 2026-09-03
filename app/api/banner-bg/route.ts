import { NextRequest, NextResponse } from "next/server";
import { requireAuth, AuthError } from "@/lib/auth-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

const MAX_PROMPT_LENGTH = 300;

/**
 * Proxies a real AI-generated image from Pollinations.ai — a free,
 * keyless, Stable-Diffusion-based image generation API — so the banner
 * can composite it via a same-origin <img> without hitting canvas
 * cross-origin tainting (Pollinations doesn't reliably send CORS
 * headers, so fetching it directly client-side and drawing it to
 * <canvas> would block canvas.toDataURL()). This route fetches the
 * image server-side and streams it back from our own origin instead.
 *
 * Requires sign-in: this endpoint has a real (if small) compute/bandwidth
 * cost per call, and being unauthenticated would make it a free,
 * unmetered image-generation proxy for anyone on the internet, not just
 * Audityxe's own banner feature.
 */
export async function GET(req: NextRequest) {
  try {
    await requireAuth(req);
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Authentication failed." }, { status: 401 });
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
