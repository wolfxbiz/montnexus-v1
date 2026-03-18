/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Lora', 'Georgia', 'serif'],
        heading: ['Mont', 'The Seasons', 'Georgia', 'serif'],
      },
    },
  },
  plugins: [],
}
