/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        /* Mapped to CSS variables from tokens.css */
        glass: {
          bg: 'var(--glass-bg)',
          border: 'var(--glass-border)',
        },
        accent: {
          DEFAULT: 'var(--accent)',
          hover: 'var(--accent-hover)',
          tint: 'var(--accent-tint)',
        },
        crack: {
          DEFAULT: 'var(--crack)',
          amber: 'var(--crack-amber)',
          tint: 'var(--crack-tint)',
        },
        success: {
          DEFAULT: 'var(--success)',
          tint: 'var(--success-tint)',
        },
        txt: {
          1: 'var(--text-1)',
          2: 'var(--text-2)',
          3: 'var(--text-3)',
          inv: 'var(--text-inv)',
        },
      },
      fontFamily: {
        ui: ['var(--font-ui)'],
        mono: ['var(--font-mono)'],
      },
      borderRadius: {
        panel: 'var(--r-panel)',
        control: 'var(--r-control)',
        pill: 'var(--r-pill)',
      },
      spacing: {
        'sp-1': 'var(--sp-1)',
        'sp-2': 'var(--sp-2)',
        'sp-3': 'var(--sp-3)',
        'sp-4': 'var(--sp-4)',
        'sp-5': 'var(--sp-5)',
        'sp-6': 'var(--sp-6)',
        'sp-7': 'var(--sp-7)',
      },
    },
  },
  plugins: [],
};
