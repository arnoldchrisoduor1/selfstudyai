> **Deprecated.** Retired purple system. Use `docs/design/tokens.md`. See `DEPRECATED.md`.

# Button

Heights ≥ 44px. Radius `rounded-xl`. One chrome family (Start studying look).

## Variants

- **primary** (default) — gradient `secondary → primary`, white label, soft primary shadow. Status machine optional.
- **secondary** — same chrome as primary (no old outline style).
- **accent** — accent gradient fill, same shape/shadow rules.
- **destructive** — destructive gradient fill.
- **quiet** — no fill, no shadow. Primary text, muted hover. For inline row actions.
- **quiet-destructive** — same shape as quiet, destructive text, `bg-destructive/10` on hover.

## Status

`idle` | `loading` | `success` | `error`. Optional `onAction(): Promise` or controlled `status`.

- Loading: shimmer + dots; `aria-busy`.
- Success / error: icon + label, reset after `resetDelay` (default 2200ms).
- Hover: opacity / shadow only — no layout-shifting scale.

## Focus

Visible ring `ring-ring`. `cursor-pointer` when idle.

## Top bar

No Sign in button in TopBar. Offline/sync chip + email when signed in. Account actions live under Settings.
