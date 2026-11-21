# Capabilities

One capability is one cohesive piece of server behavior. A capability may close many gaps across several screens. Each open gap is listed on exactly one capability. `analytics-9` is a wiring fix (`docs/tickets/_work/wiring-fixes.md`) and is not listed.

Items in `docs/tickets/_work/possible-missed-gaps.md` are not capabilities until you accept them.

Crate names below are the workspace crates. `core` is the package; the library is `study_core`.

## E00 Foundations

Shared machinery. These close no design gaps. Later tickets depend on them.

| Id | Capability | Gaps closed | Views unlocked |
|---|---|---|---|
| C00 | API conventions | — | All later screens, once list endpoints share pagination and errors |
| C01 | OpenAPI and client types | — | All later screens, via generated types instead of hand-written client shapes |
| C02 | Job runner and job status | — | Add Material and any paid or AI call that cannot finish inside the request |
| C03 | Feature flags | — | All later screens, each ticket ships dark |
| C04 | Audit log | — | None in the client. Server-side session and admin review only |
| C05 | Domain events and outbox | — | Activity feed and any later subscriber, after C30 |
| C06 | Seed data and test fixtures | — | Local development and the test suite |

## E01 Sync and devices

| Id | Capability | Gaps closed | Views unlocked |
|---|---|---|---|
| C07 | Sync status and devices | library-4 | Library |

## E02 Documents and ingestion

| Id | Capability | Gaps closed | Views unlocked |
|---|---|---|---|
| C08 | Source metadata and import history | library-1, library-5, subjects-6 | Library, Subjects |
| C09 | URL import | library-2 | Library, Add Material |
| C10 | Ingest pipeline stages | hint-ingest-stages | Add Material, Library |
| C11 | Subject taxonomy | subjects-4 | Subjects, Overview |

## E03 Search and answers

| Id | Capability | Gaps closed | Views unlocked |
|---|---|---|---|
| C12 | Cited answers | hint-ask-notes | Search, Syllabus |

## E04 AI providers

| Id | Capability | Gaps closed | Views unlocked |
|---|---|---|---|
| C13 | Inference mode and credentials | settings-5, settings-9 | Settings |

## E05 Credits

| Id | Capability | Gaps closed | Views unlocked |
|---|---|---|---|
| C14 | Credits plan and usage | settings-6, settings-7 | Settings |

## E06 Reviews and FSRS

| Id | Capability | Gaps closed | Views unlocked |
|---|---|---|---|
| C15 | Review load and next batch | overview-2, overview-7, overview-8, overview-13, subjects-2, subjects-5, reviews-2, reviews-3, reviews-4, settings-1 | Overview, Subjects, Reviews, Settings |
| C16 | FSRS model | settings-2, settings-3, settings-8, library-3, reviews-6, hint-fsrs-optimize | Settings, Reviews, Library |
| C17 | Flashcard rating | hint-flashcard-ratings, reviews-8 | Review session, Reviews |

## E07 Quizzes

| Id | Capability | Gaps closed | Views unlocked |
|---|---|---|---|
| C18 | Quiz sessions | quizzes-3, quizzes-4, quizzes-5, quizzes-6, quizzes-7, quizzes-8 | Quizzes |

## E08 Exams

| Id | Capability | Gaps closed | Views unlocked |
|---|---|---|---|
| C19 | Exam plan and readiness | settings-4, overview-9, quizzes-2, final-tests-1, final-tests-2 | Settings, Overview, Quizzes, Final tests |
| C20 | Test list record | final-tests-4, final-tests-5, final-tests-6, final-tests-7 | Final tests |
| C21 | Graded transcript and rubric | hint-exam-rubric | Exam results, Exam workspace |

## E09 Curriculum

| Id | Capability | Gaps closed | Views unlocked |
|---|---|---|---|
| C22 | Curriculum progress | overview-3, overview-5, overview-6, overview-12, subjects-1, subjects-7, subjects-8, final-tests-3, analytics-4, analytics-8 | Overview, Subjects, Syllabus, Final tests, Analytics |

## E10 Scoring

| Id | Capability | Gaps closed | Views unlocked |
|---|---|---|---|
| C23 | Knowledge score | overview-1, analytics-5 | Overview, Analytics |
| C24 | Gold statistics | overview-4, subjects-3 | Overview, Subjects |
| C25 | Points breakdown | analytics-7 | Analytics |
| C26 | Streak milestones | reviews-7 | Reviews |

## E11 Analytics

| Id | Capability | Gaps closed | Views unlocked |
|---|---|---|---|
| C27 | Retention series | overview-10, reviews-1, quizzes-1, analytics-3 | Overview, Reviews, Quizzes, Analytics |
| C28 | Study time | analytics-6 | Analytics |
| C29 | Reporting window | analytics-1 | Analytics |
| C30 | Activity feed | overview-11 | Overview |

## E12 Exports

| Id | Capability | Gaps closed | Views unlocked |
|---|---|---|---|
| C31 | Deck export | reviews-5 | Reviews, Syllabus |
| C32 | Analytics export | analytics-2 | Analytics |

## Counts

33 capabilities (C00–C32). 7 close no design gap (C00–C06). 26 close the 71 open gaps (66 gap-doc rows plus 5 accepted hints). `analytics-9` is excluded.

## Assignment check

Every open id appears once:

`overview-1` C23, `overview-2` C15, `overview-3` C22, `overview-4` C24, `overview-5` C22, `overview-6` C22, `overview-7` C15, `overview-8` C15, `overview-9` C19, `overview-10` C27, `overview-11` C30, `overview-12` C22, `overview-13` C15, `subjects-1` C22, `subjects-2` C15, `subjects-3` C24, `subjects-4` C11, `subjects-5` C15, `subjects-6` C08, `subjects-7` C22, `subjects-8` C22, `library-1` C08, `library-2` C09, `library-3` C16, `library-4` C07, `library-5` C08, `reviews-1` C27, `reviews-2` C15, `reviews-3` C15, `reviews-4` C15, `reviews-5` C31, `reviews-6` C16, `reviews-7` C26, `reviews-8` C17, `quizzes-1` C27, `quizzes-2` C19, `quizzes-3` C18, `quizzes-4` C18, `quizzes-5` C18, `quizzes-6` C18, `quizzes-7` C18, `quizzes-8` C18, `final-tests-1` C19, `final-tests-2` C19, `final-tests-3` C22, `final-tests-4` C20, `final-tests-5` C20, `final-tests-6` C20, `final-tests-7` C20, `analytics-1` C29, `analytics-2` C32, `analytics-3` C27, `analytics-4` C22, `analytics-5` C23, `analytics-6` C28, `analytics-7` C25, `analytics-8` C22, `settings-1` C15, `settings-2` C16, `settings-3` C16, `settings-4` C19, `settings-5` C13, `settings-6` C14, `settings-7` C14, `settings-8` C16, `settings-9` C13, `hint-ingest-stages` C10, `hint-ask-notes` C12, `hint-flashcard-ratings` C17, `hint-fsrs-optimize` C16, `hint-exam-rubric` C21.
