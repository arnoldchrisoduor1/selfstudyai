> **Deprecated.** Retired purple system. Use `docs/design/tokens.md`. See `DEPRECATED.md`.

# Tabs

Pill tab list. Used for in-page panels (Overview insights, settings groups).

## Anatomy

- `role="tablist"` on a rounded track (`bg-muted`, padding).
- Each tab is `role="tab"`, min height 44px.
- Selected pill slides under the labels (`bg-card`, shadow). Text becomes foreground; idle is muted.
- Indicator transition 280ms ease. Instant under reduced motion.

## Tokens

- Track: `bg-muted`
- Selected: `bg-card`, `text-foreground`
- Idle: `text-muted-foreground`
