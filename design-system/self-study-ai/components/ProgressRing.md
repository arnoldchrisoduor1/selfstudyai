> **Deprecated.** Retired purple system. Use `docs/design/tokens.md`. See `DEPRECATED.md`.

# ProgressRing

Circular progress 0–100.

## Anatomy

- SVG ring track `stroke-muted`
- Fill `stroke-accent` or `stroke-primary`
- Center percentage overlay optional via label below
- `aria-valuenow` on progress role

## Motion

- Stroke dash animates from empty on mount unless `prefers-reduced-motion`
