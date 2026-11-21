# E08 Exams

## Goal

Give each subject an exam date and a readiness figure, make the test list show the name, format, progress, time spent, and exit count the history table needs, and extend the results payload to the graded transcript the results screen shows.

## Scope

- **C19 Exam plan and readiness.** Store the exam date on the subject. Clear a per-subject learning override back to the user default; today `PATCH /learning-settings?subject_id=` can set `desired_retention` and cannot unset it (`LearningSettingsPatch` has no clear). `GET /tests/upcoming` returns the next date, countdown, readiness percent, band, monthly delta, and target. The same readiness feeds the Quizzes chip and the Final tests projected grade. Readiness is computed from recent attempts and topic mastery (C22), not from a submitted test score. Closes `settings-4`, `overview-9`, `quizzes-2`, `final-tests-1`, `final-tests-2`.
- **C20 Test list record.** `FinalTest` gains `title` and `format` (`full_exam`, `midterm`, `short_quiz`) beside the existing `question_count` and `time_limit_s`. In-progress tests include `answered_count` on the list and on `TestDetail`. Submitted rows include `time_taken_s` and an exit count on the list, taken from `integrity_events`, so the history table does not call results once per row. Closes `final-tests-4`, `final-tests-5`, `final-tests-6`, `final-tests-7`.
- **C21 Graded transcript and rubric.** `GET /tests/{id}/results` already returns score, pass, `time_taken_s`, per-question feedback (`corrections`, `additions`, `missing_points`, `model_answer`), topic breakdown, and the integrity timeline. Extend it with point weights, a per-criterion rubric, and exit durations when focus-lost and focus-regained can be paired. Add a results export and "create cards from mistakes," which creates questions through the existing generator scoped to the missed criteria. Closes `hint-exam-rubric`.

The in-exam rubric checklist ("3 checks satisfied" while the learner is still typing) is an open question because `Docs/LEARNING_ENGINE.md` hides model answers until submit, or until the question when `feedback_timing=immediate`. Default: the live session shows criterion names only, with no satisfied count and no model answer, until the test is submitted.

Local-only and signed-in users take tests on their own database. Integrity events, including the kind list already in `IntegrityEventKind`, stay on the server they use. IP addresses are not added to integrity events or to the client timeline. Cloud grading of written answers spends credits; MCQ grading stays deterministic.

## Out of scope

- Rebuilding the test runner: start, answer, timer, expire, submit, focus-mode classification, and the answer-leak guard stay as they are.
- Syllabus coverage counts (C22, `final-tests-3`).
- The analytics score chart (`analytics-9`), which the client plots from `GET /tests`.
- Formula sheet, scratchpad, and topology diagrams. Those have no accepted gap.

## Crates

`core` for test, settings-patch, and results types. `learning` for readiness, integrity classification, and the existing test flow in `crates/api/src/learning_services.rs`. `storage` for the migration. `api` for the routes. `questions` for cards generated from mistakes.
