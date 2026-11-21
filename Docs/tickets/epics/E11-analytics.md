# E11 Analytics

## Goal

Add the series and windows the analytics screen cannot build from `daily_activity` alone: retention over elapsed days, study time by subject and hour, a semester boundary, and a typed activity feed.

## Scope

- **C27 Retention series.** Achieved retention now, the delta versus the previous month, and retention by elapsed day against `desired_retention`. The overview chart adds `retention` and `cards_mastered` on each daily-activity row. `cards_mastered` uses the mastered rule from C22. `accuracy_trend` stays points per answer and is not relabeled as retention. Closes `overview-10`, `reviews-1`, `quizzes-1`, `analytics-3`.
- **C28 Study time.** Split `minutes_studied` by subject, by modality (review, quiz, test, ingest), and by hour of day in `learning_timezone`, plus the peak window. The daily total already exists. Closes `analytics-6`.
- **C29 Reporting window.** Store a semester start on learning settings. `GET /daily-activity?from&to=` already filters a range. The semester preset uses this date. Closes `analytics-1`.
- **C30 Activity feed.** `GET /activity?limit=` with `kind` (`upload`, `quiz`, `gold`, `review`, `test`), title, detail, and `occurred_at`. Built from sources, finished sessions, gold changes, review logs, and submitted tests, and recorded on the outbox (C05) when those writes already have a transaction. Closes `overview-11`.

The heatmap, streak, and points trend stay on the live dashboard and daily-activity routes. The mock-exam lines are `analytics-9`: the client plots `GET /tests`.

Local-only and signed-in users see analytics for their own rows. Dates use `learning_timezone`. No AI call and no credits. An export of this data is C32.

## Out of scope

- The knowledge score (C23), points shares (C25), and topic mastery table (C22).
- A second definition of retention. FSRS stability and this curve must use the same review logs.

## Crates

`learning` for the retention and time rollups. `core` for the series types. `storage` for the queries and the semester setting. `api` for the routes. The outbox table is C05; this epic only writes and reads the activity events.
