/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Paleta CONSTRUESCALA Hospitality
        primary: {
          50: '#f2f5ed',
          100: '#e5ead6',
          200: '#c9d5ac',
          300: '#adbf82',
          400: '#91aa59',
          500: '#5C6B45', // Verde oliva/salvia principal
          600: '#4d5a39',
          700: '#3F4A2F', // Verde oscuro hover/active
          800: '#2f3723',
          900: '#1f2517',
        },
        accent: {
          50: '#fdf2f3',
          100: '#fce4e7',
          200: '#f9cdd2',
          300: '#f4a8af',
          400: '#ec7682',
          500: '#df4a59',
          600: '#c72b3c',
          700: '#722F37', // Vinotinto/borgoña principal
          800: '#5c262d',
          900: '#4d2127',
        },
        gold: {
          50: '#fdf9ef',
          100: '#faf0d4',
          200: '#f4dea7',
          300: '#edc970',
          400: '#C9A24B', // Dorado/ocre principal
          500: '#d4a534',
          600: '#b8842a',
          700: '#996424',
          800: '#7d5023',
          900: '#67421f',
        },
        cream: {
          50: '#FDFCFA',
          100: '#F5EFE4', // Crema/beige principal (fondo base)
          200: '#EDE4D3',
          300: '#E0D3BD',
          400: '#D0BEA3',
          500: '#C0A989',
          600: '#A68E6E',
          700: '#877358',
          800: '#6d5d48',
          900: '#594d3c',
        },
      },
      fontFamily: {
        serif: ['Playfair Display', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        'xl': '0.75rem',
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      boxShadow: {
        'soft': '0 2px 15px -3px rgba(0, 0, 0, 0.07), 0 10px 20px -2px rgba(0, 0, 0, 0.04)',
        'card': '0 4px 25px -5px rgba(0, 0, 0, 0.05), 0 10px 10px -5px rgba(0, 0, 0, 0.02)',
      },
    },
  },
  plugins: [],
}
