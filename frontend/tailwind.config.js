/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        indigo: {
          50: '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5', // Primary Royal Indigo
          700: '#4338ca',
          800: '#3730a3',
          900: '#312e81',
        },
        cyan: {
          500: '#06b6d4',
          600: '#0891b2',
        },
        emerald: {
          500: '#10b981',
          600: '#059669',
        },
        slate: {
          main: '#f8fafc',
          card: '#ffffff',
          dark: '#0f172a',
          muted: '#64748b',
          border: '#e2e8f0',
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      borderRadius: {
        'sm': '0.25rem',  // 4px
        'md': '0.375rem', // 6px
        'lg': '0.5rem',   // 8px  (Reduced Radius)
        'xl': '0.75rem',  // 12px (Reduced Radius)
        '2xl': '1rem',    // 16px (Reduced Radius)
      }
    },
  },
  plugins: [],
}
