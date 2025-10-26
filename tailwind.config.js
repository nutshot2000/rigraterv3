/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './App.tsx',
    './components/**/*.{ts,tsx}',
    './pages/**/*.{ts,tsx}',
    './context/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      maxWidth: {
        'intermediate': '960px',
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}


