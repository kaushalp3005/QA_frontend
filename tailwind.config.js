/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
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
        // ── New brand palette (Candor Foods) ──────────────────────────────
        // Brand red:   #A41F13
        // Cream bg:    #FAF5F1
        // Soft gray:   #E0DBD8
        // Dark navy:   #292F36
        //
        // Existing pages use the legacy token names (sage / cream / tan / beige).
        // We remap those tokens to the new palette so the whole app updates without
        // page-by-page edits. Mid-range "sage" is the brand red; deep "sage" stays
        // dark navy so text remains readable.

        brand: {
          50: '#FBEEEB',
          100: '#F4D6D0',
          200: '#E5A89E',
          300: '#D17668',
          400: '#BC4A3A',
          500: '#A41F13',
          600: '#83180F',
          700: '#62120B',
          800: '#410C08',
          900: '#210604',
        },
        ink: {
          50:  'rgb(var(--c-ink-50) / <alpha-value>)',
          100: 'rgb(var(--c-ink-100) / <alpha-value>)',
          200: 'rgb(var(--c-ink-200) / <alpha-value>)',
          300: 'rgb(var(--c-ink-300) / <alpha-value>)',
          400: 'rgb(var(--c-ink-400) / <alpha-value>)',
          500: 'rgb(var(--c-ink-500) / <alpha-value>)',
          600: 'rgb(var(--c-ink-600) / <alpha-value>)',
          700: 'rgb(var(--c-ink-700) / <alpha-value>)',
          800: 'rgb(var(--c-ink-800) / <alpha-value>)',
          900: 'rgb(var(--c-ink-900) / <alpha-value>)',
        },

        // Surface tokens — flip for dark mode via CSS variables
        cream: {
          50:  'rgb(var(--c-cream-50)  / <alpha-value>)',
          100: 'rgb(var(--c-cream-100) / <alpha-value>)',
          200: 'rgb(var(--c-cream-200) / <alpha-value>)',
          300: 'rgb(var(--c-cream-300) / <alpha-value>)',
        },
        beige: {
          50:  'rgb(var(--c-cream-100) / <alpha-value>)',
          100: 'rgb(var(--c-cream-200) / <alpha-value>)',
          200: 'rgb(var(--c-cream-300) / <alpha-value>)',
          300: 'rgb(var(--c-tan-300)   / <alpha-value>)',
        },
        tan: {
          50:  'rgb(var(--c-cream-200) / <alpha-value>)',
          100: 'rgb(var(--c-cream-300) / <alpha-value>)',
          200: 'rgb(var(--c-tan-200)   / <alpha-value>)',
          300: 'rgb(var(--c-tan-300)   / <alpha-value>)',
        },
        sage: {
          50:  '#FBEEEB',
          100: '#F4D6D0',
          200: '#E5A89E',
          300: '#D17668',
          400: '#BC4A3A',
          500: '#A41F13',
          600: '#83180F',
          // 700-900 are TEXT shades — flip for dark mode
          700: 'rgb(var(--c-ink-500) / <alpha-value>)',
          800: 'rgb(var(--c-ink-600) / <alpha-value>)',
          900: 'rgb(var(--c-ink-700) / <alpha-value>)',
        },
        primary: {
          50:  '#FBEEEB',
          100: '#F4D6D0',
          200: '#E5A89E',
          300: '#D17668',
          400: '#BC4A3A',
          500: '#A41F13',
          600: '#83180F',
          700: '#62120B',
          800: '#410C08',
          900: '#210604',
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
        },
      },
      backdropBlur: {
        xs: '2px',
      },
      boxShadow: {
        'soft':   '0 1px 2px 0 rgba(41, 47, 54, 0.04), 0 1px 3px 0 rgba(41, 47, 54, 0.06)',
        'card':   '0 4px 16px -4px rgba(41, 47, 54, 0.08), 0 2px 6px -2px rgba(41, 47, 54, 0.05)',
        'lift':   '0 12px 32px -8px rgba(41, 47, 54, 0.18), 0 4px 12px -4px rgba(41, 47, 54, 0.08)',
        'brand':  '0 8px 24px -6px rgba(164, 31, 19, 0.35)',
      },
      animation: {
        'fade-in':    'fadeIn 0.25s ease-out',
        'fade-in-up': 'fadeInUp 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
        'slide-up':   'slideUp 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        'slide-down': 'slideDown 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        'scale-in':   'scaleIn 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        'shimmer':    'shimmer 1.6s linear infinite',
        'pulse-slow': 'pulse 2.4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'spin-slow':  'spin 2.5s linear infinite',
        'float':      'float 4s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.96)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '-400px 0' },
          '100%': { backgroundPosition: '400px 0' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%':      { transform: 'translateY(-6px)' },
        },
      },
    },
  },
  plugins: [],
}
