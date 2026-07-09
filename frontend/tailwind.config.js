/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        panel: "#0d1117",
        surface: "#161b22",
        edge: "#232b36",
        good: "#22c55e",
        moderate: "#eab308",
        critical: "#ef4444",
        accent: "#38bdf8",
      },
      boxShadow: {
        glow: "0 0 20px rgba(56, 189, 248, 0.35)",
      },
    },
  },
  plugins: [],
};
