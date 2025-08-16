/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Calming color palette for therapy app
        'therapy-blue': '#E6F3FF',      // Light blue background
        'therapy-gray': '#F8F9FA',      // Soft gray for cards
        'therapy-accent': '#4A90E2',    // Primary blue accent
        'therapy-light': '#F0F8FF',     // Very light blue
        'therapy-dark': '#2C5282',      // Darker blue for text
        'therapy-success': '#48BB78',   // Calming green
        'therapy-warning': '#ED8936',   // Soft orange
        'therapy-error': '#F56565',     // Gentle red
      },
      fontFamily: {
        'therapy': ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'bounce-gentle': 'bounce 2s infinite',
      },
      backdropBlur: {
        'xs': '2px',
      },
      boxShadow: {
        'therapy': '0 4px 6px -1px rgba(74, 144, 226, 0.1), 0 2px 4px -1px rgba(74, 144, 226, 0.06)',
        'therapy-lg': '0 10px 15px -3px rgba(74, 144, 226, 0.1), 0 4px 6px -2px rgba(74, 144, 226, 0.05)',
      },
    },
  },
  plugins: [],
}