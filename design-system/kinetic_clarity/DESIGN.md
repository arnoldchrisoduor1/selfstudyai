---
name: Kinetic Clarity
colors:
  surface: '#f8f9ff'
  surface-dim: '#cbdbf5'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e5eeff'
  surface-container-high: '#dce9ff'
  surface-container-highest: '#d3e4fe'
  on-surface: '#0b1c30'
  on-surface-variant: '#464555'
  inverse-surface: '#213145'
  inverse-on-surface: '#eaf1ff'
  outline: '#777586'
  outline-variant: '#c8c4d7'
  surface-tint: '#5145dc'
  primary: '#4233cd'
  on-primary: '#ffffff'
  primary-container: '#5b50e6'
  on-primary-container: '#e8e4ff'
  inverse-primary: '#c4c0ff'
  secondary: '#515f74'
  on-secondary: '#ffffff'
  secondary-container: '#d5e3fc'
  on-secondary-container: '#57657a'
  tertiary: '#714600'
  on-tertiary: '#ffffff'
  tertiary-container: '#925c00'
  on-tertiary-container: '#ffe3c6'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e3dfff'
  primary-fixed-dim: '#c4c0ff'
  on-primary-fixed: '#110068'
  on-primary-fixed-variant: '#3826c5'
  secondary-fixed: '#d5e3fc'
  secondary-fixed-dim: '#b9c7df'
  on-secondary-fixed: '#0d1c2e'
  on-secondary-fixed-variant: '#3a485b'
  tertiary-fixed: '#ffddb8'
  tertiary-fixed-dim: '#ffb95f'
  on-tertiary-fixed: '#2a1700'
  on-tertiary-fixed-variant: '#653e00'
  background: '#f8f9ff'
  on-background: '#0b1c30'
  surface-variant: '#d3e4fe'
typography:
  display-hero:
    fontFamily: Inter
    fontSize: 40px
    fontWeight: '600'
    lineHeight: 48px
    letterSpacing: -0.03em
  display-hero-mobile:
    fontFamily: Inter
    fontSize: 30px
    fontWeight: '600'
    lineHeight: 38px
    letterSpacing: -0.025em
  headline-lg:
    fontFamily: Inter
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 36px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Inter
    fontSize: 22px
    fontWeight: '600'
    lineHeight: 30px
    letterSpacing: -0.015em
  headline-sm:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 26px
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
    letterSpacing: -0.005em
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 22px
    letterSpacing: 0em
  body-sm:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
    letterSpacing: 0em
  label-md:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0em
  label-sm:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 14px
    letterSpacing: 0.04em
  mono-metric:
    fontFamily: JetBrains Mono
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: -0.02em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-desktop: 1.5rem
  margin: 1rem
  margin-desktop: 2rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2.5rem
---

## Brand & Style
The design system channels the deliberate focus and quiet precision of modern productivity tools like Linear and Notion. It is built for self-directed learners who value rigor, minimal cognitive friction, and continuous momentum over gamified clutter.

The aesthetic blends **Modern Minimalism** with **Tactile Precision**:
- **Clarity over ornament:** Visual weight is driven by typography, hairline borders, and intentional whitespace rather than heavy drop shadows or decorative gradients.
- **Deep focus cadence:** High-density data views balance with generous component padding to sustain multi-hour study sessions without sensory fatigue.
- **Deliberate rewards:** Milestones, streaks, and mastery progress rely on muted pastel tints and precise micro-indicators rather than loud, distracting celebration overlays.

## Colors
The palette leverages a warm, low-glare foundation paired with architectural slates and an authoritative electric indigo for primary interactions.

### Canvas & Surfaces
- **Canvas Base:** `#F8F9FA` for general page backgrounds, switching to `#FFFFFF` for elevated modular cards and active input surfaces.
- **Subsurface / Muted Wells:** `#F3F4F6` for code blocks, nested panel gutters, and subtle card backings.
- **Borders & Dividers:** Precise `#EAECF0` for structure-defining lines; `#E5E7EB` for interactive element borders and active outlines.

### Accents & Semantics
- **Primary Accent (`#5B50E6`):** Reserved for forward actions, active tab pills, focused caret/stroke rings, and high-priority learning paths.
- **Secondary Slate (`#475569` / `#64748B`):** Governs structural body typography, neutral icons, and utility controls.
- **Streaks & Retention (`#F59E0B` & `#FEF3C7`):** Warm amber paired with a delicate pastel cream background for streak tallies, XP counts, and milestone badges.
- **Mastery & Completion (`#10B981` & `#D1FAE5`):** Restrained emerald and soft mint containers for verified recall, test completions, and retention confidence curves.

## Typography
Typography is set entirely in **Inter**, relying on tightened tracking at scale and distinct weight steps to establish hierarchy without excessive size variations. **JetBrains Mono** is utilized strictly for contextual metadata, streak counters, study timers, and flashcard performance metrics.

- **Weight Disciplines:** Use Regular (`400`) for continuous text, Medium (`500`) for structural UI labels and interactive elements, and Semi-Bold (`600`) for titles and metric calls. Avoid weights above `600`.
- **Vertical Alignment:** Use tighter line-height on headings (`1.15` to `1.25`) and roomier line-height on learning material (`1.5` to `1.6`) to support extended reading comfort.

## Layout & Spacing
The layout follows a responsive 12-column fluid grid system bounded by a max-width container of `1280px` for desktop dashboards and `840px` for focused reading/study workspaces.

### Breakpoints & Behavior
- **Mobile (< 768px):** 4 columns, `margin: 1rem`, `gutter: 1rem`. Side navigation collapses into a bottom command bar or slide sheet. Complex panels reflow into full-width vertical stacks.
- **Tablet (768px - 1024px):** 8 columns, `margin: 1.5rem`, `gutter: 1rem`. Two-column study splits with persistent modular sidebars.
- **Desktop (> 1024px):** 12 columns, `margin: 2rem`, `gutter: 1.5rem`. Multi-pane workspace featuring collapsible left navigation (`240px` fixed), primary learning canvas (fluid), and contextual metadata drawer (`320px` fixed).

## Elevation & Depth
Depth in this system avoids heavy spatial layering. It is built upon hairline perimeter outlines and flat surface contrast, mirroring the tactile paper-and-canvas clarity of high-end productivity suites.

### Surface Tiers & Hairline System
- **Level 0 (Canvas):** `#F8F9FA`. Background ground plane.
- **Level 1 (Panels & Cards):** `#FFFFFF`, surfaced with a 1px border of `#EAECF0`. No shadow.
- **Level 2 (Hover States & Active Cards):** `#FFFFFF` paired with an ultra-subtle tinted ambient wash: `0 2px 8px -2px rgba(15, 23, 42, 0.04), 0 1px 2px -1px rgba(15, 23, 42, 0.02)`, with border shifting to `#E5E7EB`.
- **Level 3 (Command Menus & Overlays):** `#FFFFFF` with `0 12px 32px -8px rgba(15, 23, 42, 0.08), 0 4px 12px -4px rgba(15, 23, 42, 0.03)` and a crisp 1px `#E5E7EB` edge.
- **Focus Rings:** Non-offset, double-stroke simulated via `0 0 0 1px #5B50E6, 0 0 0 4px rgba(91, 80, 230, 0.12)`.

## Shapes
Shapes feature smooth, subtle rounding that avoids both brutalist harshness and playful bulbousness.

- **Base Radius (`0.5rem` / 8px):** Controls, toolbars, list row hovers, flashcard action keys, and input fields.
- **Large Radius (`rounded-lg` / `1rem` / 16px):** Modular study widgets, syllabus nodes, knowledge cards, and popover panels.
- **Extra Large Radius (`rounded-xl` / `1.5rem` / 24px):** Master workspace shells, modal dialogs, and parent progress containers.
- **Pills (`9999px`):** Used strictly for micro-status indicators, filter tags, keyboard shortcuts, and badge chips.

## Components

### Buttons
- **Primary:** Solid `#5B50E6` background, white text, 1px border in `#5B50E6`, subtle hover transition to `#4F44D8`.
- **Secondary / Ghost:** Transparent background, `#475569` text, 1px border in `#EAECF0`. Hover state triggers background `#F3F4F6` and text `#1E293B`.
- **Icon / Action:** 32x32px square with `rounded-md` (6px), transparent surface, `#64748B` icon fill, shifting to `#F3F4F6` surface on hover.

### Badges & Chips
- **Streak / Retention Badges:** Subtle pill shape. Background `#FEF3C7`, text `#B45309`, 1px border in `rgba(245, 158, 11, 0.2)`. Uses mono tracking for numerals.
- **Mastery Badges:** Background `#D1FAE5`, text `#065F46`, 1px border in `rgba(16, 185, 129, 0.2)`.
- **Category Filter Chips:** Pill shape, 24px height. Muted background `#FFFFFF`, text `#475569`, border `#EAECF0`. Selected state switches to `#5B50E6` text, `#EEF2FF` background, and `#C7D2FE` border.

### Inputs & Text Areas
- **Standard Input:** Height 36px (or 40px for prominent search). `#FFFFFF` background, 1px `#E5E7EB` border, placeholder in `#94A3B8`. 
- **Focus State:** 1px border transition to `#5B50E6` and an indigo halo (`rgba(91, 80, 230, 0.12)`).

### Cards & Knowledge Blocks
- Clean, bordered containment: `#FFFFFF` surface, 1px `#EAECF0` outline, `rounded-lg` corners.
- Interactive study cards feature a hover lift with border shifting to `#E5E7EB` and subtle elevation level 2.

### Selection Controls (Checkboxes & Radios)
- **Checkboxes:** 16x16px, `rounded` (4px), 1px border in `#CBD5E1`. Checked state fills `#5B50E6` with an etched white checkmark.
- **Radio Buttons:** 16x16px circle, 1px border in `#CBD5E1`. Checked state renders an inner 6px `#5B50E6` solid dot.

### Trend Sparklines & Retention Bars
- **Sparklines:** Delicately stroked (1.5px) vector paths using `#5B50E6` (retention) or `#10B981` (mastery) over a subtle gradient bleed that fades to transparent at 0% opacity.
- **Progress Track:** 4px or 6px tall pill rails. Track background `#F3F4F6`, fill indicator in `#5B50E6` or `#10B981` with smooth ease transitions.