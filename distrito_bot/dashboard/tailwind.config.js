/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        distrito: {
          dark: '#1a1a1a',
          card: '#242424',
          accent: '#facc15', // yellow-400
          text: '#f3f4f6',
        }
      }
    },
  },
  plugins: [],
}
