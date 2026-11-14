/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        page: '#0B0E14',
        sidebar: '#0F131C',
        surface: {
          DEFAULT: '#11151D',
          hover: '#161B26',
          elevated: '#1C2230',
          active: '#242B3D',
        },
        border: {
          subtle: 'rgba(255, 255, 255, 0.06)',
          medium: 'rgba(255, 255, 255, 0.12)',
        },
        accent: {
          DEFAULT: '#C8553D',
          hover: '#B64A34',
          subtle: 'rgba(200, 85, 61, 0.14)',
          glow: 'rgba(200, 85, 61, 0.25)',
        },
        emerald: {
          DEFAULT: '#3FB68B',
          subtle: 'rgba(63, 182, 139, 0.14)',
          text: '#52D1A1',
        },
        amber: {
          DEFAULT: '#E5A440',
          subtle: 'rgba(229, 164, 64, 0.14)',
          text: '#F2B85E',
        },
        text: {
          primary: '#E8EAF0',
          secondary: '#9AA3B2',
          tertiary: '#626B7A',
        },
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'monospace'],
      },
      borderRadius: {
        xl: '12px',
        lg: '8px',
      },
      boxShadow: {
        diffuse: '0 10px 30px rgba(0, 0, 0, 0.35)',
        'inner-highlight': 'inset 0 1px 0 rgba(255, 255, 255, 0.05)',
      },
    },
  },
  plugins: [],
};
