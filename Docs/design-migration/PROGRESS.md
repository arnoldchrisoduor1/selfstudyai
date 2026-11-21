# Design migration progress

Source of truth: `design-system/<folder>/code.html` + `screen.png`. Audit: `docs/design-migration/00-audit.md`. Deviations: `docs/design-migration/deviations.md`.

Frontend only. No backend edits. No renamed routes. No hard-coded color, type size, radius, shadow, or spacing in components.

## Phase 0 — Audit

- [x] List every design folder and the view it represents
- [x] Map each folder to an existing route, or mark new route needed
- [x] Read frontend structure, styling, component library, old design docs
- [x] Read backend routes and response types
- [x] Write `docs/design-migration/00-audit.md`

Done.

## Phase 1 — Tokens and design docs

- [x] Extract colors, type, spacing, radii, shadows, borders, z-index, motion from design HTML/CSS
- [x] Confirm icon set (Material Symbols Outlined) and type family (Inter, JetBrains Mono for metrics)
- [x] Define semantic CSS variables once in `packages/ui/tokens.css`; map into Tailwind theme
- [x] Replace old purple palette in the preset, fonts, and cursor rules
- [x] Write `docs/design/tokens.md`, `docs/design/components.md`, `docs/design/responsive.md`
- [x] Deprecate `design-system/self-study-ai/` and point cursor rules at the new docs
- [x] Add `npm run check:colors` (`scripts/check-no-hex.mjs`). Passed.

Stopped here. Phase 2 has not started. Responsive doc is drafted; Phase 2 still confirms it against the built shell.

## Phase 2 — Shared shell and components

- [x] App shell: sidebar, top bar, page header, matching the designs
- [x] Mobile: sidebar becomes a drawer; search collapses to an icon
- [x] Shared components: Button, Card, StatCard, Badge/Pill, ProgressBar/Ring, Tabs/SegmentedControl, DataTable (cards under 768px), Modal/Drawer, form fields, EmptyState, Skeleton, chart wrappers, filter chips
- [x] `/dev/components` gallery at desktop and mobile widths
- [x] Responsive rules in `docs/design/responsive.md`: 390 / 768 / 1280, no page-level horizontal scroll, 44px targets

Stopped here. First view is Overview, below.

## Views (build after Phase 2)

Routes from the audit. One view per pass.

- [x] Overview `/overview/` (two dark exports, one page). Reference width 949. Diff 8.44% against the light PNG. 13 backend gaps. See `docs/backend-gaps/overview.md`.
- [x] Subjects `/subjects/` (light + dark exports, one page). Reference width 1138. Diff 5.37% against the light PNG. 8 backend gaps. See `docs/backend-gaps/subjects.md`.
- [ ] Syllabus `/subjects/detail/` (new)
- [x] Library `/sources/` (light + dark exports, one page). Reference width 1018. Diff 5.85% against the light PNG. 5 backend gaps. See `docs/backend-gaps/library.md`.
- [ ] Add material `/sources/add/` (new)
- [x] Quizzes `/quizzes/` (dark export only, new route). Reference width 1208. Diff 10.01% against the dark PNG, measured with the dark token class on the screenshot. The page itself stays light. 8 backend gaps. See `docs/backend-gaps/quizzes.md`.
- [ ] Quiz session states `/study/session/`
- [x] Reviews `/study/` (light + dark exports, one page). Reference width 1168. Diff 7.64% against the light PNG. 8 backend gaps. See `docs/backend-gaps/reviews.md`.
- [ ] Flashcard mode `/study/session/`
- [x] Final tests `/tests/` (dark export only). Reference width 1004. Diff 7.88% against the dark PNG, measured with the dark token class on the screenshot. The page itself stays light. 7 backend gaps. See `docs/backend-gaps/final-tests.md`.
- [ ] Exam workspace `/tests/session/`
- [ ] Exam results `/tests/results/`
- [x] Analytics `/analytics/` (light + dark exports, new route). Reference width 795. Diff 9.76% against the light PNG. 9 backend gaps. See `docs/backend-gaps/analytics.md`.
- [x] Settings `/settings/` (FSRS + AI models; other tabs from the settings chrome). FSRS reference width 1218, diff 5.09%. AI models reference width 1187, diff 5.82%. Both light. 9 backend gaps. See `docs/backend-gaps/settings.md`.
- [ ] Onboarding `/onboarding/`, `/onboarding/subject/`, `/onboarding/ready/` (new)
- [ ] Create-account modal (no new route)
- [ ] Landing `apps/landing` `/` (pick one canonical pair; five exports exist)
- [ ] Pages with no new mock: subject form, source detail, test builder, privacy, terms
