export interface ThemeDef {
  id: string;
  label: string;
  /** Swatch shown in the switcher — [bg, primary accent]. */
  swatch: [string, string];
}

// Keep in sync with the [data-theme="..."] blocks in app/globals.css —
// each id here must have a matching CSS-variable set there.
export const THEMES: ThemeDef[] = [
  { id: "dark-tech", label: "Dark Tech", swatch: ["#06080A", "#4ADE80"] },
  { id: "electric-blue", label: "Electric Blue", swatch: ["#06080C", "#60A5FA"] },
  { id: "amber-signal", label: "Amber Signal", swatch: ["#0A0805", "#FBBF24"] },
  { id: "crimson-alert", label: "Crimson Alert", swatch: ["#0A0607", "#FB7185"] },
  { id: "monochrome", label: "Monochrome", swatch: ["#080809", "#E4E4E7"] },
  { id: "paper-light", label: "Paper (Light)", swatch: ["#FAFAF9", "#057A54"] },
];

export const DEFAULT_THEME = "dark-tech";
// Site-wide theme is admin-controlled only (see lib/site-theme.ts +
// app/admin/page.tsx's Theme tab) — there is no per-user override, so
// no client storage key is needed here anymore.

export function isValidTheme(id: string | null | undefined): id is string {
  return !!id && THEMES.some((t) => t.id === id);
}
