import type { Config } from "tailwindcss";

// Warm-editorial palette, now theme-aware: every color below resolves
// through a CSS custom property (defined in globals.css) rather than a
// fixed hex, so the exact same class names — bg-primary, text-text-
// secondary, etc. — automatically repaint for light vs dark. The
// `<alpha-value>` placeholder lets Tailwind's opacity modifiers
// (bg-primary/50) keep working since these resolve to rgb(r g b / a).
const cssVar = (name: string) => `rgb(var(--color-${name}) / <alpha-value>)`;

const config: Config = {
  darkMode: "media",
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: cssVar("bg"),
        surface: cssVar("surface"),
        surface2: cssVar("surface2"),
        border: cssVar("border"),
        primary: cssVar("primary"),
        secondary: cssVar("secondary"),
        accent: cssVar("accent"),
        emerald: cssVar("emerald"),
        rose: cssVar("rose"),
        amber: cssVar("amber"),
        "text-primary": cssVar("text-primary"),
        "text-secondary": cssVar("text-secondary"),
      },
      borderRadius: {
        card: "20px",
        btn: "10px",
        input: "10px",
      },
      fontFamily: {
        display: ["Fraunces", "ui-serif", "serif"],
        body: ["'Public Sans'", "ui-sans-serif", "system-ui", "sans-serif"],
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
export default config;
