# Reviews gaps

Route: `/study/`. Design: `design-system/reviews_self_study_ai` (light). Dark twin: `reviews_dark_mode_self_study_ai`. Placeholder: `apps/web/src/lib/placeholders/reviews.ts`.

Live data already used: `GET /subjects`, `GET /due-queue` (counts, card state, stability, lapses), `GET /questions` (stem, explanation, topic), `GET /learning-settings` (`desired_retention`), `GET /dashboard` (streak), `GET /sources`, `GET /topics/{source}`, `GET /sessions?subject_id=` open sessions, `POST /sessions` for Start review, Review subject, and Practice on a live lapsed card. Configure FSRS weights opens `/settings/`.

The due queue is cards with `due <= now` only. It is not a forecast and it is not the whole deck.

| id | UI element | Design expects | Backend now | Suggested change |
|---|---|---|---|---|
| reviews-1 | Retention rate stat | Percent retained and a monthly delta ("91.4%", "+2.1% this month") | `Dashboard.mastery` is empty. `accuracy_trend` is points per answer, not a retention percent | Add a retention summary: current rate and delta versus the previous month |
| reviews-2 | FSRS average stability | Mean stability across the whole deck ("18.4 Days") | `GET /due-queue` returns stability only for cards already due. No list of all card states | Add `GET /cards` or a deck summary with mean `stability` |
| reviews-3 | 7-day forecast | Per-day projected card counts for the next week | Due queue has no future cards. No projection endpoint | Add a forecast of counts by local date for the next 7 days |
| reviews-4 | Estimated minutes | "~14 min" on the hero and each subject queue | No duration field on the queue or the session | Add `estimated_minutes` on the due queue, or a per-card seconds model |
| reviews-5 | Export deck | Download the review deck | `GET /export` returns subjects, settings, and profiles only | Add a deck export of cards (question, state, due, stability) |
| reviews-6 | Full session, FSRS weights | An uncapped session, and editable FSRS weights | Session create takes `burst_size`. Learning settings expose `desired_retention` and caps, not solver weights | Add an uncapped review mode, and a weights payload only if the scheduler should be user-tuned |
| reviews-7 | Streak milestone | "Next milestone badge at 14 days" | `StreakInfo` is `current`, `longest`, `timezone` | Add milestone definitions, or drop the badge line |
| reviews-8 | Practice on one weak card | Drill that card | Session scope is `source_ids` and `topic_ids`. No question id | Add `question_ids` on session scope. Until then Practice starts a topic or subject session |
