> **Deprecated.** Retired purple system. Use `docs/design/tokens.md`. See `DEPRECATED.md`.

# Toast

Custom. No toast library. Mount once in `pages/_app.tsx`.

## Look

Dark glass card (`foreground/90` surface, light text), blur, soft tone blob. Top-right stack on desktop; centered top on narrow. Width ~22rem.

## Anatomy

- Tone icon in a countdown ring (stroke dashes over `duration`, default 4s). Ring finish dismisses.
- Title = `push` message. Optional description later.
- Dismiss control. Pause countdown on hover/focus.
- `role="alert"` for error/warning; `status` otherwise.

## API

`useToast().push(message, tone?)` — tones: success, error, warning, info. Unchanged call sites.
