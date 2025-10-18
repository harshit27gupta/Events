/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{ts,tsx}'
  ],
  theme: {
    extend: {
      animation: {
        breathe: 'breathe 3s ease-in-out infinite',
        shimmer: 'shimmer 2.5s linear infinite',
        scan: 'scan 4s linear infinite',
        aurora: 'aurora 6s linear infinite',
        ripple: 'ripple 800ms ease-out'
      },
      keyframes: {
        breathe: {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.02)' }
        },
        shimmer: {
          '0%': { backgroundPosition: '0% 50%' },
          '100%': { backgroundPosition: '200% 50%' }
        },
        scan: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100%)' }
        },
        aurora: {
          '0%': { '--tw-gradient-angle': '0deg' },
          '100%': { '--tw-gradient-angle': '360deg' }
        },
        ripple: {
          '0%': { transform: 'scale(0.9)', opacity: '0.6' },
          '100%': { transform: 'scale(1.15)', opacity: '0' }
        }
      },
      colors: {
        brand: {
          50: '#faf5ff',
          100: '#f3e8ff',
          200: '#e9d5ff',
          300: '#d8b4fe',
          400: '#c084fc',
          500: '#a855f7',
          600: '#9333ea',
          700: '#7e22ce',
          800: '#6b21a8',
          900: '#581c87'
        },
        // Semantic colors & extended neutrals
        success: {
          DEFAULT: '#10b981',
          light: '#34d399',
          dark: '#059669'
        },
        warning: {
          DEFAULT: '#f59e0b',
          light: '#fbbf24'
        },
        danger: {
          DEFAULT: '#ef4444',
          light: '#f87171'
        },
        neutral: {
          925: '#141414' // custom elevated background
        }
      },
      boxShadow: {
        glass: 'inset 0 1px 0 0 rgba(255,255,255,0.06), 0 8px 30px rgba(0,0,0,0.3)'
      },
      backdropBlur: {
        xs: '2px',
        '3xl': '32px'
      },
      borderRadius: {
        xl: '1rem'
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif']
      },
      backgroundImage: {
        'bg-noise': "url('data:image/svg+xml;utf8,<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"40\" height=\"40\" viewBox=\"0 0 40 40\"><filter id=\"n\"><feTurbulence type=\"fractalNoise\" baseFrequency=\"0.8\" numOctaves=\"4\" stitchTiles=\"stitch\"/></filter><rect width=\"100%\" height=\"100%\" filter=\"url(%23n)\" opacity=\"0.03\"/></svg>')",
        'brand-grad': 'linear-gradient(135deg, #a855f7 0%, #ec4899 100%)'
      }
    }
  },
  plugins: [require('@tailwindcss/forms'), require('@tailwindcss/typography')]
}


