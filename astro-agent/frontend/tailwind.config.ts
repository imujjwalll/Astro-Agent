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
        // Deep space palette
        cosmos: {
          50:  "#f0f0ff",
          100: "#e4e4ff",
          200: "#ccccff",
          300: "#a5a5ff",
          400: "#7b7aff",
          500: "#5b58fa",
          600: "#4640ef",
          700: "#3a33d4",
          800: "#302baa",
          900: "#2b2786",
          950: "#1a1650",
        },
        nebula: {
          50:  "#fdf4ff",
          100: "#fbe8ff",
          200: "#f7d0fe",
          300: "#f0abfc",
          400: "#e779f9",
          500: "#d946ef",
          600: "#bc26d3",
          700: "#9c1aad",
          800: "#801a8d",
          900: "#6a1972",
          950: "#47064e",
        },
        void: {
          900: "#0a0a1a",
          800: "#0d0d24",
          700: "#12122e",
          600: "#181838",
          500: "#1e1e48",
        },
      },
      fontFamily: {
        sans: ["Inter var", "Inter", "system-ui", "sans-serif"],
        display: ["Cal Sans", "Inter", "system-ui", "sans-serif"],
      },
      animation: {
        "star-float": "starFloat 6s ease-in-out infinite",
        "pulse-glow": "pulseGlow 2s ease-in-out infinite",
        "typing": "typing 1.2s ease-in-out infinite",
        "slide-up": "slideUp 0.4s ease-out forwards",
        "fade-in": "fadeIn 0.3s ease-out forwards",
        "spin-slow": "spin 8s linear infinite",
        "shimmer": "shimmer 2s linear infinite",
      },
      keyframes: {
        starFloat: {
          "0%, 100%": { transform: "translateY(0px) scale(1)", opacity: "0.7" },
          "50%":        { transform: "translateY(-8px) scale(1.1)", opacity: "1" },
        },
        pulseGlow: {
          "0%, 100%": { boxShadow: "0 0 10px rgba(91, 88, 250, 0.3)" },
          "50%":        { boxShadow: "0 0 30px rgba(91, 88, 250, 0.8)" },
        },
        typing: {
          "0%, 80%, 100%": { transform: "scale(1)", opacity: "0.4" },
          "40%":            { transform: "scale(1.4)", opacity: "1" },
        },
        slideUp: {
          from: { opacity: "0", transform: "translateY(16px)" },
          to:   { opacity: "1", transform: "translateY(0)" },
        },
        fadeIn: {
          from: { opacity: "0" },
          to:   { opacity: "1" },
        },
        shimmer: {
          "0%":   { backgroundPosition: "-200% center" },
          "100%": { backgroundPosition:  "200% center" },
        },
      },
      backgroundImage: {
        "cosmos-gradient": "radial-gradient(ellipse at top, #1a1650 0%, #0a0a1a 60%)",
        "nebula-gradient": "linear-gradient(135deg, #4640ef 0%, #d946ef 100%)",
        "card-gradient": "linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)",
        "shimmer-gradient": "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.1) 50%, transparent 100%)",
      },
      backdropBlur: {
        xs: "2px",
      },
    },
  },
  plugins: [],
};
