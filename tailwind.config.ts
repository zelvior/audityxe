import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#050609",
        surface: "#0B0C11",
        surface2: "#111219",
        border: "#1D1E27",
        primary: "#A7ABCE",
        secondary: "#503E70",
        accent: "#8F6EAF",
        emerald: "#10B981",
        rose: "#F43F5E",
        amber: "#F59E0B",
        "text-primary": "#E4E5F0",
        "text-secondary": "#9A9AA9",
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
