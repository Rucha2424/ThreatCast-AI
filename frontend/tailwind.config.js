/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],

  darkMode: "class",

  theme: {
    extend: {
      colors: {
        threatcast: {
          deep: "#030405",
          bg: "#080A0D",
          card: "#0D1115",
          elevated: "#151A20",

          silver: "#B8C0C8",
          chrome: "#E8EDF2",
          "dark-chrome": "#59636D",

          cyan: "#00E5FF",
          violet: "#A855F7",
          green: "#00FF9C",

          amber: "#FFB000",
          red: "#FF1744",

          text: "#F1F5F9",
          muted: "#718096",

          border: "#1C2A35",
        },

        /*
         * Backward-compatible aliases.
         * Existing components using cyber-* or soc-*
         * will continue rendering while we migrate the UI.
         */
        cyber: {
          bg: "#080A0D",
          surface: "#0D1115",
          dark: "#030405",
          black: "#030405",
          obsidian: "#080A0D",

          brown: {
            950: "#030405",
            900: "#080A0D",
            850: "#0D1115",
            800: "#11161B",
            750: "#151A20",
            700: "#1C242C",
            600: "#303A44",
            500: "#59636D",
            400: "#7C8792",
            300: "#A0AAB4",
            200: "#C1C8CF",
            100: "#D9DEE3",
            50: "#E8EDF2",
          },

          amber: {
            950: "#3D2500",
            900: "#5C3900",
            800: "#7A4C00",
            700: "#A66A00",
            600: "#D18A00",
            500: "#FFB000",
            400: "#FFC533",
            300: "#FFD45C",
            200: "#FFE18A",
            100: "#FFEAB0",
            50: "#FFF5D6",
          },

          beige: {
            50: "#F1F5F9",
            100: "#E8EDF2",
            200: "#D9DEE3",
            300: "#C1C8CF",
            400: "#AAB3BC",
            500: "#8F99A3",
            600: "#718096",
            700: "#59636D",
            800: "#3E474F",
            900: "#242B31",
            950: "#11161B",
          },

          grey: {
            50: "#F1F5F9",
            100: "#E8EDF2",
            200: "#D9DEE3",
            300: "#C1C8CF",
            400: "#AAB3BC",
            500: "#8F99A3",
            600: "#718096",
            700: "#59636D",
            800: "#3E474F",
            900: "#11161B",
          },

          crimson: "#FF1744",
          warmGold: "#FFB000",
          caramel: "#A66A00",
          bronze: "#59636D",
          sand: "#151A20",
        },

        soc: {
          navy: {
            950: "#030405",
            900: "#080A0D",
            850: "#0D1115",
            800: "#11161B",
            700: "#151A20",
            600: "#1C242C",
          },

          slate: {
            50: "#F1F5F9",
            100: "#E8EDF2",
            200: "#D9DEE3",
            300: "#C1C8CF",
            400: "#AAB3BC",
            500: "#8F99A3",
            600: "#718096",
            700: "#59636D",
            800: "#242B31",
            900: "#11161B",
          },

          ai: {
            light: "#06252A",
            border: "#0B6975",
            DEFAULT: "#00E5FF",
            electric: "#00E5FF",
            purple: "#A855F7",
            glow: "rgba(0, 229, 255, 0.18)",
          },

          cyan: {
            light: "#06252A",
            DEFAULT: "#00E5FF",
            dark: "#0097A7",
          },

          threat: {
            light: "#321016",
            border: "#7A1A2A",
            DEFAULT: "#FF1744",
            dark: "#D70F35",
            glow: "rgba(255, 23, 68, 0.20)",
          },

          warning: {
            light: "#332500",
            border: "#8A6100",
            DEFAULT: "#FFB000",
            dark: "#D18A00",
          },

          secure: {
            light: "#062A1D",
            border: "#08784E",
            DEFAULT: "#00FF9C",
            dark: "#00C77A",
          },
        },
      },

      fontFamily: {
        sans: [
          "Inter",
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],

        display: [
          "Space Grotesk",
          "Inter",
          "system-ui",
          "sans-serif",
        ],

        mono: [
          "JetBrains Mono",
          "Fira Code",
          "Consolas",
          "monospace",
        ],
      },

      boxShadow: {
        "tc-card":
          "0 10px 35px rgba(0, 0, 0, 0.28), inset 0 1px 0 rgba(255,255,255,0.035)",

        "tc-card-hover":
          "0 18px 55px rgba(0, 0, 0, 0.38), inset 0 1px 0 rgba(255,255,255,0.05)",

        "tc-cyan":
          "0 0 20px rgba(0, 229, 255, 0.18)",

        "tc-cyan-strong":
          "0 0 30px rgba(0, 229, 255, 0.32)",

        "tc-violet":
          "0 0 22px rgba(168, 85, 247, 0.20)",

        "tc-green":
          "0 0 22px rgba(0, 255, 156, 0.20)",

        "tc-amber":
          "0 0 24px rgba(255, 176, 0, 0.22)",

        "tc-red":
          "0 0 26px rgba(255, 23, 68, 0.24)",

        "tc-chrome":
          "0 0 1px rgba(232, 237, 242, 0.5)",
      },

      backgroundImage: {
        "tc-metal":
          "linear-gradient(145deg, rgba(232,237,242,0.055), rgba(89,99,109,0.018) 42%, rgba(0,0,0,0.12))",

        "tc-chrome":
          "linear-gradient(180deg, #FFFFFF 0%, #E8EDF2 30%, #AEB7C0 58%, #F4F7FA 75%, #8D98A2 100%)",

        "tc-grid":
          "linear-gradient(rgba(184,192,200,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(184,192,200,0.025) 1px, transparent 1px)",
      },

      backgroundSize: {
        "tc-grid": "42px 42px",
      },

      borderColor: {
        "tc-border": "rgba(184, 192, 200, 0.14)",
        "tc-border-bright": "rgba(184, 192, 200, 0.26)",
      },

      transitionTimingFunction: {
        "tc-smooth": "cubic-bezier(0.2, 0.7, 0.2, 1)",
      },
    },
  },

  plugins: [],
};