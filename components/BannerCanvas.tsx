"use client";

import { useEffect, useRef } from "react";
import { Download } from "lucide-react";
import { AuditResult } from "@/lib/types";

const W = 1200;
const H = 630;

function draw(canvas: HTMLCanvasElement, result: AuditResult) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  ctx.clearRect(0, 0, W, H);

  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, "#0A0A0A");
  bg.addColorStop(1, "#141018");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // ambient glow blobs
  const glow1 = ctx.createRadialGradient(180, 120, 0, 180, 120, 420);
  glow1.addColorStop(0, "rgba(99,102,241,0.35)");
  glow1.addColorStop(1, "rgba(99,102,241,0)");
  ctx.fillStyle = glow1;
  ctx.fillRect(0, 0, W, H);

  const glow2 = ctx.createRadialGradient(1050, 520, 0, 1050, 520, 420);
  glow2.addColorStop(0, "rgba(139,92,246,0.3)");
  glow2.addColorStop(1, "rgba(139,92,246,0)");
  ctx.fillStyle = glow2;
  ctx.fillRect(0, 0, W, H);

  // grid pattern
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

  // eyebrow
  ctx.fillStyle = "#9A9AA2";
  ctx.font = "600 22px ui-monospace, monospace";
  ctx.fillText("AUDITYXE AUDIT REPORT", 64, 90);

  // url
  ctx.fillStyle = "#F4F4F5";
  ctx.font = "800 56px Manrope, sans-serif";
  ctx.fillText(result.url, 64, 170);

  // verdict
  ctx.fillStyle = "#A1A1AA";
  ctx.font = "500 26px Manrope, sans-serif";
  wrapText(ctx, result.verdict.constructive, 64, 230, 620, 36);

  // score badge
  const cx = 1010;
  const cy = 300;
  const r = 130;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255,255,255,0.04)";
  ctx.fill();
  ctx.lineWidth = 14;
  ctx.strokeStyle = "#2A2A2E";
  ctx.beginPath();
  ctx.arc(cx, cy, r - 20, 0, Math.PI * 2);
  ctx.stroke();

  const scoreColor = result.overall >= 8 ? "#10B981" : result.overall >= 5 ? "#F59E0B" : "#F43F5E";
  const pct = result.overall / 10;
  ctx.beginPath();
  ctx.strokeStyle = scoreColor;
  ctx.arc(cx, cy, r - 20, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * pct);
  ctx.stroke();

  ctx.fillStyle = "#F4F4F5";
  ctx.font = "800 64px Manrope, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(result.overall.toFixed(1), cx, cy + 18);
  ctx.font = "500 20px ui-monospace, monospace";
  ctx.fillStyle = "#9A9AA2";
  ctx.fillText("/ 10", cx, cy + 48);
  ctx.textAlign = "left";

  // footer brand
  ctx.fillStyle = "#6366F1";
  ctx.font = "700 24px Manrope, sans-serif";
  ctx.fillText("audityxe.app", 64, H - 50);
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number) {
  const words = text.split(" ");
  let line = "";
  let curY = y;
  let lines = 0;
  for (const word of words) {
    const test = line + word + " ";
    if (ctx.measureText(test).width > maxWidth && line !== "" && lines < 2) {
      ctx.fillText(line, x, curY);
      line = word + " ";
      curY += lineHeight;
      lines++;
    } else {
      line = test;
    }
  }
  ctx.fillText(line, x, curY);
}

export default function BannerCanvas({ result }: { result: AuditResult }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (canvasRef.current) draw(canvasRef.current, result);
  }, [result]);

  function download() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `audityxe-${result.url}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  }

  return (
    <div className="glass rounded-2xl p-4 sm:p-5">
      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        className="w-full h-auto rounded-xl border border-border"
      />
      <button
        onClick={download}
        className="mt-4 w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-primary to-accent font-semibold text-sm hover:brightness-110 transition"
      >
        <Download size={16} />
        Download Banner PNG
      </button>
    </div>
  );
}
