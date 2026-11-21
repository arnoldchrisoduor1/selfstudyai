# Overview gaps

Route: `/overview/`. Design: `design-system/overview_dark_mode_self_study_ai_2` (light shell). Dark twin: `overview_dark_mode_self_study_ai_1`. Placeholder: `apps/web/src/lib/placeholders/overview.ts`.

Live data already used: profile display name, `GET /dashboard` (`due_today`, streak, today answered/goal), `GET /learning-settings` (`desired_retention`), `GET /daily-activity` (weekly points, delta, chart bars), `GET /subjects`, `GET /questions?gold=true`, search navigation, review navigation.

| id | UI element | Design expects | Backend now | Suggested change |
|---|---|---|---|---|
| overview-1 | Knowledge Score card | Score out of 1000 plus a week-over-week point delta | Nothing. Dashboard has `total_points`, `level`, and `mastery[]`, not a 0–1000 index | Add `knowledge_score` and `knowledge_score_delta` on `GET /dashboard` |
| overview-2 | Reviews Due detail | Estimated minutes to finish the due queue | `due_today` is a count only | Add `estimated_review_minutes` on `GET /dashboard` or `GET /due-queue` |
| overview-3 | Questions Mastered card | Mastered count, weekly delta, long-term stability percent | `mastery[]` rows have `retention_estimate` and `recent_accuracy`, no mastered total | Add `mastered_count`, `mastered_delta`, and `stability_pct` on `GET /dashboard` |
| overview-4 | Gold Questions delta | Weekly change in gold count | `GET /questions?gold=true` returns the list, so the count is client-side. No weekly delta | Add `gold_count` and `gold_delta` on `GET /dashboard` |
| overview-5 | Continue studying card body | Category, chapter, syllabus percent, flashcard ratio, note count, last studied time | `Subject` is `id`, `name`, `description`, timestamps | Add a subject progress resource: category, current chapter, completion, card counts, note count, `last_studied_at` |
| overview-6 | Resume | Open the current chapter | No chapter or resume target | `POST /study/sessions` body should accept a subject chapter, or `GET /subjects/{id}/resume` returns a session route |
| overview-7 | Next recommended batch | Title, blurb, duration, question count, streak multiplier | Due queue items are `question_id` plus card state. No batch recommendation | Add `GET /due-queue/next-batch` with title, reason, `question_ids`, `estimated_minutes`, `points_multiplier` |
| overview-8 | Queued by retention decay | Subject name, average stability, overdue count, due count | `GET /due-queue` has no subject id, title, or group | Include `subject_id`, `subject_name`, and `question_title` on each item, or add `GET /due-queue/by-subject` |
| overview-9 | Upcoming Final Test | Future exam, countdown, readiness percent, target, configure action | `recent_tests` are past attempts. `Goal` has no route. No readiness score | Add `GET /tests/upcoming` with `scheduled_on`, `readiness`, `target_readiness`, and `PATCH` to set the date |
| overview-10 | Retention line and mastered tooltip | Daily FSRS retention series and cards mastered that day | `points_trend` and `daily-activity.points_earned` cover the bars. `accuracy_trend` is not a retention series. No per-day mastered count | Add `retention` to each `daily-activity` row and `cards_mastered` |
| overview-11 | Recent activity | Typed feed: upload, quiz, gold, review, with relative time | No activity feed. Sources, attempts, and the points ledger are separate | Add `GET /activity?limit=` with `kind`, `title`, `detail`, `occurred_at` |
| overview-12 | Weak topics Practice | Accuracy label and a practice action per topic | `weakest_topics[]` has `label`, `kind`, `recent_accuracy`, `due_count` when rows exist. No practice session for one topic | Add `POST /study/sessions` with `topic_id` |
| overview-13 | Greeting subject count | Count of subjects that have cards scheduled today | `due_today` is one number. Due items omit `subject_id`. The page uses `GET /subjects` length | Add `subjects_due` on `GET /dashboard` |
