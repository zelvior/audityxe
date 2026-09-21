const THEME = {
  bg: "#0B0C11",
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

export function gradeBadgeSvg(params: {
  label: string; // "Qualys SSL Labs" / "MDN HTTP Observatory"
  grade: string;
  subLabel?: string; // e.g. "Score: 105/100" — optional secondary rank/score line
  checkedAt: string;
}): string {
  const { label, grade, subLabel, checkedAt } = params;
  const color = gradeColor(grade);
  const dateLabel = escapeXml(formatDate(checkedAt));
  const w = 300;
  const h = 90;
  const cx = 42;
  const cy = h / 2;
  const r = 24;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${escapeXml(label)}: grade ${escapeXml(grade)}, checked ${dateLabel}">
  <rect x="0.5" y="0.5" width="${w - 1}" height="${h - 1}" rx="10" fill="${THEME.bg}" stroke="${THEME.border}" stroke-width="1"/>
  <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${color}" stroke-width="3"/>
  <text x="${cx}" y="${cy + 6}" text-anchor="middle" font-family="Manrope, Arial, sans-serif" font-size="16" font-weight="800" fill="${color}">${escapeXml(grade)}</text>
  <text x="80" y="${cy - 14}" font-family="Manrope, Arial, sans-serif" font-size="13" font-weight="700" fill="${THEME.text}">${escapeXml(label)}</text>
  ${subLabel ? `<text x="80" y="${cy + 3}" font-family="Manrope, Arial, sans-serif" font-size="11" fill="${THEME.textSecondary}">${escapeXml(subLabel)}</text>` : ""}
  <text x="80" y="${cy + (subLabel ? 20 : 12)}" font-family="Manrope, Arial, sans-serif" font-size="10" fill="${THEME.textSecondary}">Checked ${dateLabel}</text>
</svg>`;
}

export function pendingBadgeSvg(label: string): string {
  const w = 300;
  const h = 90;
  const cy = h / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${escapeXml(label)}: scan pending">
  <rect x="0.5" y="0.5" width="${w - 1}" height="${h - 1}" rx="10" fill="${THEME.bg}" stroke="${THEME.border}" stroke-width="1"/>
  <circle cx="42" cy="${cy}" r="24" fill="none" stroke="${THEME.textSecondary}" stroke-width="2.5" stroke-dasharray="4 4"/>
  <text x="42" y="${cy + 5}" text-anchor="middle" font-family="Manrope, Arial, sans-serif" font-size="12" font-weight="700" fill="${THEME.textSecondary}">?</text>
  <text x="80" y="${cy - 6}" font-family="Manrope, Arial, sans-serif" font-size="13" font-weight="700" fill="${THEME.text}">${escapeXml(label)}</text>
  <text x="80" y="${cy + 12}" font-family="Manrope, Arial, sans-serif" font-size="10" fill="${THEME.textSecondary}">First scan pending</text>
</svg>`;
}
