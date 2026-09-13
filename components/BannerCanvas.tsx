"use client";

import { useEffect, useRef, useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { AuditResult } from "@/lib/types";
import { useAuth } from "@/context/AuthContext";

const W = 1200;
const H = 630;

function scoreColorFor(overall: number) {
  return overall >= 8 ? "#3F7D5C" : overall >= 5 ? "#A8720A" : "#B23A2E";
}

/** Renders headline text with one accent word tinted differently — the
 * "senior graphic designer" typographic hierarchy technique: emphasize
 * exactly one word rather than the whole line, so the eye has a single
 * clear focal point. */
function drawEmphasizedHeadline(
  ctx: CanvasRenderingContext2D,
  headline: string,
  accentWord: string,
  x: number,
  y: number,
  maxWidth: number,
  fontSize: number,
  accentColor: string,
  align: "left" | "center" = "left"
): number {
  const words = headline.split(" ");
  const lineHeight = fontSize * 1.08;
  ctx.font = `800 ${fontSize}px Fraunces, serif`;
  ctx.textAlign = align;

  // Wrap into lines first
  const lines: string[][] = [[]];
  let currentWidth = 0;
  const spaceWidth = ctx.measureText(" ").width;
  for (const word of words) {
    const w = ctx.measureText(word).width;
    if (currentWidth + w > maxWidth && lines[lines.length - 1].length > 0) {
      lines.push([]);
      currentWidth = 0;
    }
    lines[lines.length - 1].push(word);
    currentWidth += w + spaceWidth;
  }

  let curY = y;
  for (const lineWords of lines) {
    let cursorX = x;
    const lineText = lineWords.join(" ");
    if (align === "center") {
      // measure full line, then draw word-by-word from the centered start x
      const lineWidth = ctx.measureText(lineText).width;
      cursorX = x - lineWidth / 2;
      ctx.textAlign = "left";
    }
    for (let i = 0; i < lineWords.length; i++) {
      const word = lineWords[i];
      const isAccent = word.replace(/[^\w]/g, "").toLowerCase() === accentWord.replace(/[^\w]/g, "").toLowerCase();
      ctx.fillStyle = isAccent ? accentColor : "#F4EFE4";
      ctx.fillText(word, cursorX, curY);
      cursorX += ctx.measureText(word + " ").width;
    }
    curY += lineHeight;
    ctx.textAlign = align;
  }
  ctx.textAlign = "left";
  return curY;
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines = 2
) {
  const words = text.split(" ");
  let line = "";
  let curY = y;
  let lines = 0;
  for (const word of words) {
    const test = line + word + " ";
    if (ctx.measureText(test).width > maxWidth && line !== "" && lines < maxLines - 1) {
      ctx.fillText(line, x, curY);
      line = word + " ";
      curY += lineHeight;
      lines++;
    } else {
      line = test;
    }
  }
  ctx.fillText(line, x, curY);
  return curY;
}

function drawBackground(ctx: CanvasRenderingContext2D, accentColor: string, aiImage: HTMLImageElement | null) {
  if (aiImage) {
    // Real AI-generated background (Pollinations.ai), cover-fit into the frame.
    const imgRatio = aiImage.width / aiImage.height;
    const frameRatio = W / H;
    let drawW = W;
    let drawH = H;
    let offsetX = 0;
    let offsetY = 0;
    if (imgRatio > frameRatio) {
      drawH = H;
      drawW = H * imgRatio;
      offsetX = (W - drawW) / 2;
    } else {
      drawW = W;
      drawH = W / imgRatio;
      offsetY = (H - drawH) / 2;
    }
    ctx.drawImage(aiImage, offsetX, offsetY, drawW, drawH);

    // Dark scrim so headline/badge text stays fully readable over the art.
    const scrim = ctx.createLinearGradient(0, 0, W, H);
    scrim.addColorStop(0, "rgba(10,10,10,0.88)");
    scrim.addColorStop(0.55, "rgba(10,10,10,0.72)");
    scrim.addColorStop(1, "rgba(10,10,10,0.55)");
    ctx.fillStyle = scrim;
    ctx.fillRect(0, 0, W, H);
  } else {
    const bg = ctx.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, "#1A1108");
    bg.addColorStop(1, "#241708");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);
  }

  const glow1 = ctx.createRadialGradient(180, 120, 0, 180, 120, 420);
  glow1.addColorStop(0, accentColor + "59"); // ~35% alpha
  glow1.addColorStop(1, accentColor + "00");
  ctx.fillStyle = glow1;
  ctx.fillRect(0, 0, W, H);

  const glow2 = ctx.createRadialGradient(1050, 520, 0, 1050, 520, 420);
  glow2.addColorStop(0, "rgba(240,196,107,0.28)");
  glow2.addColorStop(1, "rgba(240,196,107,0)");
  ctx.fillStyle = glow2;
  ctx.fillRect(0, 0, W, H);

  if (!aiImage) {
    ctx.strokeStyle = "rgba(255,255,255,0.04)";
    ctx.lineWidth = 1;
    for (let x = 0; x < W; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, H);
      ctx.stroke();
    }
    for (let y = 0; y < H; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }
  }
}

function drawScoreBadge(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, overall: number) {
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255,255,255,0.04)";
  ctx.fill();
  ctx.lineWidth = 14;
  ctx.strokeStyle = "#4A3A22";
  ctx.beginPath();
  ctx.arc(cx, cy, r - 20, 0, Math.PI * 2);
  ctx.stroke();

  const color = scoreColorFor(overall);
  const pct = overall / 10;
  ctx.beginPath();
  ctx.strokeStyle = color;
  ctx.lineCap = "round";
  ctx.arc(cx, cy, r - 20, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * pct);
  ctx.stroke();
  ctx.lineCap = "butt";

  ctx.fillStyle = "#F4EFE4";
  ctx.font = "800 64px Fraunces, serif";
  ctx.textAlign = "center";
  ctx.fillText(overall.toFixed(1), cx, cy + 18);
  ctx.font = "500 20px ui-monospace, monospace";
  ctx.fillStyle = "#C9BBA0";
  ctx.fillText("/ 10", cx, cy + 48);
  ctx.textAlign = "left";
}

/** Layout A — large centered badge, headline + tagline on the left. */
function drawCenteredBadgeLayout(ctx: CanvasRenderingContext2D, result: AuditResult, accentColor: string) {
  ctx.fillStyle = "#C9BBA0";
  ctx.font = "600 20px ui-monospace, monospace";
  ctx.textAlign = "left";
  ctx.fillText("AUDITYXE \u00B7 LIVE AUDIT", 64, 82);

  ctx.fillStyle = "#F4EFE4";
  ctx.font = "600 24px ui-monospace, monospace";
  ctx.fillText(result.url, 64, 122);

  const headlineBottom = drawEmphasizedHeadline(
    ctx,
    result.banner.headline,
    result.banner.accentWord,
    64,
    205,
    620,
    58,
    accentColor
  );

  ctx.fillStyle = "#C9BBA0";
  ctx.font = "500 24px Fraunces, serif";
  wrapText(ctx, result.banner.tagline, 64, headlineBottom + 34, 620, 34, 2);

  drawScoreBadge(ctx, 1010, 300, 130, result.overall);
}

/** Layout B — compact left-aligned stat block, more room for a longer headline. */
function drawLeftStackedLayout(ctx: CanvasRenderingContext2D, result: AuditResult, accentColor: string) {
  ctx.fillStyle = "#C9BBA0";
  ctx.font = "600 20px ui-monospace, monospace";
  ctx.textAlign = "left";
  ctx.fillText("AUDITYXE \u00B7 LIVE AUDIT", 64, 82);

  ctx.fillStyle = "#F4EFE4";
  ctx.font = "600 24px ui-monospace, monospace";
  ctx.fillText(result.url, 64, 122);

  const headlineBottom = drawEmphasizedHeadline(
    ctx,
    result.banner.headline,
    result.banner.accentWord,
    64,
    200,
    980,
    52,
    accentColor
  );

  ctx.fillStyle = "#C9BBA0";
  ctx.font = "500 22px Fraunces, serif";
  wrapText(ctx, result.banner.tagline, 64, headlineBottom + 30, 900, 30, 2);

  // compact stat block bottom-left
  const color = scoreColorFor(result.overall);
  ctx.fillStyle = "rgba(255,255,255,0.04)";
  ctx.fillRect(64, H - 150, 260, 84);
  ctx.strokeStyle = "#4A3A22";
  ctx.lineWidth = 1.5;
  ctx.strokeRect(64, H - 150, 260, 84);

  ctx.fillStyle = color;
  ctx.font = "800 44px Fraunces, serif";
  ctx.fillText(result.overall.toFixed(1), 84, H - 96);
  ctx.fillStyle = "#C9BBA0";
  ctx.font = "500 16px ui-monospace, monospace";
  ctx.fillText("OVERALL SCORE / 10", 84, H - 74);
}

function draw(canvas: HTMLCanvasElement, result: AuditResult, aiImage: HTMLImageElement | null, logoImage: HTMLImageElement | null) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  ctx.clearRect(0, 0, W, H);
  const accentColor = scoreColorFor(result.overall);
  drawBackground(ctx, accentColor, aiImage);

  if (result.banner.layout === "left-stacked") {
    drawLeftStackedLayout(ctx, result, accentColor);
  } else {
    drawCenteredBadgeLayout(ctx, result, accentColor);
  }

  // footer brand — real logo mark + "Audited by Audityxe" watermark
  if (logoImage) {
    const logoH = 28;
    const logoW = logoH * (logoImage.width / logoImage.height);
    ctx.drawImage(logoImage, 64, H - 68, logoW, logoH);
    ctx.fillStyle = "#F4EFE4";
    ctx.font = "700 22px Fraunces, serif";
    ctx.textAlign = "left";
    ctx.fillText("Audited by Audityxe", 64 + logoW + 12, H - 48);
  } else {
    ctx.fillStyle = "#B5460A";
    ctx.font = "700 24px Fraunces, serif";
    ctx.textAlign = "left";
    ctx.fillText("Audited by Audityxe", 64, H - 50);
  }
}

function bannerPrompt(result: AuditResult): string {
  const mood =
    result.overall >= 8
      ? "bright, optimistic, clean futuristic"
      : result.overall >= 5
      ? "moody, atmospheric, tech-noir"
      : "dark, dramatic, cautionary";
  return `abstract ${mood} digital background, indigo and violet gradients, subtle circuit and network patterns, no text, no logos, no UI elements, cinematic lighting, 4k wallpaper`;
}

function hashSeed(input: string): number {
  let h = 0;
  for (let i = 0; i < input.length; i++) h = (h * 31 + input.charCodeAt(i)) >>> 0;
  return h % 100000;
}

export default function BannerCanvas({ result }: { result: AuditResult }) {
  const { user, getToken } = useAuth();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [aiImage, setAiImage] = useState<HTMLImageElement | null>(null);
  const [aiState, setAiState] = useState<"loading" | "ready" | "unavailable" | "skipped">("loading");
  const [logoImage, setLogoImage] = useState<HTMLImageElement | null>(null);

  // The real brand mark is a same-origin static asset — no auth needed,
  // unlike the generated AI background below.
  useEffect(() => {
    const img = new Image();
    img.onload = () => setLogoImage(img);
    img.src = "/logo-mark-trimmed.png";
  }, []);

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;

    // Public report/sample-report pages can be viewed by anyone without
    // an account — /api/banner-bg requires auth (it has a real
    // generation cost per call), so anonymous viewers simply get the
    // designed gradient fallback instead of attempting (and failing) an
    // authenticated request.
    if (!user) {
      setAiState("skipped");
      setAiImage(null);
      return;
    }

    setAiState("loading");
    setAiImage(null);

    const prompt = bannerPrompt(result);
    const seed = hashSeed(result.url);

    (async () => {
      try {
        const token = await getToken();
        if (!token) {
          if (!cancelled) setAiState("unavailable");
          return;
        }
        const res = await fetch(`/api/banner-bg?prompt=${encodeURIComponent(prompt)}&seed=${seed}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error("banner-bg request failed");
        const blob = await res.blob();
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        const img = new Image();
        img.onload = () => {
          if (cancelled) return;
          setAiImage(img);
          setAiState("ready");
        };
        img.onerror = () => {
          if (!cancelled) setAiState("unavailable");
        };
        img.src = objectUrl;
      } catch {
        if (!cancelled) setAiState("unavailable");
      }
    })();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [result, user, getToken]);

  useEffect(() => {
    if (canvasRef.current) draw(canvasRef.current, result, aiImage, logoImage);
  }, [result, aiImage, logoImage]);

  function download() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `audityxe-${result.url}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  }

  return (
    <div className="glass rounded-card p-4 sm:p-5">
      <div className="relative">
        <canvas
          ref={canvasRef}
          width={W}
          height={H}
          className="w-full h-auto rounded-card border border-border"
        />
        {aiState === "loading" && (
          <div className="absolute top-3 right-3 flex items-center gap-1.5 text-[10px] font-mono px-2.5 py-1 rounded-full bg-black/60 text-text-secondary">
            <Loader2 size={10} className="animate-spin" /> Generating background…
          </div>
        )}
      </div>
      <button
        onClick={download}
        className="mt-4 w-full flex items-center justify-center gap-2 py-3 rounded-card bg-secondary font-semibold text-sm hover:brightness-110 transition"
      >
        <Download size={16} />
        Download Banner PNG
      </button>
    </div>
  );
}
