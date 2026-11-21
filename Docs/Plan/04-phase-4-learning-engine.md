Phase 4 of "self-study-ai": the learning engine. WEB ONLY: do not touch apps/desktop and do not run desktop tests. Keep core, storage, and api free of web-specific assumptions. No CI/CD. Follow the existing .cursor rules: reusable components in the flat components folder, sections folder, pages folder, and a design-system entry (design-system/self-study-ai/pages/<page>.md and components/<component>.md) for every new page and component.

0. Time handling: introduce a Clock trait used by all time-dependent logic (scheduling, streaks, timers). Add a user timezone setting (default from the browser on first run). Add a dev/test-only clock override (env var, hard-disabled in production builds) so tests can move time forward. Never use wall-clock time directly in business logic.

1. Data model (new migrations):
   - card_states: question_id, due, stability, difficulty, state (new|learning|review|relearning), reps, lapses, last_review.
   - review_logs: question_id, attempt_id, rating, state_before, state_after, scheduled_days, elapsed_days, created_at (kept so FSRS parameters can be optimized later).
   - points_ledger (append-only): amount, reason, attempt_id/test_id, multiplier breakdown (JSON), created_at; unique constraint so the same attempt can never award points twice.
   - daily_activity: date (user timezone), questions_answered, points_earned, minutes_studied, goal_met.
   - tests: subject_id, config snapshot (JSON), status (draft|in_progress|submitted|expired), started_at, submitted_at, time_limit_s, score, pass, integrity_status (clean|flagged|unverified).
   - test_questions: test_id, question_id, position; attempts gain a nullable test_id.
   - integrity_events: test_id, kind (focus_lost|focus_regained|tab_hidden|fullscreen_exit|paste|copy|context_menu|resize), at, meta (JSON).
   - Settings additions with resolution order per-subject override, then user default, then system default (one tested resolver): desired_retention (default 0.9), daily_goal (questions per day), new_questions_per_day cap, review/new mix ratio, points config, streak rules, test defaults.
   - Backfill migration/job: build card_states and review_logs for all existing Phase 3 attempts, idempotent.

2. Spaced repetition: use the fsrs Rust crate (or implement strictly to the FSRS spec if the crate is unsuitable) behind a Scheduler trait, default parameters, desired_retention configurable. Map attempt score to ratings (Again/Hard/Good/Easy) with documented, configurable thresholds. Schedule after every graded attempt (including test attempts). Due queue ordering: overdue first, then due today, then new. Manual grade overrides must re-run scheduling for that attempt without double-counting.

3. Points and streaks:
   - Points tied to answer quality: base points by question kind and cognitive level, multiplied by the attempt score, with a gold multiplier, a capped streak bonus, and a configurable test multiplier. Re-answering the same question the same day earns reduced or zero points (anti-farming). Fully configurable, every award written to the ledger with its breakdown.
   - Streak = consecutive days (in the user's timezone) where the daily goal is met; track current and longest; handle day boundaries, timezone changes, and gaps correctly.
   - Manual grade overrides adjust the ledger through compensating entries, never edits.

4. Study integration: Study home gains a "Review due" mode (shows due count) and a mixed mode that blends due reviews with new questions per the configured ratio and new-question cap. Sessions record which items were reviews vs new.

5. Final test:
   - Builder: scope (subject, books, topics), question count, time limit (optional), question kinds and cognitive-level mix, include gold, existing questions vs freshly generated, pass mark, feedback timing (immediate or only at the end), navigation (free or one-way), focus mode on/off. Defaults come from user settings with per-subject override; the config is snapshotted into the test.
   - Taking a test: timer enforced server-side (client display is advisory; submissions after expiry are rejected or marked expired), answers saved as you go, the answer-leak guard applies fully (no correct answers or explanations until the test is submitted, or per-question if immediate feedback is chosen).
   - Focus mode (web): require fullscreen to begin, detect and log fullscreen exit, tab hidden, window blur, copy, paste, context menu and large resize via the Page Visibility, Fullscreen and clipboard events; show a visible banner when focus is lost; optionally block paste and copy in answer fields. Be honest in the UI and docs: a browser can detect and record these events but cannot prevent them, so this is an integrity LOG for the user's own accountability.
   - Integrity: events are stored with timestamps; the test gets integrity_status (clean, flagged, or unverified when focus mode was off or fullscreen was never entered). Flagged or unverified tests are shown clearly in results and do not earn the test bonus points.
   - Results: score, pass/fail, per-question review with feedback, per-topic breakdown, time taken, and the full integrity timeline.

6. Dashboard (Overview page): total points and level progress, current and longest streak, today's goal progress, due-today count with a Start review button, activity heatmap, accuracy and points trend charts, mastery by subject, book and topic (derived from retention and recent performance), weakest topics, recent tests with integrity status. Header widgets for streak and points in the AppShell.

7. Endpoints for all of the above, plus: due queue, review session builder, settings read/update with resolved values and override sources, points ledger list, streak/daily activity, dashboard aggregates, test CRUD/start/save-answer/submit/expire, integrity event ingest, test history and results.

8. Web UI, reusing shared components and adding reusable ones (StatCard, ProgressRing, Heatmap, TrendChart, Countdown, FullscreenGate, IntegrityBanner, EventTimeline, SettingRow with an "overridden" indicator): Dashboard, Review mode in Study home, Test builder, Test session, Test results, Test history, Settings > Learning (retention, daily goal, new-question cap, mix ratio, points, test defaults), and a per-subject override panel on the subject page. Loading, empty and error states everywhere.

9. Tests, written in this phase:
   - Rust unit tests: score-to-rating mapping, scheduler outputs for known review sequences, retention changes the interval, due ordering, points calculation and anti-farming, ledger idempotency, streak logic across day boundaries, timezone changes and gaps using the fake clock, settings resolver precedence, integrity classification, server-side timer expiry, answer-leak guard inside tests.
   - Rust integration tests: attempt to card_state to due queue; backfill is idempotent; manual override reschedules and compensates points; full test lifecycle (build, take, expire, submit, results); integrity events stored and classified; mixed review/new session respects the cap and ratio.
   - Playwright (web only, mock providers, clock override): answer questions then see them reappear in Review due at the right time after advancing the clock; points and streak update and a missed day resets the streak; dashboard numbers match seeded data; build and take a test with focus mode while simulating blur, visibilitychange, fullscreenchange and paste events via page.evaluate, then see them in the integrity timeline; time-limit expiry; per-subject override takes effect; axe accessibility scan on the new pages.

10. docs/LEARNING_ENGINE.md: document the rating mapping, points formula, streak rules, test and integrity rules, and every default, so future changes start from one place.

11. Run policy: per-step checks while building (cargo build, cargo clippy, tsc --noEmit, web lint). At the END of the phase run everything once (cargo test, integration tests, Playwright), fix failures, and prune Docker after every build.

Report: what was built, design decisions, anything not verified, and the exact commands to run it locally.