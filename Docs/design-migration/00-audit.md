# Phase 0 audit

Source of truth for the new UI: `design-system/<folder>/`. Each view folder has `code.html` and `screen.png`. No per-view notes files. System-level token drafts already exist:

- Light: `design-system/kinetic_clarity/DESIGN.md`
- Dark: `design-system/kinetic_obsidian/DESIGN.md`

`design-system/self-study-ai/` is the old system. Do not treat it as the new source of truth.

Frontend only. Do not change backend crates. Do not rename existing routes. New screens get new routes.

Apps:

- Study app: `apps/web` (Next.js static export, `trailingSlash: true`, optional `NEXT_PUBLIC_BASE_PATH`).
- Marketing: `apps/landing` (separate app, same static-export rules). The two apps never import each other.
- Shared controls: `packages/ui/src` (flat, no barrel). Web HTTP goes through `apps/web/src/lib/api-client.ts` only.

## View map

Shell navigation in the new designs (labels only; hrefs stay on the routes below): Overview, Subjects, Library, Quizzes, Reviews, Final Tests, Analytics, Settings. Top bar: search, Add material, Start review, sync state, Cloud AI credits, account menu.

Theme column: folder is the light export, the dark export, or the only export.

| Design folder | View | Theme | Route |
|---|---|---|---|
| `overview_dark_mode_self_study_ai_1` | Overview dashboard | dark (export 1) | existing `apps/web` `/overview/` |
| `overview_dark_mode_self_study_ai_2` | Overview dashboard | dark (export 2) | same route. Same copy and IA as export 1. Diff pixels in implementation; do not ship two overview pages |
| `subjects_self_study_ai` | Subjects and curricula list | light | existing `/subjects/` |
| `subjects_dark_mode_self_study_ai` | Subjects and curricula list | dark | same route |
| `distributed_systems_syllabus_self_study_ai` | Subject syllabus workspace | light | **new route** `/subjects/detail/` (query `id`, same pattern as `/sources/detail/`). Do not reuse `/subjects/edit/` |
| `distributed_systems_syllabus_dark_mode_self_study_ai` | Subject syllabus workspace | dark | same new route |
| `library_self_study_ai` | Course material and library | light | existing `/sources/` (nav label becomes Library) |
| `library_dark_mode_self_study_ai` | Course material and library | dark | same route |
| `add_material_self_study_ai` | Add material (upload, URL, queue) | light only | **new route** `/sources/add/` |
| `search_results_self_study_ai` | Search results | light only | existing `/search/` |
| `quizzes_dark_mode_self_study_ai` | Quizzes and assessments hub | dark only | **new route** `/quizzes/`. Not `/questions/` (question bank) and not `/tests/` (final exams) |
| `quiz_session_active_question_self_study_ai` | Quiz question, unanswered | light only | existing `/study/session/` state |
| `quiz_session_answer_feedback_self_study_ai` | Quiz question, after answer | light only | same route, feedback state |
| `reviews_self_study_ai` | Spaced repetition home | light | existing `/study/` (nav label becomes Reviews) |
| `reviews_dark_mode_self_study_ai` | Spaced repetition home | dark | same route |
| `flashcard_review_self_study_ai` | Flashcard review (Again / Good / Easy) | light only | existing `/study/session/` mode |
| `final_tests_dark_mode_self_study_ai` | Final tests list | dark only | existing `/tests/` (nav label becomes Final Tests) |
| `exam_workspace_self_study_ai` | Timed exam in progress | light | existing `/tests/session/` |
| `exam_workspace_dark_mode_self_study_ai` | Timed exam in progress | dark | same route |
| `final_exam_results_distributed_systems_self_study_ai` | Exam results | light only | existing `/tests/results/` |
| `analytics_self_study_ai` | Analytics | light | **new route** `/analytics/` |
| `analytics_dark_mode_self_study_ai` | Analytics | dark | same new route |
| `settings_study_fsrs_self_study_ai` | Settings, Study (FSRS) tab | light only | existing `/settings/` tab |
| `settings_ai_models_self_study_ai` | Settings, AI models tab | light only | same route, other tab |
| `onboarding_step_1_welcome_self_study_ai` | Onboarding welcome (local vs account) | light only | **new route** `/onboarding/` |
| `onboarding_step_2_create_subject_self_study_ai` | Onboarding first subject | light only | **new route** `/onboarding/subject/` |
| `onboarding_step_3_ready_self_study_ai` | Onboarding ready | light only | **new route** `/onboarding/ready/` |
| `create_account_sync_upgrade_self_study_ai` | Create account and sync upgrade | light only | no new route. Modal on onboarding step 1 and on the settings Account tab |
| `marketing_landing_page_self_study_ai` | Marketing landing | light | existing `apps/landing` `/` |
| `marketing_landing_page_constellation_dark_self_study_ai` | Marketing landing, constellation | dark | same route, alternate export |
| `marketing_landing_page_constellation_dark_cinematic_self_study_ai` | Marketing landing, cinematic | dark | same route, alternate export |
| `marketing_landing_page_constellation_interactive_hero_self_study_ai` | Marketing landing, interactive hero | dark | same route, alternate export |
| `marketing_landing_page_constellation_interactive_hero_cta_self_study_ai` | Marketing landing, interactive hero CTA | dark | same route, alternate export |

Five marketing folders are one route. Phase 1+ must pick one canonical export (light and dark) and record the others in `deviations.md` if they are dropped. Do not build five landing pages.

`apps/web` `/` stays a redirect to `/overview/`.

### Existing pages with no new design folder

Keep the routes. Restyle them with the new shell and tokens when their parent view is built. Do not invent screens.

| Route | What it is today |
|---|---|
| `/subjects/new/`, `/subjects/edit/` | Subject create and edit form |
| `/sources/detail/` | One source, topics, chunks |
| `/tests/new/` | Final-test builder |
| `/questions/`, `/questions/gold/` | Question bank and gold-review queue |
| `/credits/` | Credit balance, ledger, top-up |
| `/dev/components/` | Component gallery (Phase 2 rebuilds this page) |
| `apps/landing` `/privacy/`, `/terms/` | Legal pages. Old specs only: `design-system/self-study-ai/pages/privacy.md`, `terms.md` |

### Nav label changes (routes unchanged)

| Current label | Current href | New label |
|---|---|---|
| Sources | `/sources/` | Library |
| Study | `/study/` | Reviews |
| Tests | `/tests/` | Final Tests |
| Questions, Gold, Credits, Components | unchanged hrefs | not in the design sidebar. Credits move into the top bar and Settings → Account. Gold stays reachable from the question bank until a design covers it |

## Frontend structure

Direction: `pages/` thin → `sections/` compose → `components/` and `@self-study/ui/*`. Sections do not import sections. No raw `button`, `input`, `select`, `textarea`, or `table` in a section or page.

### Routes (`apps/web/src/pages`)

`index.tsx` (redirect), `overview/index.tsx`, `subjects/index.tsx`, `subjects/new.tsx`, `subjects/edit.tsx`, `sources/index.tsx`, `sources/detail.tsx`, `study/index.tsx`, `study/session.tsx`, `tests/index.tsx`, `tests/new.tsx`, `tests/session.tsx`, `tests/results.tsx`, `questions/index.tsx`, `questions/gold.tsx`, `search/index.tsx`, `credits/index.tsx`, `settings.tsx`, `dev/components.tsx`.

### Data hooks (keep)

`useSubjects`, `useSources`, `useTopics`, `useSettings`, `useProviders`, `useAuth`, `useSync`, `useCountUp`.

### App-local components (`apps/web/src/components`)

`ShellTopBar`, `NavIcon`, `EncouragementTicker`, `Reveal`, `LearningSettingsPanel`, `SubjectLearningPanel`, `AccountSyncPanel`, `ProvidersPanel`, `QuestionsSettingsPanel`.

Landing-only: `LandingHeader`, `LandingFooter`, `SectionHeading`, `FaqItem`, `StructuredData`.

### Shared library (`packages/ui`, import `@self-study/ui/<Name>`)

`AppShell`, `Sidebar`, `Button`, `Input`, `SecretInput`, `Select`, `Textarea`, `Toggle`, `Modal`, `Tabs`, `SegmentedControl`, `Badge`, `StatusChip`, `ScoreBadge`, `SyncStatusChip`, `StatCard`, `ProgressBar`, `ProgressRing`, `BurstProgress`, `DataTable`, `Table` plus head/body/row/cell/header-cell, `EmptyState`, `ErrorState`, `Loader`, `ToastProvider`, `useToast`, `SearchInput`, `FilterBar`, `FileDropzone`, `QuestionCard`, `OptionList`, `AnswerEditor`, `FeedbackPanel`, `CitationList`, `ResultCard`, `SettingRow`, `Countdown`, `IntegrityBanner`, `FullscreenGate`, `EventTimeline`, `Heatmap`, `TrendChart`, `icons` (inline SVG: check, close, info, alert).

Phase 2 extends this set. It does not add a second component library.

## Styling stack

- Tailwind 3.4. Theme from `packages/ui/tailwind.preset.ts`, consumed by `apps/web/tailwind.config.ts` and `apps/landing/tailwind.config.ts`.
- Global CSS: `apps/web/src/styles/globals.css` (base colors via `@apply`, scrollbar, motion keyframes, `prefers-reduced-motion`). Landing globals are the base layer plus reduced motion only.
- Colors in the preset are raw hex (`primary #7C3AED`, `background #FAF5FF`, and the rest of the purple palette). There is no `:root` token file. `MASTER.md` lists CSS variables that the apps do not define.
- Fonts: `next/font` in `apps/web/src/pages/_app.tsx` loads Lexend (`--font-heading`) and Source Sans 3 (`--font-body`).
- Icons in the app are hand-drawn SVG. Every new design HTML loads **Material Symbols Outlined** (`https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined`). Phase 1 uses that set.
- New type family in both `DESIGN.md` files and the HTML: **Inter**.
- New color system is Material-style: light `kinetic_clarity` (primary `#4233cd`, surface `#f8f9ff`) and dark `kinetic_obsidian` (surface `#0f131d`). HTML tailwind configs repeat those ramps and also use arbitrary values (`text-[13px]`, some raw hex). Phase 1 collapses those into semantic CSS variables and maps them into the Tailwind theme. Components must not keep hex, raw font sizes, radii, shadows, or spacing.

## Old design docs to replace

Whole tree `design-system/self-study-ai/`:

- `MASTER.md` (purple palette, Lexend, Source Sans 3, spacing, shadows, button specs)
- `landing.md` and `pages/*.md` (overview, subjects, subject-form, sources, source-detail, search, study, study-session, questions, gold-review, test-builder, test-history, test-session, test-results, settings, credits, account, components, landing, privacy, terms)
- `components/*.md` (AppShell, Sidebar, TopBar, Button, inputs, Modal, tables, charts, study and test widgets, landing widgets)

Cursor rules that still point at that tree (update in Phase 1, do not leave them describing the purple system):

- `.cursor/rules/structure.mdc`
- `.cursor/rules/ui-structure.mdc`

Phase 1 writes the replacement set the migration asked for:

- `docs/design/tokens.md`
- `docs/design/components.md`
- `docs/design/responsive.md`

Mark `design-system/self-study-ai/` deprecated in that same phase. Keep `kinetic_clarity/DESIGN.md` and `kinetic_obsidian/DESIGN.md` as the extracted token source until `docs/design/tokens.md` supersedes them.

## Backend capability list

HTTP API is `crates/api/src/routes/mod.rs`. JSON shapes are `study_core` types unless noted. Deletes return `204` with no body. This is the data the UI can show. Anything else in a design is unsupported until the backend grows, and the UI must not fake it with a private API.

### Health and clock

| Method | Path | Returns |
|---|---|---|
| GET | `/healthz` | `{ status: "ok" }` |
| POST | `/dev/clock` | clock JSON (dev) |
| POST | `/dev/clock/advance` | clock JSON (dev) |

### Subjects, settings, profiles

| Method | Path | Returns |
|---|---|---|
| GET, POST | `/subjects` | `Subject[]` / `Subject` (`id`, `name`, `description`, timestamps) |
| GET, PATCH, DELETE | `/subjects/{id}` | `Subject` / `204` |
| GET, POST | `/settings` | `Setting[]` / `Setting` (`id`, `key`, `value`, timestamps) |
| GET, PATCH, DELETE | `/settings/{id}` | `Setting` / `204` |
| GET, POST | `/local-profiles` | `LocalProfile[]` / `LocalProfile` (`id`, `display_name`, timestamps) |
| GET, PATCH, DELETE | `/local-profiles/{id}` | `LocalProfile` / `204` |

`Goal` exists on the core type only (`id`, `subject_id`, `title`, timestamps). No goal route. No exam-date field on `Subject`.

### Sources, topics, search

| Method | Path | Returns |
|---|---|---|
| GET, POST | `/sources` | `Source[]`. POST is multipart file upload (`subject_id`, `file`, optional `title`, `kind`) |
| GET, DELETE | `/sources/{id}` | `Source` / `204` |
| POST | `/sources/{id}/reembed` | `Source` |
| GET | `/topics?source_id=` | `Topic[]` (`id`, `source_id`, `parent_id`, `title`, `position`, `is_core`, timestamps) |
| PATCH | `/topics/{id}` | `Topic` (`title`, `position`, `is_core`) |
| GET | `/chunks?source_id=&topic_id=` | `Chunk[]` (`text`, `token_count`, `page_ref`, `position`, …) |
| POST | `/search` | `SearchHit[]` (`chunk_id`, titles, `page_ref`, `text`, `score`). Body: `query`, optional `subject_id`, `source_id`, `topic_id`, `limit` 1–50 |

`Source` fields: `subject_id`, `title`, `kind` (`notes` or `book`), `file_name`, `content_hash`, `status` (`pending`, `processing`, `ready`, `failed`), `error`, `progress`, `needs_reembed`, timestamps. No URL ingest. No storage-quota field.

### Providers

| Method | Path | Returns |
|---|---|---|
| GET, POST | `/ai-providers` | `AiProvider[]` / `AiProvider` |
| GET, PATCH, DELETE | `/ai-providers/{id}` | `AiProvider` / `204` |
| POST | `/ai-providers/test` | `{ ok, message }` |
| POST | `/ai-providers/default` | `204` |
| GET, POST | `/web-search-providers` | `WebSearchProvider[]` / one |
| GET, PATCH, DELETE | `/web-search-providers/{id}` | one / `204` |
| POST | `/web-search-providers/test` | `{ ok, message }` |
| POST | `/web-search-providers/default` | `204` |

`AiProvider`: `name`, `kind` (`openai_compatible`, `ollama`, `mock`), `base_url`, `has_api_key`, `api_key_hint`, `chat_model`, `embedding_model`, `embedding_dimensions`. Raw keys are write-only.

### Questions and study sessions

| Method | Path | Returns |
|---|---|---|
| GET | `/questions` | `Question[]`. Filters via query string |
| GET, PATCH, DELETE | `/questions/{id}` | `Question` / `204` |
| POST | `/questions/{id}/archive`, `/flag`, `/gold-review`, `/gold` | `Question` |
| GET | `/questions/gold/queue` | `Question[]` |
| GET, PATCH | `/question-settings` | `QuestionSettings` (`default_burst_size`, `cognitive_mix` recall/understand/apply/analyze, `default_grounding_mode`) |
| GET, POST | `/sessions` | open `StudySession[]` / created session |
| GET | `/sessions/{id}` | `StudySession` |
| POST | `/sessions/{id}/end` | `StudySession` |
| GET | `/sessions/{id}/burst` | `BurstResponse` (session, `burst_index`, `QuestionPublic[]`, `answered_ids`, `partial_error`) |
| POST | `/sessions/{id}/answer` | `AnswerResponse` (`Attempt`, full `Question`, `low_confidence`) |
| POST | `/sessions/{session_id}/attempts/{attempt_id}/override` | `Attempt` |

`Question` adds `correct_option`, `model_answer`, `explanation` on top of the public fields (`stem`, `options`, `kind`, `cognitive_level`, `grounding`, `citations`, `is_gold`, `gold_status`, `status`). `Attempt`: `answer_text`, `selected_option`, `score`, `verdict`, `feedback`, `graded_by`, `confidence`, originals, `time_taken_ms`. Session create body: `subject_id`, `scope` (`source_ids`, `topic_ids`), `grounding_mode`, `burst_size`, optional resume id, `mode` (`practice`, `review_due`, `mixed`).

There is no separate Quiz resource. In-progress quizzes in the designs are study sessions.

### Learning, reviews, dashboard

| Method | Path | Returns |
|---|---|---|
| GET, PATCH | `/learning-settings` | `ResolvedLearningSettings` (`settings` + per-field `sources`) |
| GET | `/due-queue` | `DueQueueItem[]` (`question_id`, `CardState`, `overdue_days`) |
| GET | `/dashboard` | `Dashboard` |
| GET | `/points-ledger` | `PointsLedgerEntry[]` |
| GET | `/streak` | `StreakInfo` (`current`, `longest`, `timezone`) |
| GET | `/daily-activity` | `DailyActivity[]` (`date`, `questions_answered`, `points_earned`, `minutes_studied`, `goal_met`) |
| POST | `/learning/backfill` | status JSON |

`Dashboard`: `total_points`, `level`, `level_progress`, `streak`, `today` (`date`, `answered`, `goal`, `points_earned`, `goal_met`), `due_today`, `heatmap[]`, `accuracy_trend[]`, `points_trend[]`, `mastery[]`, `weakest_topics[]`, `recent_tests[]`.

`MasteryRow`: `id`, `label`, `kind`, `retention_estimate`, `recent_accuracy`, `due_count`.

`CardState`: `due`, `stability`, `difficulty`, `state`, `reps`, `lapses`, `last_review`.

`LearningSettings`: `desired_retention` (0.7–0.99), `daily_goal`, `new_questions_per_day`, `review_new_ratio`, `timezone`, `rating_thresholds`, `points` config, `streak` rules, `test_defaults`. No raw FSRS weight vector.

### Final tests

| Method | Path | Returns |
|---|---|---|
| GET, POST | `/tests` | `FinalTest[]` / `FinalTest`. POST body is `TestConfig` |
| GET | `/tests/{id}` | `TestDetail` (`test`, `questions: QuestionPublic[]`) |
| POST | `/tests/{id}/start`, `/submit`, `/expire` | `FinalTest` |
| POST | `/tests/{id}/answer` | `AnswerWithLeakGuard` |
| POST | `/tests/{id}/integrity-events` | `IntegrityEvent` |
| GET | `/tests/{id}/results` | `TestResults` |

`FinalTest`: `subject_id`, `config`, `status`, `started_at`, `submitted_at`, `time_limit_s`, `score`, `pass`, `integrity_status`, timestamps.

`TestResults`: `test`, `score`, `pass`, `time_taken_s`, `per_question[]` (attempt + full question), `topic_breakdown[]` (`topic_title`, `answered`, `correct`, `average_score`), `integrity_timeline[]`.

`TestConfig`: subject, source ids, topic ids, `question_count` 1–100, `time_limit_s`, kind mix (mcq + written = 100), cognitive mix, `include_gold`, `use_existing`, `pass_mark`, `feedback_timing`, `navigation`, `focus_mode`.

### Auth, sync, credits, export

| Method | Path | Returns |
|---|---|---|
| POST | `/auth/sign-up` | `UserAccount` (`id`, `email`, `email_verified`, timestamps) |
| POST | `/auth/sign-in` | `{ user, session }` plus Set-Cookie, or `{ user, bearer_token, session }` when `x-study-client: desktop` |
| GET | `/auth/me` | `AuthMe` (`user`, `sessions[]`) |
| POST | `/auth/verify` | `204` |
| POST | `/auth/password-reset`, `/auth/password-reset/confirm` | `204` |
| POST | `/auth/logout`, `/auth/logout-all`, `/auth/delete-account` | `204` |
| POST | `/auth/link-local` | JSON (`LinkLocalDataRequest.confirm`) |
| GET | `/sync/status` | `SyncStatus` (`state` synced/syncing/offline/error, `last_sync_at`, `message`) |
| POST | `/sync/pull` | `SyncPullResponse` (`records[]`, `next_cursor`, `has_more`) |
| POST | `/sync/push` | `SyncPushResponse` (`accepted`, `conflicts`, `errors`) |
| GET | `/credits/balance` | `CreditsBalance` (`balance`, `reserved`, `available`) |
| GET | `/credits/ledger` | `CreditsLedgerEntry[]` (`amount`, `kind` topup/usage/refund/adjustment, `reference`) |
| POST | `/credits/topup`, `/credits/admin/adjust` | `CreditsLedgerEntry` |
| GET | `/export` | `{ exported_at, user_id, subjects, settings, profiles }` only |

No display name on `UserAccount` (email only). `LocalProfile.display_name` is the local name. No credit cap (the "840 / 1,000" chip has a balance, not a quota). No onboarding-progress resource. No theme-preference resource (`Setting` key/value can store a client preference).

### Design numbers the API does not return

Record these again in `deviations.md` when a screen is built. Do not hard-code the sample figures from the HTML.

- Knowledge score out of 1000, weekly point totals, "points vs last week", predicted exam readiness, retention-decay series, lapse-frequency table, per-topic stability intervals beyond `MasteryRow` and `CardState`.
- Study-time total in hours (only per-day `minutes_studied`).
- Exam date, "final in N days", onboarding goal (`pass an exam` vs `learn thoroughly`). `Goal` has no route.
- Syllabus chapter counts as a subject-level tree. Topics hang off a source (`parent_id` is the only hierarchy).
- URL import, storage quota, deck export of cards (export is subjects + settings + profiles).
- FSRS weight sliders. Settings expose `desired_retention` and scheduling caps, not solver weights.
- A first-class in-progress quiz separate from `StudySession` and `FinalTest`.
- Greeting name other than `LocalProfile.display_name` or the email local-part.

Client-side sums of `DailyActivity` and `PointsLedgerEntry` are allowed. New endpoints are not.
