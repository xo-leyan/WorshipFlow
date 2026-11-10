/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: { 950: '#0b0d17', 900: '#10131f', 800: '#171b2b', 700: '#1f2438', 600: '#2a3049' },
        charcoal: '#1b1c22',
        accent: { DEFAULT: '#8b5cf6', soft: '#a78bfa', deep: '#6d3fe0' },
      },
      fontFamily: { sans: ['"Segoe UI"', 'system-ui', '-apple-system', 'Roboto', 'sans-serif'] },
    },
  },
  plugins: [],
}
