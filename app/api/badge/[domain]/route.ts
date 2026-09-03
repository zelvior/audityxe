import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

// Loose hostname shape check — this never fetches the domain, only
// renders it as text into an SVG, so this is XSS/injection hardening,
// not a security boundary the way URL validation elsewhere in the app is.
const HOSTNAME_RE = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$/i;

function escapeXml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

const THEME = {
  bg: "#0B0C11",
  border: "#1D1E27",
  text: "#E4E5F0",
  textSecondary: "#9A9AA9",
  accent: "#8F6EAF",
};

function badgeSvg(domain: string): string {
  const safeDomain = escapeXml(domain.length > 40 ? domain.slice(0, 37) + "…" : domain);
  const w = 320;
  const h = 84;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="Audited by Audityxe — ${safeDomain}">
  <rect x="0.5" y="0.5" width="${w - 1}" height="${h - 1}" rx="10" fill="${THEME.bg}" stroke="${THEME.border}" stroke-width="1"/>
  <circle cx="42" cy="${h / 2}" r="18" fill="none" stroke="${THEME.accent}" stroke-width="2.5"/>
  <path d="M34 ${h / 2} l6 6 l12 -13" fill="none" stroke="${THEME.accent}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
  <text x="72" y="${h / 2 - 6}" font-family="Manrope, Arial, sans-serif" font-size="14" font-weight="700" fill="${THEME.text}">Audited by Audityxe</text>
  <text x="72" y="${h / 2 + 15}" font-family="Manrope, Arial, sans-serif" font-size="12" fill="${THEME.textSecondary}">${safeDomain}</text>
</svg>`;
}

export async function GET(req: NextRequest, { params }: { params: { domain: string } }) {
  const raw = decodeURIComponent(params.domain || "").trim().toLowerCase();
  const domain = raw.replace(/^https?:\/\//, "").replace(/\/.*$/, "");

  if (!domain || !HOSTNAME_RE.test(domain) || domain.length > 253) {
    return NextResponse.json({ error: "Invalid domain." }, { status: 400 });
  }

  return new NextResponse(badgeSvg(domain), {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "public, max-age=86400, s-maxage=86400",
    },
  });
}
