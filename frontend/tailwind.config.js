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
        cyber: {
          black: '#070206',
          dark: '#0c040a',
          obsidian: '#050104',
          maroon: {
            950: '#110309',
            900: '#1c0610',
            850: '#260817',
            800: '#340b20',
            700: '#4e1030',
            600: '#6e1644',
            500: '#9f1239',
            400: '#e11d48',
          },
          burgundy: {
            950: '#15040d',
            900: '#230716',
            850: '#2e091e',
            800: '#3d0c28',
            700: '#5c123d',
            600: '#831843',
            500: '#be123c',
            400: '#f43f5e',
            300: '#fda4af',
          },
          grey: {
            50: '#f8fafc',
            100: '#f1f5f9',
            200: '#e2e8f0',
            300: '#cbd5e1',
            400: '#94a3b8',
            500: '#64748b',
            600: '#475569',
            700: '#334155',
            800: '#1e293b',
            900: '#0f172a',
          },
          crimson: '#e11d48',
          neonPink: '#fb7185',
          neuralPurple: '#a21caf',
          neuralViolet: '#c026d3',
          neonCyan: '#06b6d4',
          neonGreen: '#10b981',
        },
        // Backward-compatible SOC tokens mapped to new Dark Maroon / Cyber Burgundy theme
        soc: {
          navy: {
            950: '#070206',
            900: '#14040d',
            850: '#1f0714',
            800: '#2d0a1d',
            700: '#420f2c',
            600: '#5c153e',
          },
          slate: {
            50: '#0a0308',
            100: '#16050f',
            200: '#25091a',
            300: '#3c0e2a',
            400: '#94a3b8',
            500: '#cbd5e1',
            600: '#e2e8f0',
            700: '#f1f5f9',
            800: '#f8fafc',
            900: '#ffffff',
          },
          ai: {
            light: '#2a081c',
            border: '#831843',
            DEFAULT: '#e11d48',
            electric: '#f43f5e',
            purple: '#c026d3',
            glow: 'rgba(225, 29, 72, 0.35)',
          },
          cyan: {
            light: '#082f49',
            DEFAULT: '#06b6d4',
            dark: '#0284c7',
          },
          threat: {
            light: '#2b0712',
            border: '#9f1239',
            DEFAULT: '#f43f5e',
            dark: '#be123c',
            glow: 'rgba(244, 63, 94, 0.4)',
          },
          warning: {
            light: '#2d1804',
            border: '#b45309',
            DEFAULT: '#f59e0b',
            dark: '#d97706',
          },
          secure: {
            light: '#022c22',
            border: '#047857',
            DEFAULT: '#10b981',
            dark: '#059669',
          }
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      boxShadow: {
        'soc-card': '0 4px 20px -2px rgba(0, 0, 0, 0.7), 0 0 15px rgba(159, 18, 57, 0.15)',
        'soc-card-hover': '0 10px 25px -3px rgba(0, 0, 0, 0.8), 0 0 25px rgba(225, 29, 72, 0.3)',
        'soc-glow-ai': '0 0 25px rgba(225, 29, 72, 0.35)',
        'soc-glow-threat': '0 0 25px rgba(244, 63, 94, 0.45)',
        'maroon-glow': '0 0 30px rgba(159, 18, 57, 0.35)',
        'neural-glow': '0 0 35px rgba(192, 38, 211, 0.3)',
      },
      animation: {
        'pulse-subtle': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'flow-edge': 'flowEdge 1.5s linear infinite',
        'neural-pulse': 'neuralPulse 4s ease-in-out infinite',
        'synapse-glow': 'synapseGlow 2.5s ease-in-out infinite',
      },
      keyframes: {
        flowEdge: {
          '0%': { strokeDashoffset: '24' },
          '100%': { strokeDashoffset: '0' },
        },
        neuralPulse: {
          '0%, 100%': { opacity: '0.3', transform: 'scale(1)' },
          '50%': { opacity: '0.8', transform: 'scale(1.08)' },
        },
        synapseGlow: {
          '0%, 100%': { filter: 'drop-shadow(0 0 4px rgba(225, 29, 72, 0.4))' },
          '50%': { filter: 'drop-shadow(0 0 12px rgba(244, 63, 94, 0.8))' },
        }
      }
    },
  },
  plugins: [],
}
