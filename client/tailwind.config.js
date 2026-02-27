/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Luxury real estate color palette
        'estate': {
          50: '#f7f6f4',
          100: '#edeae5',
          200: '#dbd5ca',
          300: '#c4b9a7',
          400: '#ab9a82',
          500: '#99826a',
          600: '#8c735e',
          700: '#755f4e',
          800: '#614f44',
          900: '#51433a',
          950: '#2b221d',
        },
        'gold': {
          50: '#fdfcf7',
          100: '#fbf7e8',
          200: '#f6ecc5',
          300: '#efdc98',
          400: '#e7c663',
          500: '#deb040',
          600: '#c8932f',
          700: '#a67328',
          800: '#875c28',
          900: '#704c25',
          950: '#412712',
        },
        'navy': {
          50: '#f4f6fb',
          100: '#e9ecf5',
          200: '#ced7e9',
          300: '#a3b4d5',
          400: '#718bbd',
          500: '#4f6ca5',
          600: '#3d558a',
          700: '#324570',
          800: '#2c3b5e',
          900: '#1e2a45',
          950: '#151c30',
        }
      },
      fontFamily: {
        'display': ['Playfair Display', 'serif'],
        'body': ['Source Sans 3', 'sans-serif'],
      },
      boxShadow: {
        'luxury': '0 10px 40px -10px rgba(30, 42, 69, 0.15)',
        'card': '0 4px 20px -2px rgba(30, 42, 69, 0.08)',
      }
    },
  },
  plugins: [],
}
