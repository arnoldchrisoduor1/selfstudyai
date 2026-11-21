# Tokens

Values live once in `packages/ui/tokens.css`. `packages/ui/tailwind.preset.ts` maps them into Tailwind. Components use the utilities. Hex is forbidden outside `tokens.css`. `npm run check:colors` fails the build on a hex digit in `apps/web/src`, `apps/landing/src`, or `packages/ui` (the token file is the exception).

Light is `:root`. Dark is `.dark` on an ancestor (`darkMode: "class"`). Default is light.

Icon set: **Material Symbols Outlined**. Type: **Inter** for UI, **JetBrains Mono** for metrics. `next/font` sets `--font-sans-loaded` and `--font-mono-loaded`. The symbol font is the stylesheet link in both `_document.tsx` files.

```html
<span class="material-symbols-outlined">menu_book</span>
<span class="material-symbols-outlined icon-sm">search</span>
<span class="material-symbols-outlined icon-lg">upload_file</span>
```

Weights stop at 600 for new UI. 700 stays loaded so existing `font-bold` does not faux-bold.

## Color

| CSS variable | Tailwind | Light | Dark | Role |
|---|---|---|---|---|
| `--color-bg` | `bg-bg`, `bg-background` | `#f8f9fc` | `#0a0e18` | Page canvas |
| `--color-surface` | `bg-surface`, `bg-card` | `#ffffff` | `#171b26` | Cards, sidebar, inputs |
| `--color-surface-dim` | `bg-surface-dim`, `bg-muted` | `#f1f3f9` | `#111520` | Wells, tracks |
| `--color-surface-elevated` | `bg-surface-elevated` | `#ffffff` | `#232838` | Hover rows, menus |
| `--color-text` | `text-text`, `text-foreground` | `#111827` | `#f8faff` | Primary text |
| `--color-text-muted` | `text-text-muted`, `text-muted-foreground` | `#6b7280` | `#94a3b8` | Secondary text |
| `--color-text-subtle` | `text-text-subtle` | `#9ca3af` | `#64748b` | Placeholder, meta |
| `--color-border` | `border-border` | `#e5e7eb` | `#232838` | Hairline |
| `--color-border-subtle` | `border-border-subtle` | `#eaecf0` | `#1e293b` | Quiet divider |
| `--color-primary` | `bg-primary`, `text-primary` | `#5b50e6` | `#6366f1` | Actions, active nav |
| `--color-primary-hover` | `bg-primary-hover` | `#4a3fd1` | `#4f46e5` | Primary hover |
| `--color-primary-subtle` | `bg-primary-subtle` | `#eeedfe` | `rgba(99,102,241,0.15)` | Selected fill |
| `--color-on-primary` | `text-primary-foreground` | `#ffffff` | `#ffffff` | Text on primary |
| `--color-secondary` | `text-secondary`, `bg-secondary` | `#515f74` | `#94a3b8` | Slate utility |
| `--color-status-strong` | `text-status-strong`, `bg-accent` | `#059669` | `#34d399` | Mastery, success |
| `--color-status-stable` | `text-status-stable` | `#5b50e6` | `#a5b4fc` | On-track, info |
| `--color-status-review` | `text-status-review` | `#b45309` | `#fbbf24` | Due, streak |
| `--color-status-weak` | `text-status-weak`, `bg-destructive` | `#dc2626` | `#f87171` | Lapse, error |

Each status also has `-bg` and `-border` (`bg-status-strong-bg`, `border-status-review-border`). Solid colors expose an `-rgb` channel so `bg-primary/15` works. Translucent fills do not.

`accent` is an alias of status-strong. `destructive` is an alias of status-weak. Those names stay so current components keep meaning while Phase 2 rebuilds them.

## Type

| Token | Size | Line height | Tracking | Weight |
|---|---|---|---|---|
| `text-display-hero` | 40px | 48px | -0.03em | 600 |
| `text-display-hero-mobile` | 30px | 38px | -0.025em | 600 |
| `text-headline-lg` | 28px | 36px | -0.02em | 600 |
| `text-headline-md` | 22px | 30px | -0.015em | 600 |
| `text-headline-sm` | 18px | 26px | -0.01em | 600 |
| `text-body-lg` | 16px | 24px | -0.005em | 400 |
| `text-body-md` | 14px | 22px | 0 | 400 |
| `text-body-sm` | 13px | 18px | 0 | 400 |
| `text-label-md` | 13px | 16px | 0 | 500 |
| `text-label-sm` | 11px | 14px | 0.04em | 600 |
| `font-mono` + `text-mono-metric` | 13px | 16px | -0.02em | 500 |

## Space

| Token | Value | Utility |
|---|---|---|
| `--space-xs` | 4px | `p-xs`, `gap-xs` |
| `--space-sm` | 8px | `p-sm` |
| `--space-md` | 16px | `p-md` |
| `--space-lg` | 24px | `p-lg` |
| `--space-xl` | 40px | `p-xl` |
| `--space-gutter` | 16px | `gap-gutter` |
| `--space-gutter-desktop` | 24px | `gap-gutter-desktop` |
| `--space-margin` | 16px | `p-margin` |
| `--space-margin-desktop` | 32px | `p-margin-desktop` |

`--space-2xl` (48px) and `--space-3xl` (64px) stay for existing pages. New screens use the scale above.

## Radius, shadow, border, z, motion

| Token | Value |
|---|---|
| `--radius-sm` | 4px |
| `--radius-md` | 8px (`rounded-md`, controls) |
| `--radius-card` | 12px (`rounded-card`) |
| `--radius-lg` | 16px (`rounded-lg`) |
| `--radius-xl` | 24px (`rounded-xl`) |
| `--radius-full` | pill |
| `--shadow-sm` | hairline lift |
| `--shadow-md` | card hover |
| `--shadow-lg` | menu, modal |
| `--shadow-glow` | primary halo |
| `--shadow-focus` | focus ring |
| `--border-width` | 1px |
| `--z-sticky` … `--z-modal` | 10, 20, 30, 40, 50 |
| `--motion-fast` / `base` / `slow` | 150 / 200 / 300ms |
| `--ease-standard` | cubic-bezier(0.2, 0, 0, 1) |

Dark shadows are deeper and the focus ring glows. Same variable names.

## Layout

| Token | Value | Source |
|---|---|---|
| `--layout-sidebar` | 256px (`w-64` in the shell HTML) | product HTML |
| `--layout-drawer` | 320px | design prose |
| `--layout-reading` | 840px | design prose |
| `--layout-max` | 1280px | migration breakpoints |
| `--layout-header` | 64px | shell HTML `h-16` |

`prefers-reduced-motion: reduce` in both `globals.css` files collapses animation and transition duration.
