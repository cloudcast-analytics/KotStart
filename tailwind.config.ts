import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Bricolage Grotesque"', 'system-ui', 'sans-serif'],
      },
      colors: {
        accent: { DEFAULT: '#6366f1', dark: '#4f46e5' },
        'start-green': '#16a34a',
        'renew-blue': '#3b82f6',
        'end-purple': '#9333ea',
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
} satisfies Config
