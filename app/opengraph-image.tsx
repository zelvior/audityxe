import { ImageResponse } from "next/og";
import { readFileSync } from "fs";
import { join } from "path";

export const runtime = "nodejs";
export const alt = "Audityxe — Instant Site Audit & Pro Promo Kit";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpengraphImage() {
  const logoBuffer = readFileSync(join(process.cwd(), "public", "logo-mark-trimmed.png"));
  const logoDataUri = `data:image/png;base64,${logoBuffer.toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          background: "linear-gradient(135deg, #0A0A0A 0%, #141018 100%)",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            marginBottom: 36,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logoDataUri} width={56} height={50} alt="" />
          <div style={{ display: "flex", fontSize: 36, fontWeight: 700, color: "#F4F4F5" }}>
            Audityxe
          </div>
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 60,
            fontWeight: 700,
            color: "#F4F4F5",
            lineHeight: 1.15,
            maxWidth: 980,
          }}
        >
          Instant Site Audit &amp; Pro Promo Kit
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 28,
            color: "#A1A1AA",
            marginTop: 28,
            maxWidth: 860,
          }}
        >
          Live-measured scores, a 17-area deep audit, and ready-to-post promo kits — for any URL.
        </div>
      </div>
    ),
    { ...size }
  );
}
