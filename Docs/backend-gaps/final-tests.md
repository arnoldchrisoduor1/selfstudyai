# Final tests gaps

Route: `/tests/`. Design: `design-system/final_tests_dark_mode_self_study_ai` (dark only). Placeholder: `apps/web/src/lib/placeholders/final-tests.ts`.

Live data already used: `GET /tests`, `GET /subjects`, `GET /learning-settings` (`test_defaults`), `GET /question-settings` (cognitive mix), `POST /tests`, `POST /tests/{id}/start`. Review opens `/tests/results/`. Open and Resume open `/tests/session/`. Full builder opens `/tests/new/`.

A draft or in-progress test replaces the featured card. Completed counts are the live list. Past rows use the subject name, date, time limit, score, and `integrity_status`.

| id | UI element | Design expects | Backend now | Suggested change |
|---|---|---|---|---|
| final-tests-1 | Upcoming date, "Next final in" | A scheduled exam date ("in 9 days", Nov 29) | `FinalTest` has `created_at`, `started_at`, `submitted_at`. No exam date | Add `scheduled_for` on the test, or a subject exam date |
| final-tests-2 | Projected grade, Readiness | A percent, a band ("Strong"), and a monthly delta | `score` exists only after submit. No projection | Add a readiness summary from recent attempts |
| final-tests-3 | Syllabus coverage | "92%", "24 of 26 topics" | Topics hang off a source. No coverage rollup | Add covered and total topic counts for a subject |
| final-tests-4 | Resume label | "Question 14 of 35" | List payload has no answered index. Results exist after submit | Add `answered_count` on an in-progress test |
| final-tests-5 | Format select | Full exam, midterm, or short quiz | `TestConfig` has no format. Count and time limit are separate | Add `format`, or drop the control |
| final-tests-6 | Duration and integrity log | Time spent of the limit, and exit counts ("0 exits", "2 exits") | List has `time_limit_s` and `integrity_status` (`clean`, `flagged`, `unverified`). `time_taken_s` is on results only | Add `time_taken_s` and an exit count on the list row |
| final-tests-7 | Past-test title | A test name plus a syllabus slice | `FinalTest` has no title | Add `title` on the test |
