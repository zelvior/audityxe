import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Audityxe — Instant AI Site Audit & Viral Promo Generator";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpengraphImage() {
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
            gap: 14,
            marginBottom: 36,
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 16,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "linear-gradient(135deg, #6366F1, #8B5CF6)",
              fontSize: 30,
            }}
          >
            🛰️
          </div>
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
          Instant AI Site Audit &amp; Viral Promo Generator
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
          Live-measured scores, 16-area deep audits, and ready-to-post promo kits — for any URL.
        </div>
      </div>
    ),
    { ...size }
  );
}
