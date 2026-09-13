import type { Config } from "tailwindcss";

// Every token below resolves through a CSS custom property (defined per
// theme in app/globals.css, driven by the [data-theme] attribute the
// ThemeProvider sets on <html>) rather than a fixed hex, so the whole
// palette can be swapped at runtime by the theme switcher without
// touching a single component or rebuilding the app. Values are stored
// as "R G B" triplets in CSS so the alpha channel still works (e.g.
// bg-primary/30) exactly like a normal Tailwind color would.
function withOpacity(cssVar: string) {
  return ({ opacityValue }: { opacityValue?: string }) =>
    opacityValue !== undefined ? `rgba(var(${cssVar}), ${opacityValue})` : `rgb(var(${cssVar}))`;
}

const config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Semantic rose/amber stay reserved purely for fail/warn score
        // colors, never as UI chrome — every theme keeps that meaning
        // even though its own accent hue changes.
        bg: withOpacity("--color-bg"),
        surface: withOpacity("--color-surface"),
        surface2: withOpacity("--color-surface2"),
        border: withOpacity("--color-border"),
        primary: withOpacity("--color-primary"),
        secondary: withOpacity("--color-secondary"),
        accent: withOpacity("--color-accent"),
        emerald: withOpacity("--color-emerald"),
        rose: withOpacity("--color-rose"),
        amber: withOpacity("--color-amber"),
        "text-primary": withOpacity("--color-text-primary"),
        "text-secondary": withOpacity("--color-text-secondary"),
      },
      borderRadius: {
        card: "16px",
        btn: "10px",
        input: "10px",
      },
      fontFamily: {
        display: ["'Plus Jakarta Sans'", "Manrope", "ui-sans-serif", "sans-serif"],
        body: ["ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "monospace"],
      },
      boxShadow: {
        glow: "0 1px 2px rgba(0,0,0,0.4)",
        glowViolet: "0 1px 3px rgba(0,0,0,0.5)",
        card: "0 8px 24px rgba(0,0,0,0.35)",
      },
      keyframes: {
        scan: {
          "0%": { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(100%)" },
        },
        pulseSlow: {
          "0%,100%": { opacity: "0.5" },
          "50%": { opacity: "1" },
        },
      },
      animation: {
        scan: "scan 2.2s linear infinite",
        pulseSlow: "pulseSlow 2.4s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

// Tailwind's own Config["theme"]["extend"]["colors"] type only accepts
// string | RecursiveKeyValuePair<string,string>, not the function form
// the withOpacity() pattern needs at runtime (this is Tailwind's own
// documented CSS-variable-with-alpha pattern — it works at build time;
// the shipped type declarations are just stricter than the JS API
// actually accepts). Casting the fully-built object avoids sprinkling
// `any` through the rest of the otherwise normally-typed config above.
export default config as unknown as Config;
