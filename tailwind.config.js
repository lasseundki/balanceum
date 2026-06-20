/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    colors: {
      transparent: 'transparent',
      current: 'currentColor',
      white: '#ffffff',
      black: '#000000',
      bg: {
        DEFAULT: '#FDFCFA',
        subtle: '#F5F3EF',
        muted: '#ECEAE5',
      },
      surface: '#FFFFFF',
      border: {
        DEFAULT: '#E2DED7',
        strong: '#C9C4BB',
      },
      text: {
        DEFAULT: '#1C1916',
        secondary: '#6E6860',
        muted: '#A09890',
        inverse: '#FFFFFF',
      },
      accent: {
        DEFAULT: '#7BA89B',
        hover: '#5F8E80',
        light: '#E0EDEA',
        dark: '#3D6B5E',
      },
      success: { DEFAULT: '#7BA89B', light: '#E0EDEA' },
      warning: { DEFAULT: '#C9A05A', light: '#F5EDDA' },
      error: { DEFAULT: '#B87B72', light: '#F2E4E2' },
      info: { DEFAULT: '#7A9EC4', light: '#DDE8F2' },
      chart: {
        1: '#7BA89B',
        2: '#7A9EC4',
        3: '#C9A05A',
        4: '#A891C4',
        5: '#C47A91',
        6: '#7AB4C4',
      },
    },
    fontFamily: {
      sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      heading: ['Lora', 'Georgia', 'serif'],
      mono: ['JetBrains Mono', 'monospace'],
    },
    borderRadius: {
      none: '0',
      sm: '6px',
      DEFAULT: '10px',
      md: '10px',
      lg: '16px',
      xl: '24px',
      full: '9999px',
    },
    extend: {
      boxShadow: {
        sm: '0 1px 2px rgba(0,0,0,0.06)',
        DEFAULT: '0 1px 3px rgba(0,0,0,0.10), 0 1px 2px rgba(0,0,0,0.06)',
        md: '0 1px 3px rgba(0,0,0,0.10), 0 1px 2px rgba(0,0,0,0.06)',
        lg: '0 4px 6px rgba(0,0,0,0.07), 0 2px 4px rgba(0,0,0,0.06)',
        xl: '0 10px 15px rgba(0,0,0,0.08), 0 4px 6px rgba(0,0,0,0.05)',
      },
    },
  },
  plugins: [],
}
