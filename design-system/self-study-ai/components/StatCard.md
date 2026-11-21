> **Deprecated.** Retired purple system. Use `docs/design/tokens.md`. See `DEPRECATED.md`.

# StatCard

Compact metric display.

## Anatomy

- Label (muted)
- Value (heading weight)
- Optional hint or delta
- Optional leading icon slot

## Tokens

- Surface: `bg-card`, 1px `border-primary/30` all around, rounded-lg. Hover `border-primary/60`. No left bar.
- Label: `text-muted-foreground`
- Value: `text-foreground`, Lexend
- Hover: border/opacity only — no layout shift

## Motion

- Optional entrance handled by page (Reveal). Card itself idle.
