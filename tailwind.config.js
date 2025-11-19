/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
      },
      colors: {
        // Classic Earthy Palette
        cream: {
          50: '#FEFEFD',
          100: '#F5F5F0',
          200: '#E8E8E0',
          300: '#D9D9D0',
        },
        beige: {
          50: '#F5F2ED',
          100: '#E6D8C3',
          200: '#D4C4A8',
          300: '#C2A68C',
        },
        tan: {
          50: '#E8DDD4',
          100: '#C2A68C',
          200: '#A68B6F',
          300: '#8B6F52',
        },
        sage: {
          50: '#E8EDEA',
          100: '#B8C9BE',
          200: '#8BA896',
          300: '#5D866C',
          400: '#4A6B57',
          500: '#3A5543',
          600: '#2D4235',
          700: '#1F2E25',
          800: '#141B17',
          900: '#0A0E0B',
        },
        primary: {
          50: '#E8EDEA',
          100: '#B8C9BE',
          200: '#8BA896',
          300: '#5D866C',
          400: '#4A6B57',
          500: '#3A5543',
          600: '#2D4235',
          700: '#1F2E25',
          800: '#141B17',
          900: '#0A0E0B',
        },
        success: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
        },
        warning: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
        },
        danger: {
          50: '#fef2f2',
          100: '#fee2e2',
          200: '#fecaca',
          300: '#fca5a5',
          400: '#f87171',
          500: '#ef4444',
          600: '#dc2626',
          700: '#b91c1c',
          800: '#991b1b',
          900: '#7f1d1d',
        },
        confidence: {
          high: '#22c55e',
          medium: '#f59e0b', 
          low: '#ef4444',
        }
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}