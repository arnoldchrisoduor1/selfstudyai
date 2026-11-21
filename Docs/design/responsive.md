# Responsive

Check every view at three widths: **390**, **768**, **1280**. No horizontal scroll on the page at any of them. A wide table, chart, or code block scrolls inside its own container.

Tailwind screens used for this: default (under 768), `md` (768), `xl` (1280). The design prose also mentions an 8-column band from 768 to 1024. Treat `lg` (1024) as the point where the 12-column workspace and the fixed sidebar can show together. 1280 is the width that must look like the desktop mock.

## Columns and margins

| Width | Columns | Page margin | Gutter |
|---|---|---|---|
| under 768, including 390 | 4 | `--space-margin` (16px) | `--space-gutter` (16px) |
| 768 to 1279 | 8 | 24px | `--space-gutter` |
| 1280 and up | 12 | `--space-margin-desktop` (32px) | `--space-gutter-desktop` (24px) |

Workspace content max width is `--layout-max` (1280px). Reading and exam columns max out at `--layout-reading` (840px).

## Shell

- Sidebar is `--layout-sidebar` (256px) at 1280. It stays available from 1024 up.
- Under 768 the sidebar is off-canvas. A menu button in the header opens it as a drawer (`z-sidebar`) with a scrim. Escape and scrim click close it.
- Header is `--layout-header` (64px). Under 768 the search field collapses to an icon button that opens the field.
- Stacked page grids become one column under 768. Two-column study layouts may remain at 768 when both columns are still readable.

## Tables, targets, motion

- Data tables render as stacked cards under 768. Each card shows the column label with the cell value.
- Touch targets are at least 44px on the short side. Toolbar icon glyphs may be 32px if the button box is 44px.
- Do not use a hover translate that shifts layout.
- `prefers-reduced-motion: reduce` shortens animation and transition to nearly zero. Do not rely on motion to convey state.
