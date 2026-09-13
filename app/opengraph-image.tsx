import { ImageResponse } from "next/og";
import { readFileSync } from "fs";
import { join } from "path";

export const runtime = "nodejs";
export const alt = "Audityxe: Free Website Audit Tool";
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
          // Was a leftover violet-tinted gradient (#141018) from the old
          // AI-purple palette, never caught by the earlier site-wide
          // sweep since it's a bespoke inline value in this one
          // edge-rendered image rather than a shared color token. Now
          // matches the rest of the site's dark-tech palette.
          background: "linear-gradient(135deg, #06080A 0%, #0A0D10 100%)",
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
          <div style={{ display: "flex", fontSize: 36, fontWeight: 700, color: "#E6E9EC" }}>
            Audityxe
          </div>
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 60,
            fontWeight: 700,
            color: "#E6E9EC",
            lineHeight: 1.15,
            maxWidth: 980,
          }}
        >
          Instant Site Audit &amp; Fix Report
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 28,
            color: "#98A0A6",
            marginTop: 28,
            maxWidth: 860,
          }}
        >
          Live-measured scores and a 17-area deep audit, with evidence-based fixes — for any URL.
        </div>
      </div>
    ),
    { ...size }
  );
}
