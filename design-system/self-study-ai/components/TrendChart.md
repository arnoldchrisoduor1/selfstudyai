# TrendChart

Area chart on a card, or flush when a parent already provides the surface (`embedded`).

## Anatomy

- Label + latest value
- SVG: faint horizontal grid, gradient area, smooth stroke
- Dots on points; last dot pulses
- Accessible summary

## Motion

- Stroke draws via `pathLength` dashoffset (~900ms)
- Area fades in with the stroke
- Skip draw when `prefers-reduced-motion`
