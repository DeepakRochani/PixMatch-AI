import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
    '../../packages/ui/src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: '#090A0F',
        foreground: '#F8FAFC',
        muted: '#94A3B8',
        card: '#12141C',
        'card-border': '#1E2333',
        primary: {
          DEFAULT: '#3B82F6',
          hover: '#2563EB',
          foreground: '#FFFFFF',
        },
        accent: {
          DEFAULT: '#6366F1',
          foreground: '#FFFFFF',
        },
        gold: {
          500: '#EAB308',
          600: '#CA8A04',
        },
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        serif: ['Playfair Display', 'Georgia', 'serif'],
      },
    },
  },
  plugins: [],
};

export default config;
