/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        background: "#05070d",
        surface: "#0a0f1d",
        card: "#0f1629",
        "card-hover": "#141e38",
        cyan: {
          400: "#22d3ee",
          500: "#06b6d4",
          bright: "#00f2fe",
        },
        teal: {
          400: "#2dd4bf",
          500: "#14b8a6",
        },
        emerald: {
          400: "#34d399",
          500: "#10b981",
        },
        amber: {
          400: "#fbbf24",
          500: "#f59e0b",
        },
        rose: {
          400: "#fb7185",
          500: "#f43f5e",
        },
      },
      fontFamily: {
        sans: ["Inter", "-apple-system", "BlinkMacSystemFont", "sans-serif"],
        heading: ["Outfit", "Inter", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      boxShadow: {
        "cyan-glow": "0 0 25px -5px rgba(0, 242, 254, 0.25)",
        "red-glow": "0 0 25px -5px rgba(239, 68, 68, 0.35)",
        "emerald-glow": "0 0 25px -5px rgba(16, 185, 129, 0.25)",
        "glass-edge": "inset 0 1px 1px 0 rgba(255, 255, 255, 0.1)",
      },
      animation: {
        "pulse-slow": "pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "spin-slow": "spin 20s linear infinite",
      }
    },
  },
  plugins: [],
}
