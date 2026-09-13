import type { Config } from "tailwindcss";

// Single, fixed dark-tech palette (no runtime theme switching — removed
// per product decision; this is the one, final, deliberately-chosen
// accent, matching taste-skill's "lock one accent" rule). Emerald reads
// as "verified / passing", which fits an audit product.
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
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
