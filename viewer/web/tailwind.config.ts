import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Hiragino Sans',
          'Noto Sans JP',
          'sans-serif',
        ],
        mono: [
          'JetBrains Mono',
          'SF Mono',
          'Menlo',
          'monospace',
        ],
      },
      colors: {
        // Brand accent (only used sparingly per design rules)
        accent: {
          DEFAULT: '#5c9fd4',
          fg: '#0c4a6e',
        },
        // Status colors
        ok: { DEFAULT: '#4caf50', soft: '#e8f5e9', strong: '#1b5e20' },
        warn: { DEFAULT: '#e6a23c', soft: '#fff7e6', strong: '#7d5a00' },
        bad: { DEFAULT: '#d94452', soft: '#fff2f0', strong: '#a8071a' },
      },
      borderRadius: {
        lg: '10px',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.2s ease-out',
      },
    },
  },
  plugins: [],
} satisfies Config;
