# Sidebar

Quiet product rail. Card surface, right border `border`. Open width 240px (`w-60`); collapsed rail 64px (`w-16`).

Pinned to the viewport height. The page column scrolls; the rail does not. Nav list scrolls on its own when items overflow. Scrollbar is thin: thumb `primary`, track `muted`.

## Collapse

- Edge toggle (24px circle) straddles the right border (`right: -12px`). Chevron rotates 180° when collapsed. `aria-expanded`, `aria-controls`, visible focus. Hit target ≥ 44px.
- ⌘B / Ctrl+B toggles (handled by AppShell). Persist preference in `localStorage` key `self-study-sidebar-collapsed`.
- Width transitions 320ms `cubic-bezier(0.2, 0.7, 0.2, 1)`. Labels fade + slide 6px left over 160ms at the same start so text never wraps mid-transition (`whitespace-nowrap`, overflow hidden).
- `prefers-reduced-motion: reduce` → instantaneous state change.

## Items

- Each item: optional 20px icon + label. Min height 44px. `aria-current="page"` on the current route.
- Current: muted fill, primary text, 2px primary bar on the left edge. Not a solid primary pill.
- Hover: muted background. No layout shift / transforms on the row.
- Collapsed rail: labels stay in DOM at opacity 0 (screen readers). Hover/focus shows a tooltip to the right (foreground pill, background text, 160ms fade).

## Mobile (&lt; md)

- Off-canvas drawer (240px) over a dim scrim. Open/close via header menu control in AppShell. Escape and scrim click close. No icon-rail below `md`.
