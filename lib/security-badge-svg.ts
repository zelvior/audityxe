const THEME = {
  bg: "#0B0C11",
  bgTop: "#101219",
  border: "#1D1E27",
  text: "#E4E5F0",
  textSecondary: "#9A9AA9",
  emerald: "#10B981",
  amber: "#F59E0B",
  rose: "#F43F5E",
};

function escapeXml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** A+/A/A- → green, B± → amber, everything else → rose. Same three-tier
 * bucket SSL Labs and MDN Observatory both effectively use. */
function gradeColor(grade: string): string {
  const letter = grade.trim().charAt(0).toUpperCase();
  if (letter === "A") return THEME.emerald;
  if (letter === "B") return THEME.amber;
  return THEME.rose;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

/**
 * Internal canvas is rendered at 4x the CSS display size (a 300×90
 * display badge is drawn on a 1200×360 canvas, same technique as a
 * "@4x" bitmap asset) purely so that any consumer which rasterizes
 * this SVG — a screenshot tool, an old WebKit build, an email client's
 * image proxy, Vercel/GitHub's own README image cache — samples it at
 * a resolution that holds up at high DPI instead of the soft, faintly
 * blurry look a 1x-only SVG can get once something else rasterizes it.
 * Native SVG rendering in a modern browser is resolution-independent
 * either way, so this costs nothing there and only helps elsewhere.
 */
const SCALE = 4;
const BASE_W = 300;
const BASE_H = 90;

export function gradeBadgeSvg(params: {
  label: string; // "Qualys SSL Labs" / "MDN HTTP Observatory"
  grade: string;
  subLabel?: string; // e.g. "Score: 105/100" — optional secondary rank/score line
  endpoints?: { ip: string; grade: string }[]; // per-server breakdown, shown as a third line when present
  checkedAt: string;
}): string {
  const { label, grade, subLabel, endpoints, checkedAt } = params;
  const color = gradeColor(grade);
  const dateLabel = escapeXml(formatDate(checkedAt));
  const w = BASE_W * SCALE;
  const h = BASE_H * SCALE;
  const cx = 42 * SCALE;
  const cy = h / 2;
  const r = 24 * SCALE;

  const endpointsLine =
    endpoints && endpoints.length > 1
      ? endpoints.map((e) => `${escapeXml(e.ip)}: ${escapeXml(e.grade)}`).join("  ·  ")
      : null;

  // Stack whichever text lines actually exist (label always; sublabel
  // and endpoints only when provided) evenly around vertical center,
  // rather than hand-picked offsets per combination — that's what
  // produced uneven gaps between lines when only some were present.
  const lineHeight = 16 * SCALE;
  const lines: { text: string; size: number; color: string }[] = [{ text: label, size: 13 * SCALE, color: THEME.text }];
  if (subLabel) lines.push({ text: subLabel, size: 11 * SCALE, color: THEME.textSecondary });
  if (endpointsLine) lines.push({ text: endpointsLine, size: 9.5 * SCALE, color: THEME.textSecondary });
  lines.push({ text: `Checked ${dateLabel}`, size: 10 * SCALE, color: THEME.textSecondary });
  const blockTop = cy - ((lines.length - 1) * lineHeight) / 2;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${BASE_W}" height="${BASE_H}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${escapeXml(label)}: grade ${escapeXml(grade)}, checked ${dateLabel}">
  <defs>
    <linearGradient id="bgGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${THEME.bgTop}"/>
      <stop offset="100%" stop-color="${THEME.bg}"/>
    </linearGradient>
    <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="${1 * SCALE}" stdDeviation="${2 * SCALE}" flood-color="#000" flood-opacity="0.35"/>
    </filter>
  </defs>
  <rect x="${1 * SCALE}" y="${1 * SCALE}" width="${w - 2 * SCALE}" height="${h - 2 * SCALE}" rx="${10 * SCALE}" fill="url(#bgGrad)" stroke="${THEME.border}" stroke-width="${SCALE}"/>
  <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${THEME.border}" stroke-width="${3 * SCALE}"/>
  <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${color}" stroke-width="${3 * SCALE}" stroke-linecap="round" filter="url(#softShadow)"/>
  <text x="${cx}" y="${cy + 7 * SCALE}" text-anchor="middle" font-family="Manrope, Arial, sans-serif" font-size="${16 * SCALE}" font-weight="800" fill="${color}">${escapeXml(grade)}</text>
  ${lines
    .map(
      (line, i) =>
        `<text x="${80 * SCALE}" y="${blockTop + i * lineHeight}" font-family="Manrope, Arial, sans-serif" font-size="${line.size}" font-weight="${i === 0 ? 700 : 400}" fill="${line.color}">${escapeXml(line.text)}</text>`
    )
    .join("\n  ")}
</svg>`;
}

export function pendingBadgeSvg(label: string): string {
  const w = BASE_W * SCALE;
  const h = BASE_H * SCALE;
  const cy = h / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${BASE_W}" height="${BASE_H}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${escapeXml(label)}: scan pending">
  <rect x="${1 * SCALE}" y="${1 * SCALE}" width="${w - 2 * SCALE}" height="${h - 2 * SCALE}" rx="${10 * SCALE}" fill="${THEME.bg}" stroke="${THEME.border}" stroke-width="${SCALE}"/>
  <circle cx="${42 * SCALE}" cy="${cy}" r="${24 * SCALE}" fill="none" stroke="${THEME.textSecondary}" stroke-width="${2.5 * SCALE}" stroke-dasharray="${4 * SCALE} ${4 * SCALE}"/>
  <text x="${42 * SCALE}" y="${cy + 5 * SCALE}" text-anchor="middle" font-family="Manrope, Arial, sans-serif" font-size="${12 * SCALE}" font-weight="700" fill="${THEME.textSecondary}">?</text>
  <text x="${80 * SCALE}" y="${cy - 6 * SCALE}" font-family="Manrope, Arial, sans-serif" font-size="${13 * SCALE}" font-weight="700" fill="${THEME.text}">${escapeXml(label)}</text>
  <text x="${80 * SCALE}" y="${cy + 12 * SCALE}" font-family="Manrope, Arial, sans-serif" font-size="${10 * SCALE}" fill="${THEME.textSecondary}">First scan pending</text>
</svg>`;
}
