import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Dark-tech palette, single locked accent (emerald — reads as
        // "verified / passing" for an audit product instead of the
        // generic AI-purple gradient family). Every brand-accent
        // reference in the app (primary/secondary/accent) now resolves
        // to a shade of this one hue; rose/amber stay reserved purely
        // as semantic fail/warn score colors, never as UI chrome.
        bg: "#06080A",
        surface: "#0A0D10",
        surface2: "#0F1317",
        border: "#1B2027",
        primary: "#4ADE80",
        secondary: "#0E7A52",
        accent: "#22C55E",
        emerald: "#10B981",
        rose: "#F43F5E",
        amber: "#F59E0B",
        "text-primary": "#E6E9EC",
        "text-secondary": "#98A0A6",
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
export default config;
