import type { Config } from "tailwindcss";

// Single, fixed warm-editorial palette (no runtime theme switching —
// removed per product decision; this is the one, final, deliberately-
// chosen accent, matching taste-skill's "lock one accent" rule). Rust
// reads as considered and human — deliberately not the purple/green
// "AI SaaS" gradient look.
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#FBF7EF",
        surface: "#FFFFFF",
        surface2: "#F1E9D8",
        border: "#E3D6BE",
        primary: "#B5460A",
        secondary: "#8C3703",
        accent: "#B5460A",
        emerald: "#3F7D5C",
        rose: "#B23A2E",
        amber: "#A8720A",
        "text-primary": "#201B14",
        "text-secondary": "#6E6252",
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
