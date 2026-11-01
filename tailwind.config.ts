import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: {
          DEFAULT: '#030712', // gray-950
          secondary: '#111827', // gray-900
          card: '#1f2937', // gray-800
          subtle: '#374151', // gray-700
        },
        danger: {
          DEFAULT: '#ef4444', // red-500
          light: '#f87171',
          dark: '#b91c1c',
          surface: 'rgba(239, 68, 68, 0.12)',
        },
        warning: {
          DEFAULT: '#f59e0b', // amber-500
          light: '#fbbf24', // amber-400
          dark: '#b45309',
          surface: 'rgba(245, 158, 11, 0.12)',
        },
        success: {
          DEFAULT: '#10b981', // green-500
          light: '#34d399',
          dark: '#047857',
          surface: 'rgba(16, 185, 129, 0.12)',
        },
        info: {
          DEFAULT: '#3b82f6', // blue-500
          light: '#60a5fa',
          dark: '#1d4ed8',
          surface: 'rgba(59, 130, 246, 0.12)',
        },
        rust: {
          DEFAULT: '#b91c1c',
          light: '#dc2626',
          dark: '#7f1d1d',
          glow: 'rgba(185, 28, 28, 0.4)',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        glow: '0 0 20px -5px rgba(239, 68, 68, 0.5)',
        'glow-amber': '0 0 20px -5px rgba(245, 158, 11, 0.5)',
        'glow-green': '0 0 20px -5px rgba(16, 185, 129, 0.5)',
        'glow-blue': '0 0 20px -5px rgba(59, 130, 246, 0.5)',
      },
    },
  },
  plugins: [],
};

export default config;
