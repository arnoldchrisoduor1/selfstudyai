> **Deprecated.** Retired purple system. Use `docs/design/tokens.md`. See `DEPRECATED.md`.

# FileDropzone

Drag-and-drop upload control for study sources (notes and books).

## Anatomy

- Drop surface with dashed border
- Visible label + helper text
- Hidden file input (keyboard and click activate the same control)
- Optional accept hint (`.md`, `.txt`, `.pdf`, `.epub`)

## Behavior

- Click or keyboard activates the file picker
- Drop accepts a single file
- Disabled state blocks interaction
- Emits the selected `File` through `onFile`

## Tokens

- Surface: `bg-card`, `border-border`
- Focus: `ring-ring`
- Min height: 11 (44px target area expanded for drop)
