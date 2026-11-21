# Heatmap

Calendar grid of activity intensity (~12 weeks).

## Anatomy

- Columns = weeks, cells stacked by weekday (Mon→Sun style via date order)
- Cell color by questions_answered tier: `bg-muted`, `bg-accent/40`, `bg-accent`, `bg-primary`
- Tooltip via `title` with date and counts
- Legend: Less → More
- `role="img"` + `aria-label` on grid

## Motion

- Cells fade in with staggered delay unless `prefers-reduced-motion`
