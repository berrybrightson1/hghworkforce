import type { Config } from "tailwindcss";

export default {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        hgh: {
          navy: "#0A1628",
          "navy-light": "#1A2E4A",
          gold: "#C9A84C",
          "gold-light": "#F5E6C0",
          slate: "#2D3748",
          muted: "#6B7280",
          offwhite: "#F8F7F4",
          border: "#E2E8F0",
          success: "#0D9488",
          danger: "#DC2626",
          warning: "#C9A84C",
        },
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)"],
        mono: ["var(--font-geist-mono)"],
      },
      keyframes: {
        "toast-in": {
          "0%": { opacity: "0", transform: "translateX(120%) scale(0.96)" },
          "100%": { opacity: "1", transform: "translateX(0) scale(1)" },
        },
        "toast-progress": {
          "0%": { width: "100%" },
          "100%": { width: "0%" },
        },
        "in": {
          "0%": { opacity: "0", transform: "scale(0.97) translateY(-4px)" },
          "100%": { opacity: "1", transform: "scale(1) translateY(0)" },
        },
        marquee: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
        /** Simple digit tick — 2D fade + tiny nudge (dashboard clock). */
        "flip-digit": {
          "0%": { opacity: "0.25", transform: "translateY(0.1em) scale(0.92)" },
          "100%": { opacity: "1", transform: "translateY(0) scale(1)" },
        },
      },
      animation: {
        "toast-in": "toast-in 0.45s cubic-bezier(0.34, 1.56, 0.64, 1) both",
        "toast-progress": "toast-progress 4s linear forwards",
        "in": "in 0.2s ease-out both",
        marquee: "marquee 42s linear infinite",
        "flip-digit": "flip-digit 0.18s ease-out both",
      },
    },
  },
  plugins: [],
} satisfies Config;
