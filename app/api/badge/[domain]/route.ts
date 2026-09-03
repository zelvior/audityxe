import { NextRequest, NextResponse } from "next/server";
import { getLastAuditScore } from "@/lib/badge-store";

export const runtime = "nodejs"; // needs the Firebase Admin SDK, not edge-compatible

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
  emerald: "#10B981",
  amber: "#F59E0B",
  rose: "#F43F5E",
};

function scoreColor(score: number): string {
  if (score >= 8) return THEME.emerald;
  if (score >= 5) return THEME.amber;
  return THEME.rose;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

/** Unscored badge — domain has never been audited yet. Still a working
 * embed with a CTA, so the badge is usable before the first audit runs. */
function unscoredBadgeSvg(domain: string): string {
  const safeDomain = escapeXml(domain.length > 34 ? domain.slice(0, 31) + "…" : domain);
  const w = 340;
  const h = 100;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="Audit ${safeDomain} with Audityxe">
  <rect x="0.5" y="0.5" width="${w - 1}" height="${h - 1}" rx="10" fill="${THEME.bg}" stroke="${THEME.border}" stroke-width="1"/>
  <circle cx="46" cy="${h / 2}" r="20" fill="none" stroke="${THEME.accent}" stroke-width="2.5" stroke-dasharray="4 4"/>
  <text x="46" y="${h / 2 + 5}" text-anchor="middle" font-family="Manrope, Arial, sans-serif" font-size="11" font-weight="700" fill="${THEME.textSecondary}">?</text>
  <text x="82" y="${h / 2 - 12}" font-family="Manrope, Arial, sans-serif" font-size="14" font-weight="700" fill="${THEME.text}">Not yet audited</text>
  <text x="82" y="${h / 2 + 8}" font-family="Manrope, Arial, sans-serif" font-size="12" fill="${THEME.textSecondary}">${safeDomain}</text>
  <text x="82" y="${h / 2 + 26}" font-family="Manrope, Arial, sans-serif" font-size="11" font-weight="700" fill="${THEME.accent}">Run a free audit on Audityxe →</text>
</svg>`;
}

function scoredBadgeSvg(domain: string, overall: number, auditedAt: string): string {
  const safeDomain = escapeXml(domain.length > 34 ? domain.slice(0, 31) + "…" : domain);
  const color = scoreColor(overall);
  const dateLabel = escapeXml(formatDate(auditedAt));
  const w = 340;
  const h = 100;
  const cx = 46;
  const cy = h / 2;
  const r = 22;
  const circumference = 2 * Math.PI * r;
  const filled = Math.max(0, Math.min(1, overall / 10)) * circumference;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="Audityxe audit for ${safeDomain}: ${overall.toFixed(1)} out of 10, audited ${dateLabel}">
  <rect x="0.5" y="0.5" width="${w - 1}" height="${h - 1}" rx="10" fill="${THEME.bg}" stroke="${THEME.border}" stroke-width="1"/>

  <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${THEME.border}" stroke-width="4"/>
  <circle
    cx="${cx}" cy="${cy}" r="${r}"
    fill="none" stroke="${color}" stroke-width="4" stroke-linecap="round"
    stroke-dasharray="${filled.toFixed(1)} ${circumference.toFixed(1)}"
    transform="rotate(-90 ${cx} ${cy})"
  />
  <text x="${cx}" y="${cy + 5}" text-anchor="middle" font-family="Manrope, Arial, sans-serif" font-size="13" font-weight="700" fill="${THEME.text}">${overall.toFixed(1)}</text>

  <text x="82" y="${cy - 18}" font-family="Manrope, Arial, sans-serif" font-size="14" font-weight="700" fill="${THEME.text}">Audited by Audityxe</text>
  <text x="82" y="${cy - 2}" font-family="Manrope, Arial, sans-serif" font-size="12" fill="${THEME.textSecondary}">${safeDomain} · scored ${overall.toFixed(1)}/10</text>
  <text x="82" y="${cy + 16}" font-family="Manrope, Arial, sans-serif" font-size="10" fill="${THEME.textSecondary}">Last audited ${dateLabel}</text>
  <text x="82" y="${cy + 32}" font-family="Manrope, Arial, sans-serif" font-size="11" font-weight="700" fill="${THEME.accent}">Verify this score →</text>
</svg>`;
}

export async function GET(req: NextRequest, { params }: { params: { domain: string } }) {
  const raw = decodeURIComponent(params.domain || "").trim().toLowerCase();
  const domain = raw.replace(/^https?:\/\//, "").replace(/\/.*$/, "");

  if (!domain || !HOSTNAME_RE.test(domain) || domain.length > 253) {
    return NextResponse.json({ error: "Invalid domain." }, { status: 400 });
  }

  const record = await getLastAuditScore(domain);
  const svg = record
    ? scoredBadgeSvg(domain, record.overall, record.auditedAt)
    : unscoredBadgeSvg(domain);

  return new NextResponse(svg, {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      // Short cache: the badge should reflect a fresh re-audit reasonably
      // quickly, not be stuck on a stale score for a full day.
      "Cache-Control": "public, max-age=1800, s-maxage=1800",
    },
  });
}
