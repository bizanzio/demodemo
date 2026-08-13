const colors = require("tailwindcss/colors");

export default {
  safelist: ["bg-green-500", "bg-red-500", "bg-yellow-500"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ...colors,
        // Variables del sistema
        background: "var(--background)",
        foreground: "var(--foreground)",

        // Colores de la marca Viladomat
        "vl-black": "var(--vl-black)",
        "vl-white": "var(--vl-white)",
        "vl-gray": "var(--vl-gray)",
        "vl-blue": "var(--vl-blue)",

        // Alias para facilitar el uso
        black: "var(--vl-black)",
        white: "var(--vl-white)",
        blue: "var(--vl-blue)",
        "gray-50": "var(--vl-gray)",
      },
      fontFamily: {
        sans: ["var(--font-marsden)", "ui-sans-serif", "system-ui"],
        inter: ["var(--font-inter)", "ui-sans-serif", "system-ui"],
        marsden: ["var(--font-marsden)", "ui-sans-serif", "system-ui"],
      },
      animation: {
        fadeIn: "fadeIn 0.3s ease-in-out",
        fadeInUp: "fadeInUp 0.3s ease-in-out",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        fadeInUp: {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};
