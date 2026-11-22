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
        navy: {
          800: '#0f172a',
          850: '#0b1120',
          900: '#060a12',
          950: '#030712',
        },
        slate: {
          750: '#293548',
          850: '#151f30',
        },
        accent: {
          cyan: '#06b6d4',
          blue: '#3b82f6',
          amber: '#f59e0b',
          red: '#ef4444'
        }
      },
      animation: {
        'pulse-fast': 'pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'ping-slow': 'ping 2s cubic-bezier(0, 0, 0.2, 1) infinite',
        'alert-border': 'alertBorderPulse 1.2s ease-in-out infinite',
      },
      keyframes: {
        alertBorderPulse: {
          '0%, 100%': { boxShadow: '0 0 15px rgba(6, 182, 212, 0.4), inset 0 0 10px rgba(6, 182, 212, 0.2)' },
          '50%': { boxShadow: '0 0 30px rgba(6, 182, 212, 0.8), inset 0 0 20px rgba(6, 182, 212, 0.4)' },
        }
      }
    },
  },
  plugins: [],
}
