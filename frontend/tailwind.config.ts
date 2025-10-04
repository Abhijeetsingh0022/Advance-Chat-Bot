import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Pure Black & White theme with grayscale
        dark: {
          bg: '#000000',
          surface: '#0a0a0a',
          elevated: '#141414',
          border: '#1f1f1f',
          text: '#ffffff',
          'text-secondary': '#8a8a8a',
        },
        light: {
          bg: '#ffffff',
          surface: '#fafafa',
          elevated: '#f5f5f5',
          border: '#e0e0e0',
          text: '#000000',
          'text-secondary': '#6b6b6b',
        },
        accent: {
          primary: '#000000',      // Black for primary actions
          success: '#000000',
          warning: '#000000',
          error: '#000000',
        },
        gray: {
          50: '#fafafa',
          100: '#f5f5f5',
          200: '#e5e5e5',
          300: '#d4d4d4',
          400: '#a3a3a3',
          500: '#737373',
          600: '#525252',
          700: '#404040',
          800: '#262626',
          900: '#171717',
        }
      },
      animation: {
        'slide-in': 'slideIn 0.2s ease-out',
        'fade-in': 'fadeIn 0.2s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        slideIn: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [require("@tailwindcss/typography")],
};
export default config;
