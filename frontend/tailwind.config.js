export default {
  content: [
    './index.html',
    './src/**/*.{js,jsx}'
  ],
  theme: {
    extend: {
      colors: {
        'maroon': {
          DEFAULT: '#7C0A12',
          'dark': '#650018'
        },
        'beige': {
          DEFAULT: '#FBF8F3',
          'soft': '#F7F0EC'
        },
        'accent': {
          DEFAULT: '#F59E0B', // Amber 500
          'light': '#FEF3C7'  // Amber 100
        },
        // Old colors, keeping them for now
        burgundy: '#800020',
        old_beige: '#F5F5DC'
      },
      borderRadius: {
        'xl': '1rem',
        '2xl': '1.5rem',
        '3xl': '2rem'
      },
      boxShadow: {
        soft: '0 12px 30px rgba(124, 10, 18, 0.12)',
        'hard': '0 4px 12px rgba(0, 0, 0, 0.15)'
      }
    }
  },
  plugins: []
};
