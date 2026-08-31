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
        soc: {
          navy: {
            950: '#070B19',
            900: '#0B132B',
            850: '#111C3D',
            800: '#1C2541',
            700: '#273456',
            600: '#3A506B',
          },
          slate: {
            50: '#F8FAFC',
            100: '#F1F5F9',
            200: '#E2E8F0',
            300: '#CBD5E1',
            400: '#94A3B8',
            500: '#64748B',
            600: '#475569',
            700: '#334155',
            800: '#1E293B',
            900: '#0F172A',
          },
          ai: {
            light: '#EEF2FF',
            border: '#C7D2FE',
            DEFAULT: '#6366F1',
            electric: '#4F46E5',
            purple: '#8B5CF6',
            glow: 'rgba(99, 102, 241, 0.25)',
          },
          cyan: {
            light: '#ECFEFF',
            DEFAULT: '#06B6D4',
            dark: '#0891B2',
          },
          threat: {
            light: '#FEF2F2',
            border: '#FECACA',
            DEFAULT: '#EF4444',
            dark: '#DC2626',
            glow: 'rgba(239, 68, 68, 0.2)',
          },
          warning: {
            light: '#FFFBEB',
            border: '#FDE68A',
            DEFAULT: '#F59E0B',
            dark: '#D97706',
          },
          secure: {
            light: '#ECFDF5',
            border: '#A7F3D0',
            DEFAULT: '#10B981',
            dark: '#059669',
          }
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      boxShadow: {
        'soc-card': '0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px -1px rgba(0, 0, 0, 0.05)',
        'soc-card-hover': '0 10px 15px -3px rgba(0, 0, 0, 0.07), 0 4px 6px -4px rgba(0, 0, 0, 0.05)',
        'soc-glow-ai': '0 0 20px rgba(99, 102, 241, 0.15)',
        'soc-glow-threat': '0 0 20px rgba(239, 68, 68, 0.18)',
      },
      animation: {
        'pulse-subtle': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'flow-edge': 'flowEdge 2s linear infinite',
      },
      keyframes: {
        flowEdge: {
          '0%': { strokeDashoffset: '24' },
          '100%': { strokeDashoffset: '0' },
        }
      }
    },
  },
  plugins: [],
}
