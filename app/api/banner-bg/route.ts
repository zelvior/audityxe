import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Proxies a real AI-generated image from Pollinations.ai — a free,
 * keyless, Stable-Diffusion-based image generation API — so the banner
 * can composite it with next/image or a same-origin <img> without
 * hitting canvas cross-origin tainting (Pollinations doesn't reliably
 * send CORS headers, so fetching it directly client-side and drawing it
 * to <canvas> would block canvas.toDataURL()). This route fetches the
 * image server-side and streams it back from our own origin instead.
 */
export async function GET(req: NextRequest) {
  const prompt = req.nextUrl.searchParams.get("prompt");
  const seed = req.nextUrl.searchParams.get("seed") || "1";

  if (!prompt || !prompt.trim()) {
    return NextResponse.json({ error: "A prompt is required." }, { status: 400 });
  }

  const encoded = encodeURIComponent(prompt.trim().slice(0, 300));
  const upstreamUrl = `https://image.pollinations.ai/prompt/${encoded}?width=1200&height=630&nologo=true&seed=${encodeURIComponent(
    seed
  )}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);

  try {
    const res = await fetch(upstreamUrl, {
      signal: controller.signal,
      headers: { "User-Agent": "Mozilla/5.0 (compatible; AudityxeBot/1.0; +https://audityxe.app)" },
    });

    if (!res.ok) {
      return NextResponse.json({ error: `Image generation failed (status ${res.status}).` }, { status: 502 });
    }

    const arrayBuffer = await res.arrayBuffer();
    return new NextResponse(arrayBuffer, {
      status: 200,
      headers: {
        "Content-Type": res.headers.get("content-type") || "image/jpeg",
        "Cache-Control": "public, max-age=86400, immutable",
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
