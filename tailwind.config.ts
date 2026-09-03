import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#0A0A0A",
        surface: "#151517",
        surface2: "#1D1D20",
        border: "#2A2A2E",
        primary: "#6366F1",
        accent: "#8B5CF6",
        emerald: "#10B981",
        rose: "#F43F5E",
        amber: "#F59E0B",
        "text-primary": "#F4F4F5",
        "text-secondary": "#9A9AA2",
      },
      fontFamily: {
        display: ["Manrope", "ui-sans-serif", "sans-serif"],
        body: ["ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "monospace"],
      },
      boxShadow: {
        glow: "0 0 40px -8px rgba(99,102,241,0.45)",
        glowViolet: "0 0 40px -8px rgba(139,92,246,0.45)",
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
