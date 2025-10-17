/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{ts,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f5f7ff',
          100: '#e9edff',
          200: '#c7d0ff',
          500: '#3b5bdb',
          700: '#2c3d8f'
        }
      }
    }
  },
  plugins: []
}


