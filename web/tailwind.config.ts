import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        page: "#e8ebe5",
        card: "#ffffff",
        "card-off": "#f4f5f1",
        lime: "#cce832",
        "lime-bg": "#e9f5a0",
        "lime-dark": "#4e5f0e",
        ink: "#18191a",
        "ink-2": "#5a5f57",
        "ink-3": "#97a094",
        dark: "#1a1e16",
        "dark-2": "#262c20",
        border: "rgba(24,25,26,0.08)",
      },
      fontFamily: {
        sans: ["DM Sans", "sans-serif"],
        mono: ["DM Mono", "monospace"],
      },
      borderRadius: {
        card: "22px",
        pill: "50px",
      },
      borderWidth: {
        "0.5": "0.5px",
      },
      fontSize: {
        "2xs": "11px",
      },
      letterSpacing: {
        tight2: "-0.4px",
        tight3: "-1.5px",
      },
      animation: {
        "fade-up": "fadeUp 0.4s ease forwards",
        "fade-in": "fadeIn 0.3s ease forwards",
        "slide-right": "slideRight 0.4s cubic-bezier(0.32,0.72,0,1) forwards",
        "slide-left": "slideLeft 0.4s cubic-bezier(0.32,0.72,0,1) forwards",
        pulse2: "pulse2 2s cubic-bezier(0.4,0,0.6,1) infinite",
      },
      keyframes: {
        fadeUp: {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideRight: {
          "0%": { opacity: "0", transform: "translateX(-24px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        slideLeft: {
          "0%": { opacity: "0", transform: "translateX(24px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        pulse2: {
          "0%,100%": { opacity: "1" },
          "50%": { opacity: "0.4" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
