/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'therapy-blue': '#E6F3FF',
        'therapy-gray': '#F8F9FA',
        'therapy-accent': '#4A90E2',
      },
    },
  },
  plugins: [],
}