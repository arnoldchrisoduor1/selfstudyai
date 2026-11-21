# Analytics gaps

Route: `/analytics/` (new). Design: `design-system/analytics_self_study_ai` (light). Dark twin: `analytics_dark_mode_self_study_ai`. Placeholder: `apps/web/src/lib/placeholders/analytics.ts`.

Live data already used: `GET /dashboard` (streak, level, total points), `GET /daily-activity` (study hours, 12-week heatmap), `GET /learning-settings` (`desired_retention`), `GET /due-queue`, `GET /subjects`, `GET /tests` (scored tests), `GET /sources`, `GET /topics/{source}`, `GET /questions` (topic join for lapses). Adjust Parameters opens `/settings/`. Practice on a live topic calls `POST /sessions`.

`Dashboard.mastery` and `weakest_topics` are empty. `accuracy_trend` is points per answer, not a retention percent. Ledger reasons are only `answer` and `override_compensation`.

| id | UI element | Design expects | Backend now | Suggested change |
|---|---|---|---|---|
| analytics-1 | Semester range | A semester window beside 7 days, 30 days, and all time | Daily activity is a date list. No semester boundary | Add a semester start date on the profile or settings |
| analytics-2 | Export report | A downloadable analytics report | `GET /export` is subjects, settings, and profiles | Add an analytics export, or drop the button |
| analytics-3 | Retention rate and decay curve | A percent, a monthly delta, and a recall curve versus the target | No retention series. `accuracy_trend` is points per answer | Add retention by elapsed day, plus a current rate and delta |
| analytics-4 | Concepts mastered | "342 of 410" and coverage | Topics exist per source. No mastered flag. Due count is separate | Add mastered and total concept counts |
| analytics-5 | Knowledge score | "884 / 1,000" and a band | `total_points` and `level` are not a 1,000-point score | Add a bounded knowledge score, or show points as points |
| analytics-6 | Cognitive load | Hours per subject, modality mix, peak window | `minutes_studied` is per day, not per subject or hour of day | Add subject minutes, modality, and a peak-hour summary |
| analytics-7 | Points breakdown | Reviews, quizzes, gold, and streak shares | Ledger reasons do not split that way | Add a reason per surface, or a breakdown endpoint |
| analytics-8 | Topic table | Mastery, stability band, lapse filter, details | Due cards have stability and lapses, not a topic mastery score | Add topic mastery and a lapse filter |
| analytics-9 | Score chart when empty | Three subject lines across dated exams | `FinalTest.score` is one number per test. No series when none are scored | Plot is live once tests have scores. Keep the sample only for the empty state |
