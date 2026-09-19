/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#f8fafc', // Very light cool-gray
        surface: '#ffffff', // Clean white
        surfaceHover: '#f1f5f9',
        border: '#e2e8f0', // Light gray borders
        primary: '#1e3a8a', // Deep Navy
        primaryHover: '#1e40af',
        danger: '#ef4444', // Red
        dangerHover: '#dc2626',
        warning: '#f59e0b', // Amber
        success: '#10b981', // Green
        info: '#0ea5e9', // Light Blue/Cyan
        text: '#0f172a', // Dark Navy for text
        textMuted: '#64748b'
      },
      boxShadow: {
        'soft': '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)',
        'premium': '0 10px 15px -3px rgba(0, 0, 0, 0.05), 0 4px 6px -2px rgba(0, 0, 0, 0.025)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' }
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        }
      }
    },
  },
  plugins: [],
}
