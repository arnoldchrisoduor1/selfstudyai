# Wiring fixes

Gaps the backend already serves. Do not open a ticket. The frontend should stop using the placeholder for these and call the live API.

## analytics-9 — Score chart when empty

Design: `design-system/analytics_self_study_ai/code.html` (dark twin is the same chart). Placeholder: `apps/web/src/lib/placeholders/analytics.ts`. Tag: `BACKEND_GAP(analytics-9)` in `apps/web/src/sections/AnalyticsSection.tsx`.

`GET /tests` returns one row per test with `subject_id`, `score`, `pass`, `submitted_at`, and `integrity_status` (`study_core::FinalTest`). `GET /subjects` supplies the subject name. That is enough to plot one point per scored test, grouped into a line per subject.

What to change:

- When at least one test has a `score`, plot those points. Drop the sample series.
- When no test is scored, keep the sample only as the empty state, and say that it is a sample.
- Remove `BACKEND_GAP(analytics-9)` once that branch is in.

No new endpoint, column, or migration.

## Checked and not a wiring fix

These look close and are still tickets. The gap doc is partly wrong about the route, and the screen still cannot be filled.

| id | What already exists | What is still missing |
|---|---|---|
| overview-12 | `POST /sessions` with `scope.topic_ids` | `Dashboard.weakest_topics` is always `[]`, so there is no accuracy label and no topic id to send |
| settings-4 | `PATCH /learning-settings?subject_id=` and `sources.desired_retention` | No way to clear the override, and no exam date |
| settings-5 | Per-provider masked key, `POST /ai-providers/test` | The design's single gateway key, including Show |
| reviews-5, analytics-2 | `GET /export` | Payload is subjects, settings, and profiles only |
| library-4 | `GET /sync/status`, push, and pull | `last_sync_at` is always null; no encryption flag; no device list |
