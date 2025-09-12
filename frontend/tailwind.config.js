/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Monochrome color palette for minimalistic design
        'charcoal': '#353839',          // Primary charcoal for text and elements
        'charcoal-light': '#4A4D4F',    // Lighter charcoal for hover states
        'charcoal-dark': '#2A2C2E',     // Darker charcoal for active states
        'gray-50': '#F9FAFB',           // Lightest gray
        'gray-100': '#F3F4F6',          // Very light gray
        'gray-200': '#E5E7EB',          // Light gray for borders
        'gray-300': '#D1D5DB',          // Medium-light gray for dividers
        'gray-400': '#9CA3AF',          // Medium gray
        'gray-500': '#6B7280',          // Medium-dark gray
        'gray-600': '#4B5563',          // Dark gray
        'gray-700': '#374151',          // Darker gray
        'gray-800': '#1F2937',          // Very dark gray
        'gray-900': '#111827',          // Darkest gray
        
        // Semantic colors using monochrome palette
        'primary': '#353839',           // Charcoal primary
        'secondary': '#6B7280',         // Medium gray secondary
        'accent': '#353839',            // Charcoal accent
        'muted': '#9CA3AF',             // Muted gray
        'border': '#D1D5DB',            // Light gray borders
        'divider': '#E5E7EB',           // Very light gray dividers
        'background': '#FFFFFF',        // Pure white background
        'surface': '#F9FAFB',           // Light gray surface
        
        // State colors in monochrome
        'success': '#4B5563',           // Dark gray for success
        'warning': '#6B7280',           // Medium gray for warning
        'error': '#374151',             // Darker gray for error
        'info': '#9CA3AF',              // Medium-light gray for info
      },
      fontFamily: {
        'sans': ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
        'mono': ['SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', 'monospace'],
      },
      fontSize: {
        'xs': ['0.75rem', { lineHeight: '1rem' }],
        'sm': ['0.875rem', { lineHeight: '1.25rem' }],
        'base': ['1rem', { lineHeight: '1.5rem' }],
        'lg': ['1.125rem', { lineHeight: '1.75rem' }],
        'xl': ['1.25rem', { lineHeight: '1.75rem' }],
        '2xl': ['1.5rem', { lineHeight: '2rem' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
      },
      fontWeight: {
        'light': '300',
        'normal': '400',
        'medium': '500',
        'semibold': '600',
        'bold': '700',
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
      },
      animation: {
        'pulse-slow': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'pulse-gentle': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fadeIn 0.2s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
        'waveform': 'waveform 1.5s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        waveform: {
          '0%, 100%': { transform: 'scaleY(0.3)', opacity: '0.3' },
          '50%': { transform: 'scaleY(1)', opacity: '1' },
        },
      },
      boxShadow: {
        'subtle': '0 1px 2px 0 rgba(53, 56, 57, 0.05)',
        'soft': '0 1px 3px 0 rgba(53, 56, 57, 0.1), 0 1px 2px 0 rgba(53, 56, 57, 0.06)',
        'medium': '0 4px 6px -1px rgba(53, 56, 57, 0.1), 0 2px 4px -1px rgba(53, 56, 57, 0.06)',
        'large': '0 10px 15px -3px rgba(53, 56, 57, 0.1), 0 4px 6px -2px rgba(53, 56, 57, 0.05)',
        'focus': '0 0 0 3px rgba(53, 56, 57, 0.1)',
      },
      borderRadius: {
        'none': '0',
        'sm': '0.125rem',
        'DEFAULT': '0.25rem',
        'md': '0.375rem',
        'lg': '0.5rem',
        'xl': '0.75rem',
        '2xl': '1rem',
        'full': '9999px',
      },
      transitionDuration: {
        '200': '200ms',
        '300': '300ms',
      },
      transitionTimingFunction: {
        'out': 'cubic-bezier(0, 0, 0.2, 1)',
        'in-out': 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
    },
  },
  plugins: [],
}