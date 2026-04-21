import type { Config } from "tailwindcss";

/**
 * Clay / neumorphic tokens mirror `src/index.css` `@theme` for editors and tooling.
 * Runtime utilities are generated from CSS `@theme` in index.css (Tailwind v4).
 */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        clay: {
          bg: "#FFEBF0",
          coral: "#FF6B9D",
          teal: "#4ECDC4",
          lavender: "#C78BFF",
          peach: "#FF9F6B",
          mint: "#7AE582",
          surface: "#FFFFFF",
          "surface-soft": "#FFF5F8",
        },
      },
      borderRadius: {
        clay: "1.75rem",
        "clay-sm": "1.25rem",
        "clay-lg": "2rem",
      },
      boxShadow: {
        clay: [
          "0 8px 0 rgba(214, 120, 150, 0.1)",
          "0 16px 40px rgba(180, 100, 130, 0.14)",
          "inset 0 2px 0 rgba(255, 255, 255, 0.85)",
        ].join(", "),
        "clay-sm": [
          "0 4px 0 rgba(214, 120, 150, 0.12)",
          "0 10px 28px rgba(180, 100, 130, 0.12)",
          "inset 0 1px 0 rgba(255, 255, 255, 0.9)",
        ].join(", "),
        "clay-lg": [
          "0 12px 0 rgba(214, 120, 150, 0.08)",
          "0 24px 56px rgba(180, 100, 130, 0.18)",
          "inset 0 2px 0 rgba(255, 255, 255, 0.88)",
        ].join(", "),
        "clay-inset": "inset 0 3px 8px rgba(214, 120, 150, 0.12), inset 0 -2px 6px rgba(255, 255, 255, 0.65)",
      },
      backdropBlur: {
        clay: "12px",
        "clay-soft": "8px",
      },
    },
  },
} satisfies Config;
