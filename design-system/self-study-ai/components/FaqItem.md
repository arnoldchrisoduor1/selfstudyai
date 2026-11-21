# FaqItem

One FAQ entry using native `<details>` / `<summary>` (no raw button in section).

## Anatomy

- Summary: question, `font-semibold`, pointer cursor
- Body: answer, `text-muted-foreground`

## A11y

- `<details>` provides keyboard expand/collapse.
- Summary is the only interactive control in the row.