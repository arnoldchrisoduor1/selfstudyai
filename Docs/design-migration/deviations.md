# Deviations

Differences from a design export, and why. Phase 1 records token choices. Later phases append screen defects.

## Token unification

Design HTML does not share one palette.

- Light product shell (`overview_dark_mode_self_study_ai_2`, despite the folder name) uses primary `#5b50e6`, canvas `#f8f9fc`, surface `#ffffff`, text `#111827`. Kinetic Clarity prose matches this accent.
- Light Material ramp (subjects, library, analytics light, and `kinetic_clarity/DESIGN.md` YAML) uses primary `#4233cd` and canvas `#f8f9ff`.
- Dark product screens (overview export 1, subjects dark, quizzes, reviews, analytics dark) use primary `#6366f1`, canvas `#0a0e18`, surface `#171b26` or `#0f131d`, text `#f8faff`.
- Dark Material ramp (`kinetic_obsidian/DESIGN.md` YAML) uses primary `#c0c1ff`.

Canonical tokens follow the product shell: light `#5b50e6`, dark `#6366f1`. One CSS variable set, switched with `.dark`. Pixel matching in later phases uses these tokens, not the Material YAML hex.

## Shell nav

The design sidebar items that have routes are linked, including Analytics at `/analytics/`. Components stays in the nav. Question bank `/questions/`, gold review `/questions/gold/`, search `/search/`, and credits `/credits/` are removed. Header search and Overview “Ask your notes” open the library with the query. The header still shows the credit balance. Labels that already have routes use the design names: Library, Reviews, Final Tests. The Reviews badge is `due_today` from `GET /dashboard` when that call succeeds.

## Measures

- Sidebar: prose says 240px. Shell HTML uses `w-64` (256px). Token `--layout-sidebar` is 256px.
- Dashboard max width: light prose 1280px, dark prose 1360px. Token `--layout-max` is 1280px so it matches the migration breakpoint.
- Radius: YAML `md` is 12px, prose base radius is 8px, previous preset `rounded-md` was 8px. `--radius-md` stays 8px for controls. `--radius-card` is 12px. `--radius-lg` is 16px and `--radius-xl` is 24px, from the prose large and extra-large steps.

## Overview

- Reference artboard is 949px wide and already shows the 5-column stat row and the 8/4 split. The HTML turns those on at `lg` (1024). This page uses `min-[949px]` so the reference viewport matches the PNG. 768 stays two columns. 390 stays one column.
- Design type at 26px, 17px, and 12px is not on the token scale. The greeting uses `headline-md` (22px) so the name stays on one line beside the streak widget. Section titles use `headline-sm` (18px). Metrics use `headline-md` (22px). Meta copy uses `label-sm` (11px) or `body-sm` (13px).
- Greeting uses the time of day plus `LocalProfile.display_name`. The PNG string is the static sample "Good morning, Arnold".
- Live counts replace sample figures wherever `GET /dashboard`, daily activity, subjects, or gold questions can fill them. Sample copy stays only on `BACKEND_GAP` fields.
- Subject progress bars use `primary`, `secondary`, and `status-review`. The export's orange machine-learning bar is not a separate token.
- Chart tooltip uses `foreground` / `background` instead of the export's `#202537` chip.
- Resume, burst, configure, and practice stay visible and disabled, with a "Coming soon" tooltip. `disabled:opacity-100` keeps the designed fill.

## Subjects

- Reference artboard is 1138px and already shows four stat cards and three subject cards. The HTML turns those on at `xl` (1280). This page uses `min-[1138px]` so the reference viewport matches the PNG. Under that width the stats stay two columns from 640px and the cards stay one column.
- The export uses the Material surface ramp (`surface-container`, `primary-container`). Cards use the product-shell tokens (`surface`, `primary`, `status-*`).
- New Subject and the dashed card open the existing `/subjects/new/` form. The design modal also asks for discipline, level, and a reference link, which `Subject` cannot store.
- The `more_vert` menu holds Edit and Delete so the current subject form and delete confirm stay reachable. The export only draws the icon.
- Open subject and View all modules stay disabled until a syllabus resource exists. Upload course files opens `/sources/`, where upload already lives.

## Library

- Reference artboard is 1018px and already shows four stat cards and the two-column breakdown. The HTML turns the stats on at `lg` (1024) and the breakdown at `lg`. This page uses `min-[1018px]` for those two grids. Featured textbooks stay three columns from `md` (768), matching the HTML.
- The export uses the Material surface ramp. This page uses the product-shell tokens.
- Upload still requires a subject, so a subject select sits on the drop zone. `POST /sources` has no library-wide upload.
- Core textbooks are the three newest documents in the current filter. There is no primary-reference flag.
- Document rows are a stacked list, not `DataTable`, so title, status, and the retry action stay on one row at the reference width. Under 768 the same row stacks.

## Reviews

- Reference artboard is 1168px. The HTML already turns the hero row, the four stat cards, and the weak-card row on at `lg` (1024), and the subject queues at `md` (768). This page uses those breakpoints. 768 keeps the queues at three columns. 390 stacks them.
- The export uses the Material surface ramp. This page uses the product-shell tokens.
- Subject, grounding, mode, and burst size stay on one scrolling row in the hero. Source and topic sit behind a Scope control so the hero stays one line. `POST /sessions` needs them, and the study tests drive `study-subject`, `study-mode`, `study-grounding`, `study-burst-size`, and `study-start`. The default mode stays Practice.
- Full session and Export deck stay visible and disabled, with a "Coming soon" tooltip.
- Forecast dates are the next seven local days. The counts stay the sample, because the due queue is only cards already due.
- Subject queues use live names, descriptions, and due counts. Difficult cards use live stems when a due card has lapses. Otherwise the three sample rows stay, with Practice disabled.

## Final tests

- The only export is dark (`final_tests_dark_mode_self_study_ai`). This page stays on the light product shell. The diff below is a dark-token screenshot against that PNG. The shipped page does not add `.dark`.
- Reference artboard is 1004px and already shows four stat cards, four create fields, and a one-row question mix. The HTML turns those on at `lg` (1024), and the featured stats at `md`. This page uses `min-[1004px]` for the stat row, the featured stats, the create grid, and the past-test row. At 768 the sidebar is still open, so four featured stats were too narrow.
- Format stays visible and disabled, with a "Coming soon" tooltip. `TestConfig` has no format.
- Application 30% is a cognitive-mix toggle. Multiple choice and Written stay a kind split that sums to 100. The export treats all three as one exclusive control.
- The inline form does not pick a source or topic. Those stay on `/tests/new/`.
- The subject filter stays above past tests. Past rows are a stacked list, not a table, so the review action stays on the row. Under 1004 the row stacks.
- A draft or in-progress test replaces the sample featured exam.

## Quizzes

- The only export is dark (`quizzes_dark_mode_self_study_ai`). This page stays on the light product shell. The diff is a dark-token screenshot against that PNG. The shipped page does not add `.dark`.
- Reference artboard is 1208px. The HTML already turns the header row and the recommended cards on at `lg` (1024), and the create fields on at `md`. This page uses those breakpoints.
- Quizzes is a study session. Generate and Start call `POST /sessions` and open `/study/session/`.
- Subject, notes versus online, material, question count, and focus are live. Multiple choice, written, the application slider, Customize, preview, and the results table stay disabled.
- Recommended cards use live subject names, due counts, and topic titles. Last score, the results rows, and the readiness chip stay on the placeholder.
- The shell links Quizzes. The question-bank icon changed to `list_alt` so Quizzes can use `quiz`.

## Analytics

- Reference artboard is 795px and already shows four stat cards and the 8/4 chart rows. The HTML turns the stats on at `xl` (1280) and the chart rows at `lg` (1024). This page uses `min-[795px]` for those grids. 768 stays two stat columns and stacked charts. 390 stays one column.
- Light and dark exports exist. This page stays on the light product shell. The diff is against the light PNG.
- Study hours, the daily heatmap, streak, due count, target retention, level, and scored tests are live. Semester, export, retention percent, concept coverage, knowledge score, the decay curve, cognitive load, the points split, and topic mastery stay on the placeholder.
- Topic rows scroll inside the card. At 795 the sidebar leaves a narrow content column, so the six-column row does not widen the page. Practice on a live topic starts a session. Sample rows stay disabled.
- The four stat cards use `minmax(0, 1fr)` so their labels wrap inside the same narrow column. The page does not scroll sideways.
- The shell links Analytics.

## Settings

- Two light exports, one route. Study (FSRS) is the tab on load. AI models is the other designed tab. Diffs: 5.09% at 1218 against the FSRS PNG, 5.82% at 1187 against the AI models PNG.
- Both artboards are wider than `lg` (1024). The settings subnav uses the HTML `lg:col-span-3` / `lg:col-span-9` split. Preset and model cards use `md:grid-cols-3`. 768 and 390 stack.
- Retention, new cards, max reviews (daily goal), burst size, and notes versus online are live. Weights, max interval, exam dates, the cycle timestamp, the credit tier, and the model-card choice stay on the placeholder or disabled.
- Subject rows scroll inside the card. The provider form sits under the AI models layout so a provider can still be added. It is below the first screen.
- The vertical nav keeps role `tab`. Accessible names still include Learning, AI providers, Questions, Account & sync, and Settings so the existing tests can open those panels.
- General holds the display name. Account & credits opens the existing sync panel. Library jumps to `/sources/`.

