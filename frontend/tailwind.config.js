/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Deep Charcoal / Obsidian / Dark Slate Base
        cyber: {
          bg: '#070a10',
          surface: '#0d121c',
          card: '#111726',
          panel: '#151d30',
          border: '#1e293b',
          borderLight: '#334155',
          black: '#030508',
          charcoal: '#0a0e17',
          // Electric Blue Primary Accents
          blue: {
            50: '#f0f9ff',
            100: '#e0f2fe',
            200: '#bae6fd',
            300: '#7dd3fc',
            400: '#38bdf8',
            500: '#0ea5e9',
            600: '#0284c7',
            700: '#0369a1',
            800: '#075985',
            900: '#0c4a6e',
            950: '#082f49',
          },
          // Emerald Safe Indicators
          emerald: {
            50: '#ecfdf5',
            100: '#d1fae5',
            200: '#a7f3d0',
            300: '#6ee7b7',
            400: '#34d399',
            500: '#10b981',
            600: '#059669',
            700: '#047857',
            800: '#065f46',
            900: '#064e3b',
          },
          // Threat Severity Tiers (Amber / Orange / Crimson)
          amber: {
            400: '#fbbf24',
            500: '#f59e0b',
            600: '#d97706',
          },
          orange: {
            400: '#fb923c',
            500: '#f97316',
            600: '#ea580c',
          },
          crimson: {
            400: '#f87171',
            500: '#ef4444',
            600: '#dc2626',
            700: '#b91c1c',
            900: '#7f1d1d',
          },
        },
        // Standard SOC Theme Mapping
        soc: {
          navy: {
            950: '#030508',
            900: '#070a10',
            850: '#0b1018',
            800: '#0f1724',
            700: '#151f32',
            600: '#1e293b',
          },
          slate: {
            50: '#070a10',
            100: '#0d121c',
            200: '#131b2a',
            300: '#1e293b',
            400: '#64748b',
            500: '#94a3b8',
            600: '#cbd5e1',
            700: '#e2e8f0',
            800: '#f1f5f9',
            900: '#f8fafc',
          },
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      // Larger, bolder, clearer font sizing that fills the screen generously
      fontSize: {
        '2xs': ['0.75rem', { lineHeight: '1rem' }],       // 12px
        'xs': ['0.875rem', { lineHeight: '1.25rem' }],    // 14px
        'sm': ['0.975rem', { lineHeight: '1.45rem' }],    // 15.6px
        'base': ['1.1rem', { lineHeight: '1.65rem' }],    // 17.6px
        'lg': ['1.25rem', { lineHeight: '1.8rem' }],      // 20px
        'xl': ['1.45rem', { lineHeight: '2rem' }],        // 23.2px
        '2xl': ['1.75rem', { lineHeight: '2.3rem' }],     // 28px
        '3xl': ['2.25rem', { lineHeight: '2.7rem' }],     // 36px
        '4xl': ['2.85rem', { lineHeight: '3.2rem' }],     // 45.6px
      },
      boxShadow: {
        'soc-card': '0 4px 20px -2px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(30, 41, 59, 0.6)',
        'soc-card-hover': '0 8px 30px -4px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(56, 189, 248, 0.4), 0 0 20px -2px rgba(56, 189, 248, 0.15)',
      },
    },
  },
  plugins: [],
}
