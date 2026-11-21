# E07 Quizzes

## Goal

Treat a quiz as the study session the product already has, and return the fields the Quizzes screen invents today: progress, kind mix, weak-topic scope, application share, duration, a recommendation, and a history of finished quizzes.

## Scope

- **C18 Quiz sessions.** Extend `StudySession` and `POST /sessions`. The list of open sessions includes `answered_count` and the quiz length, so "6 of 10" does not require a burst fetch. Create accepts a kind mix (MCQ, written, or both); today `cycle_kinds` alternates and the client cannot choose. Create accepts a weak-topic scope and a per-session application share without writing the global `QuestionSettings` mix. Create accepts an estimated duration or a time limit. A recommendation payload returns category, due date, last score, and weak topic ids for the recommended card. Finished sessions are listable with score, duration, and concept, with pass/retry filters and the pagination from C00. Retake creates a new session with the same scope. Closes `quizzes-3`, `quizzes-4`, `quizzes-5`, `quizzes-6`, `quizzes-7`, `quizzes-8`.

There is still no second quiz table unless the session row cannot hold the snapshot. Final tests stay on `/tests`.

Local-only and signed-in users take quizzes on their own database. Generation uses C13. Cloud AI charges credits; template and local modes do not. A quiz started offline syncs later as a session plus attempts, which are already append-only.

## Out of scope

- Readiness and "final in N days" (C19).
- The mastered retention percent on the quiz hero (C27).
- Grading, feedback, citations, flag, and gold. Those already return from `POST /sessions/{id}/answer`.
- Skip, report-as-distinct-from-flag, and a single item that is both MCQ and written. Those are possible misses, not accepted gaps.
- Points shown on the answer payload. The ledger already records the award. Showing it on `AnswerResponse` can be a small addition inside a quiz ticket if the session design requires it; it is not a separate capability.

## Crates

`core` for session and scope types. `questions` for kind mix and burst assembly. `storage` for session queries including finished sessions. `api` for the routes. `learning` is read for due dates and last score, not redefined.
