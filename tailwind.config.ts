import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // iOS system colors
        "ios-blue": "#007AFF",
        "ios-bg": "#F2F2F7",
        "ios-card": "#FFFFFF",
        "ios-text": "#1C1C1E",
        "ios-secondary": "#8E8E93",
        "ios-separator": "#C6C6C8",
        "ios-success": "#34C759",
        "ios-danger": "#FF3B30",
        "ios-warning": "#FF9500",
        // Legacy aliases (keep during migration)
        navy: "#1A3A5C",
        gold: "#C9A84C",
        cream: "#F5F0E8",
      },
    },
  },
  plugins: [],
};
export default config;
