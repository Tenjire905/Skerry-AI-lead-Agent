/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}"],
  theme: {
    extend: {
      colors: {
        ink: {
          900: "#06030d",
          800: "#0d0817",
          700: "#140c22",
          600: "#1c112e",
        },
        // Skerry brand — violet/lavender, drawn from the icon.
        brand: {
          50: "#f5f3ff",
          100: "#ede9fe",
          200: "#ddd6fe",
          300: "#c4b5fd",
          400: "#a78bfa",
          500: "#8b5cf6",
          600: "#7c3aed",
          700: "#6d28d9",
        },
      },
      fontFamily: {
        sans: [
          "Inter",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
        display: [
          "Inter",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "sans-serif",
        ],
      },
      backgroundImage: {
        "brand-gradient":
          "linear-gradient(135deg, #8b5cf6 0%, #a78bfa 50%, #c4b5fd 100%)",
        "brand-radial":
          "radial-gradient(circle at top right, rgba(167,139,250,0.22), transparent 60%)",
      },
      boxShadow: {
        glow: "0 0 64px -16px rgba(167,139,250,0.5)",
      },
    },
  },
  plugins: [],
};
