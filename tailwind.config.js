/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'ecos-bg': '#0f0f13',
        'glass': 'rgba(255, 255, 255, 0.05)',
        'glass-border': 'rgba(255, 255, 255, 0.1)',
        'neon-blue': '#00f3ff',
        'neon-purple': '#bc13fe',
        'neon-red': '#ff2a2a',
        'neon-green': '#00ff9d',
        'text-main': '#e0e0e0',
        'text-muted': '#888',
      },
      fontFamily: {
        rajdhani: ['Rajdhani', 'sans-serif'],
        inter: ['Inter', 'sans-serif'],
      }
    },
  },
  plugins: [
    require("tailwindcss-animate")
  ],
}