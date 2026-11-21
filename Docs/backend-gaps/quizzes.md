# Quizzes gaps

Route: `/quizzes/` (new). Design: `design-system/quizzes_dark_mode_self_study_ai` (dark only). Placeholder: `apps/web/src/lib/placeholders/quizzes.ts`.

There is no quiz resource. A quiz is a study session.

Live data already used: `GET /subjects`, `GET /sources`, `GET /topics/{source}`, `GET /due-queue`, `GET /questions`, `GET /questions?gold=true`, `GET /sessions?subject_id=` for each subject, `POST /sessions`. Generate and Start open `/study/session/`. Resume opens the newest open session. Due for review sends `mode: review_due`. Everything and Weak topics send `mode: practice`.

| id | UI element | Design expects | Backend now | Suggested change |
|---|---|---|---|---|
| quizzes-1 | Mastered stat | A retention percent ("99% retention") beside the mastered count | Gold questions are a count. No mastery percent | Add a retention rate for gold or mastered cards |
| quizzes-2 | Readiness chip | "88%" and "Final in 9 days" | No projected grade. No exam date | Add a readiness summary and `scheduled_for` |
| quizzes-3 | In-progress banner | "6 of 10 answered" and a percent | `StudySession` has `burst_size` and `started_at`. Answered ids are on the burst, not the list | Add `answered_count` on an open session |
| quizzes-4 | Question types | Multiple choice or written for this quiz | `POST /sessions` has no kind mix | Add `kinds` on session create, or keep using question settings |
| quizzes-5 | Weak topics, application slider | A weak-topic scope and an application share of 0–50% | Session scope is source and topic ids. Cognitive mix is global question settings | Add a weak-topic scope and a per-session cognitive mix |
| quizzes-6 | Estimated duration, Customize | "~12 minutes" and a duration editor | No duration on a session | Add `estimated_minutes`, or a time limit on the session |
| quizzes-7 | Recommended card | Category, due date, last score, targeted weak topics, preview | Due count is live. Topics are source topics. No category, last score, or preview | Add a recommendation payload: category, due date, last score, weak topic ids |
| quizzes-8 | Recent results | Past quizzes, pass/retry filters, pagination, review, retake | No quiz history. Attempts are not listable. Final tests are a different route | Add `GET /quizzes` with score, duration, concept, and a retake action |
