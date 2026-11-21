import type { Config } from "tailwindcss";

const rgb = (variable: string) => `rgb(var(${variable}) / <alpha-value>)`;

const type = (size: string, leading: string, tracking: string) =>
  [
    `var(${size})`,
    { lineHeight: `var(${leading})`, letterSpacing: `var(${tracking})` },
  ] as [string, { lineHeight: string; letterSpacing: string }];

const config = {
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        bg: rgb("--color-bg-rgb"),
        surface: {
          DEFAULT: rgb("--color-surface-rgb"),
          dim: rgb("--color-surface-dim-rgb"),
          elevated: rgb("--color-surface-elevated-rgb"),
        },
        text: {
          DEFAULT: rgb("--color-text-rgb"),
          muted: rgb("--color-text-muted-rgb"),
          subtle: rgb("--color-text-subtle-rgb"),
        },
        primary: {
          DEFAULT: rgb("--color-primary-rgb"),
          foreground: rgb("--color-on-primary-rgb"),
          hover: rgb("--color-primary-hover-rgb"),
          subtle: "var(--color-primary-subtle)",
          border: "var(--color-primary-border)",
        },
        secondary: {
          DEFAULT: rgb("--color-secondary-rgb"),
          foreground: rgb("--color-on-secondary-rgb"),
        },
        status: {
          strong: rgb("--color-status-strong-rgb"),
          "strong-bg": "var(--color-status-strong-bg)",
          "strong-border": "var(--color-status-strong-border)",
          stable: rgb("--color-status-stable-rgb"),
          "stable-bg": "var(--color-status-stable-bg)",
          "stable-border": "var(--color-status-stable-border)",
          review: rgb("--color-status-review-rgb"),
          "review-bg": "var(--color-status-review-bg)",
          "review-border": "var(--color-status-review-border)",
          weak: rgb("--color-status-weak-rgb"),
          "weak-bg": "var(--color-status-weak-bg)",
          "weak-border": "var(--color-status-weak-border)",
        },
        background: rgb("--color-bg-rgb"),
        foreground: rgb("--color-text-rgb"),
        card: {
          DEFAULT: rgb("--color-surface-rgb"),
          foreground: rgb("--color-text-rgb"),
        },
        muted: {
          DEFAULT: rgb("--color-surface-dim-rgb"),
          foreground: rgb("--color-text-muted-rgb"),
        },
        accent: {
          DEFAULT: rgb("--color-status-strong-rgb"),
          foreground: rgb("--color-on-primary-rgb"),
        },
        border: rgb("--color-border-rgb"),
        "border-subtle": rgb("--color-border-subtle-rgb"),
        destructive: {
          DEFAULT: rgb("--color-status-weak-rgb"),
          foreground: rgb("--color-on-primary-rgb"),
        },
        ring: rgb("--color-border-focus-rgb"),
      },
      fontFamily: {
        heading: ["var(--font-sans)", "Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        sans: ["var(--font-sans)", "Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      fontSize: {
        "display-hero": type("--text-display-hero-size", "--text-display-hero-leading", "--text-display-hero-tracking"),
        "display-hero-mobile": type(
          "--text-display-hero-mobile-size",
          "--text-display-hero-mobile-leading",
          "--text-display-hero-mobile-tracking",
        ),
        "headline-lg": type("--text-headline-lg-size", "--text-headline-lg-leading", "--text-headline-lg-tracking"),
        "headline-md": type("--text-headline-md-size", "--text-headline-md-leading", "--text-headline-md-tracking"),
        "headline-sm": type("--text-headline-sm-size", "--text-headline-sm-leading", "--text-headline-sm-tracking"),
        "body-lg": type("--text-body-lg-size", "--text-body-lg-leading", "--text-body-lg-tracking"),
        "body-md": type("--text-body-md-size", "--text-body-md-leading", "--text-body-md-tracking"),
        "body-sm": type("--text-body-sm-size", "--text-body-sm-leading", "--text-body-sm-tracking"),
        "label-md": type("--text-label-md-size", "--text-label-md-leading", "--text-label-md-tracking"),
        "label-sm": type("--text-label-sm-size", "--text-label-sm-leading", "--text-label-sm-tracking"),
        "mono-metric": type("--text-mono-metric-size", "--text-mono-metric-leading", "--text-mono-metric-tracking"),
      },
      fontWeight: {
        regular: "var(--text-weight-regular)",
        medium: "var(--text-weight-medium)",
        semibold: "var(--text-weight-semibold)",
      },
      spacing: {
        xs: "var(--space-xs)",
        sm: "var(--space-sm)",
        md: "var(--space-md)",
        lg: "var(--space-lg)",
        xl: "var(--space-xl)",
        "2xl": "var(--space-2xl)",
        "3xl": "var(--space-3xl)",
        gutter: "var(--space-gutter)",
        "gutter-desktop": "var(--space-gutter-desktop)",
        margin: "var(--space-margin)",
        "margin-desktop": "var(--space-margin-desktop)",
        sidebar: "var(--layout-sidebar)",
        "sidebar-collapsed": "var(--layout-sidebar-collapsed)",
        drawer: "var(--layout-drawer)",
        reading: "var(--layout-reading)",
        header: "var(--layout-header)",
        logo: "var(--size-logo)",
      },
      maxWidth: {
        reading: "var(--layout-reading)",
        workspace: "var(--layout-max)",
      },
      boxShadow: {
        sm: "var(--shadow-sm)",
        md: "var(--shadow-md)",
        lg: "var(--shadow-lg)",
        xl: "var(--shadow-xl)",
        glow: "var(--shadow-glow)",
        focus: "var(--shadow-focus)",
      },
      borderRadius: {
        sm: "var(--radius-sm)",
        DEFAULT: "var(--radius-md)",
        md: "var(--radius-md)",
        card: "var(--radius-card)",
        lg: "var(--radius-lg)",
        xl: "var(--radius-xl)",
        full: "var(--radius-full)",
      },
      borderWidth: {
        DEFAULT: "var(--border-width)",
      },
      zIndex: {
        sticky: "var(--z-sticky)",
        header: "var(--z-header)",
        dropdown: "var(--z-dropdown)",
        sidebar: "var(--z-sidebar)",
        modal: "var(--z-modal)",
      },
      transitionDuration: {
        fast: "var(--motion-fast)",
        DEFAULT: "var(--motion-base)",
        slow: "var(--motion-slow)",
      },
      transitionTimingFunction: {
        standard: "var(--ease-standard)",
      },
    },
  },
} satisfies Partial<Config>;

export default config;
