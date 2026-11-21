import type { Config } from "tailwindcss";

const config = {
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: "#7C3AED", foreground: "#FFFFFF" },
        secondary: { DEFAULT: "#8B5CF6", foreground: "#000000" },
        accent: { DEFAULT: "#059669", foreground: "#000000" },
        background: "#FAF5FF",
        foreground: "#0F172A",
        card: { DEFAULT: "#FFFFFF", foreground: "#0F172A" },
        muted: { DEFAULT: "#F7F3FD", foreground: "#475569" },
        border: "#EFE7FC",
        destructive: { DEFAULT: "#DC2626", foreground: "#FFFFFF" },
        ring: "#7C3AED",
      },
      fontFamily: {
        heading: ["var(--font-heading)", "ui-sans-serif", "system-ui", "sans-serif"],
        sans: ["var(--font-body)", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      spacing: {
        xs: "4px",
        sm: "8px",
        md: "16px",
        lg: "24px",
        xl: "32px",
        "2xl": "48px",
        "3xl": "64px",
      },
      boxShadow: {
        sm: "0 1px 2px rgba(0,0,0,0.05)",
        md: "0 4px 6px rgba(0,0,0,0.1)",
        lg: "0 10px 15px rgba(0,0,0,0.1)",
        xl: "0 20px 25px rgba(0,0,0,0.15)",
      },
      borderRadius: {
        md: "8px",
        lg: "12px",
      },
    },
  },
} satisfies Partial<Config>;

export default config;
