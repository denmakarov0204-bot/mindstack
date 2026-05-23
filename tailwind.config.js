/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: '#0a0a0b',
        surface: '#111113',
        surface2: '#18181c',
        accent: '#7c6aff',
        accent2: '#a78bfa',
        'c-green': '#22d3a0',
        'c-red': '#ff5566',
        'c-orange': '#f59e0b',
        'c-blue': '#38bdf8',
        muted: '#6b6b78',
        border: 'rgba(255,255,255,0.07)',
        border2: 'rgba(255,255,255,0.12)',
      },
      fontFamily: {
        sans: ['var(--font-syne)', 'sans-serif'],
        mono: ['var(--font-jetbrains)', 'monospace'],
      },
    },
  },
  plugins: [],
}
