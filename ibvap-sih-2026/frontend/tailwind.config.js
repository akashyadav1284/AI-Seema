/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#040508', // deep almost-black base
        surface: 'rgba(20, 24, 38, 0.6)', // Glassmorphism surface
        surfaceHover: 'rgba(35, 40, 60, 0.8)',
        border: 'rgba(59, 130, 246, 0.2)', // Slight blue tint for borders
        primary: '#3b82f6', // Vibrant blue
        primaryHover: '#60a5fa',
        danger: '#f43f5e', // Vibrant rose/red
        dangerHover: '#fb7185',
        warning: '#f59e0b', // Amber
        success: '#10b981', // Emerald
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'cyber-grid': 'linear-gradient(rgba(59, 130, 246, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(59, 130, 246, 0.1) 1px, transparent 1px)',
      },
      backgroundSize: {
        'cyber-grid': '40px 40px',
      },
      animation: {
        'scanline': 'scanline 8s linear infinite',
        'pulse-glow': 'pulse-glow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        scanline: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100vh)' }
        },
        'pulse-glow': {
          '0%, 100%': { opacity: '1', boxShadow: '0 0 20px rgba(59, 130, 246, 0.5)' },
          '50%': { opacity: '.5', boxShadow: '0 0 10px rgba(59, 130, 246, 0.2)' },
        }
      }
    },
  },
  plugins: [],
}
