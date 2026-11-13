import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        ignis: {
          bg: "#0D1117",
          surface: "#161B22",
          border: "#30363D",
          text: "#F0F6FC",
          muted: "#8B949E",
          accent: "#EA580C",
          frp0: "#1E232A",
          frp50: "#D97706",
          frp250: "#EA580C",
          frp1000: "#DC2626",
          frpMax: "#991B1B",
        },
      },
      fontFamily: {
        mono: ['ui-monospace', 'SFMono-Regular', '"JetBrains Mono"', 'Menlo', 'monospace'],
      },
    },
  },
  plugins: [],
};
export default config;
