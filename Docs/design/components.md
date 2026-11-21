# Components

Shared controls live in `packages/ui/src`, one component per file, no barrel. Apps import `@self-study/ui/<Name>`. A pattern used in two views moves here. A pattern used once stays in the app `components/` or `sections/` folder.

Phase 2 rebuilds the shell and the controls below to these specs. Until then, existing components already consume the token utilities (`bg-primary`, `text-foreground`, `border-border`). Do not add hex, raw pixel font sizes, radii, shadows, or spacing.

Icons are Material Symbols Outlined. See `docs/design/tokens.md`.

## Button

Variants are props.

| Variant | Fill | Text | Border | Hover |
|---|---|---|---|---|
| primary | `bg-primary` | `text-primary-foreground` | `border-primary` | `bg-primary-hover` |
| secondary | transparent | `text-secondary` | `border-border` | `bg-muted` |
| quiet | transparent | `text-text-muted` | none | `bg-muted` |
| destructive | `bg-destructive` | `text-destructive-foreground` | `border-destructive` | opacity only |

Height at least 44px (`min-h-11`) for text buttons. Icon buttons may be 32px when grouped in a toolbar, with the hit area padded to 44px. Radius `rounded-md`. Hover does not translate. Focus uses `shadow-focus`. Disabled is reduced opacity and no pointer.

## Card

`bg-surface` or `bg-card`, `border-border`, `rounded-lg`, no resting shadow. Hover on a clickable card: `border-border` shifts toward `border-border` emphasis and `shadow-md`. Padding `p-md` or `p-lg`.

## StatCard

Label `text-label-md text-text-muted`. Value `text-headline-lg` or `font-mono text-mono-metric`. Delta uses a status color: up `text-status-strong`, due `text-status-review`, down `text-status-weak`.

## Badge / pill

Pill radius. Status pairs:

| Status | Text | Fill | Border |
|---|---|---|---|
| strong | `text-status-strong` | `bg-status-strong-bg` | `border-status-strong-border` |
| stable | `text-status-stable` | `bg-status-stable-bg` | `border-status-stable-border` |
| review | `text-status-review` | `bg-status-review-bg` | `border-status-review-border` |
| weak | `text-status-weak` | `bg-status-weak-bg` | `border-status-weak-border` |

Numerals inside a badge use `font-mono`. Filter chips: unselected `bg-surface text-secondary border-border`; selected `bg-primary-subtle text-primary border-primary-border`.

## Progress

Track `bg-muted`, height 4px or 6px, pill. Fill `bg-primary` or `bg-status-strong` when the run is complete. Ring uses the same colors. Motion `duration-slow` and respects reduced motion.

## Tabs / segmented control

Track `bg-muted` with `rounded-lg` and `p-xs`. Active segment `bg-surface text-primary shadow-sm`. Inactive `text-secondary`. Height at least 44px for the tap target.

## Data table

Desktop: `border-border`, header `text-label-sm uppercase text-text-muted`, row hover `bg-muted`. Below 768px the table becomes stacked cards (label above value). See `docs/design/responsive.md`. Wide tables scroll inside the table container, not the page.

## Modal / drawer

Modal: `bg-surface`, `rounded-xl`, `shadow-lg`, `border-border`, z `z-modal`. Drawer on mobile is the sidebar. Scrim sits at `z-sidebar` under the panel. Escape and a visible close control dismiss.

## Fields

Input, select, textarea, slider, toggle, checkbox.

- Text height 36px, search 40px, both with a 44px tap target when they sit alone.
- `bg-surface`, `border-border`, `rounded-md`, placeholder `text-text-subtle`.
- Focus: border `border-ring` and `shadow-focus`.
- Checkbox 16px, `rounded-sm`, checked `bg-primary`.
- Toggle uses `bg-primary` when on and `bg-muted` when off.

## Empty, error, skeleton

Empty and error keep an icon, a title (`text-headline-sm`), and one sentence (`text-body-md text-text-muted`). Skeleton blocks use `bg-muted` and `rounded-md`, no layout shift when data arrives.

## Charts

Sparkline stroke `text-primary` or `text-status-strong`, 1.5px. Heatmap steps go from `bg-accent/40` to `bg-accent` to `bg-primary`. Chart cards use the Card spec. No raw chart colors.

## Filter chips

Same as the badge selected/unselected pair. A row of chips wraps. It does not widen the page.

## Shell

Sidebar width `w-sidebar`, logo `h-logo`, header height `h-header`. Nav active state `bg-primary-subtle text-primary`. Below 768px the sidebar is a drawer opened from a menu button. Escape, the scrim, and the close control dismiss it. Search collapses to an icon button under 768. Top bar holds search, Add material, Start review, sync, credits, account. `PageHeader` is the in-page title block.

## Existing files

Keep these exports. Phase 2 changes their internals, not their names: AppShell, Sidebar, Button, Input, SecretInput, Select, Textarea, Toggle, Modal, Tabs, SegmentedControl, Badge, StatusChip, ScoreBadge, SyncStatusChip, StatCard, ProgressBar, ProgressRing, BurstProgress, DataTable, Table parts, EmptyState, ErrorState, Loader, ToastProvider, SearchInput, FilterBar, FileDropzone, QuestionCard, OptionList, AnswerEditor, FeedbackPanel, CitationList, ResultCard, SettingRow, Countdown, IntegrityBanner, FullscreenGate, EventTimeline, Heatmap, TrendChart.

Also exported: Card, PageHeader, Skeleton, Drawer, Slider, Checkbox, FilterChip, ChartFrame, Icon. Toast tones stay success, error, warning, info. Map warning to `status-review` when the toast is restyled.
