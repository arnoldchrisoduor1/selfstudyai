> **Deprecated.** Retired purple system. Use `docs/design/tokens.md`. See `DEPRECATED.md`.

# Overview

Learning dashboard at `/overview/`. Full width of the main column. One surface, not a stack of loose cards.

## Layout

1. **Hero** — status line + Start studying / Continue studying. Soft primary wash.
2. **Stat row** — Points, Level, Streak, Due today. Count-up. Thin `border-primary/30` all around.
3. **Today** — ProgressRing + goal bar in the same card.
4. **Insights panel** — one card. Pill tabs: Activity, Trends, History. Panel content crossfades.
   - Activity: heatmap.
   - Trends: accuracy + points area charts.
   - History: recent tests table flush inside the card (no second frame). Weakest topics table only when rows exist.
5. Empty tests: EmptyState inside the History tab.

## Motion

- Section stagger (`Reveal`).
- Tab indicator slides. Panel fades up on change.
- Charts draw their stroke; area fades in. Last point pulses unless reduced motion.
- Heatmap cells scale in, then grow slightly on hover.

## Tokens

- Cards: `bg-card`, 1px `border-primary/30` all around. No left bar.
- Today's goal, Insights shell, and each tab panel use that border. Hover may deepen to `border-primary/60`.
- Tab track: `bg-muted`; selected pill: `bg-card` + shadow
- Chart strokes: `accent` and `primary`
