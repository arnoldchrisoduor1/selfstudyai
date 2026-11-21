# Possible missed gaps

Reviewed all 33 `design-system/*/code.html` files. Dark twins repeat the light screen and are not listed again. Marketing pages are not product screens; a claim is listed only when a product screen also shows it.

Nothing in this file is a ticket. Items under **Promoted hints** are already rows in `gaps.json` (`source: "hint"`). Reject any of those before phase T1 and they will be dropped. Everything else is waiting for your review.

`settings-9` is a documented gap with no `BACKEND_GAP` comment in the frontend. It is in `gaps.json`, not here.

## Hint check

A hint becomes a gap only when a product design shows the data or the action.

| Hint | Design evidence | Decision |
|---|---|---|
| Documents and ingestion, per-file stage status and retry | Add Material queue: Uploading, Reading, Sections, Indexing, Questions, cancel, and "Retry with enhanced OCR". Library row: "Failed: retry". | Promoted as `hint-ingest-stages`. Status PARTIAL. |
| Semantic search and cited answers ("Ask your notes") | Search results: "AI Overview" with `[1]` `[2]` `[3]`, follow-up, copy, save as card. Syllabus: "Ask your notes". | Promoted as `hint-ask-notes`. Status PARTIAL. `POST /search` already returns cited passages. |
| Question generation (template / local / cloud, cognitive level, gold, burst) | Generate actions exist on Add Material, Quizzes, and the syllabus. Local / own key / app credits are the settings model cards (`settings-9`). Gold badges and burst "2 of 7 / card 3 of 4" are on the flashcard screen. No design shows a template or rule-based mode. | No new gap. Cognitive mix, gold proposal, and burst assembly already exist. Local / cloud mode is `settings-9`. Template fallback is a project rule for later tickets, not a screen. |
| Flashcard review: Again / Hard / Good / Easy and next-interval preview | `flashcard_review_self_study_ai`: four buttons with `< 1 min`, `6 min`, `3 days`, `9 days`, plus Bury until tomorrow. | Promoted as `hint-flashcard-ratings`. Status PARTIAL. Edit card can use `PATCH /questions/{id}`. |
| Quiz creation, session, and answer grading with feedback | Quiz hub is `quizzes-1` … `quizzes-8`. The session screens show grading, corrections, additions, citations, and points. | No new gap for the session. Grading already returns feedback. Extra session controls are listed under Quiz session below. |
| Final test builder, defaults, focus mode, integrity log, graded transcripts and rubric | Builder, defaults, focus mode, and the integrity log exist (`TestConfig`, `POST /tests/{id}/integrity-events`, `GET /tests/{id}/results`). The results screen adds a weighted rubric, points out of 100, an export, and "Create cards from mistakes". The exam workspace shows a rubric checklist during the test. | Promoted as `hint-exam-rubric`. Status PARTIAL. List-page holes stay `final-tests-1` … `final-tests-7`. |
| Analytics (retention curve, heatmap, points breakdown, topic table, mock-exam trend, knowledge score) | Analytics screen. | No new gap. Heatmap is live from `GET /daily-activity`. The score chart is `analytics-9` (wiring fix). The rest are `analytics-1` … `analytics-8` and `overview-1`. |
| Points, streaks, and gold | Overview, reviews, quiz feedback, analytics breakdown. | No new gap. Points, streaks, and gold multipliers are implemented. The design's shares and milestone badge are `analytics-7` and `reviews-7`. |
| FSRS parameters, optimizer, per-subject overrides | Settings: w0–w16, "Optimize from my review history", per-subject retention, max interval, exam chip. | Weights and max interval are `settings-2` and `settings-3`. Overrides are `settings-4` (PARTIAL: set works, clear and exam date do not). The optimizer is new: `hint-fsrs-optimize`. |
| AI model settings and credits ledger | Settings AI models. | No new gap. `settings-5`, `settings-6`, `settings-7`, `settings-9`. |
| Devices, sessions, and audit log | Library: "Multi-device access enabled". Settings nav label "Sync & devices" with no panel behind it. Credits table is labeled "Audit log of cloud processing". No device table, session list, or IP is shown. | No new gap. The device claim is `library-4`. The credits table is `settings-7`. `GET /auth/me` already returns sessions without `ip_hint`. `ip_hint` is stored on `auth_sessions` and is not on `AuthSessionPublic`. |
| Local-to-account upgrade and sync | Onboarding choice, and `create_account_sync_upgrade_self_study_ai`: confirm, then a preview of 1 subject, 24 cards, a 12-day streak, and one file. | No new gap. `POST /auth/sign-up`, `POST /auth/link-local` `{confirm:true}` → `{rows_linked}`, and sync push/pull exist. The preview is local data the client already has. The encryption sentence is `library-4`. |
| Notifications | A bell icon in the shell. Marketing copy talks about review reminders. No inbox, payload, or action. | Not a gap. The icon has no screen behind it. |
| Exports (Anki deck, report PDF) | Reviews "Export deck". Syllabus "Export cards". Analytics "Export report". Exam results "Export Report". The word Anki does not appear. | Deck export is `reviews-5`. Analytics report is `analytics-2`. The exam-results export is inside `hint-exam-rubric`. Anki is not a design requirement. |

## Add Material

Design: `design-system/add_material_self_study_ai/code.html`. Not covered by `library.md`.

| UI | Backend today | Note |
|---|---|---|
| Named stages, cancel, OCR retry, DOCX, generate-on-ingest | See `hint-ingest-stages` | Promoted. Do not duplicate. |
| Per-subject storage, "4.8 GB of 10 GB" | No quota on a subject. `library-1` is workspace used/quota only. | Separate from `library-1` if quotas are per subject. |
| "Needs attention" versus failed | Source status has `failed`. No distinct needs-attention state. | Fold into `hint-ingest-stages` if you accept it. |
| File cap copy | Add Material says 75 MB. Library says 250 MB. The API uses `MAX_UPLOAD_BYTES`. | Copy conflict, not a new field. |
| Quick samples (ArXiv, OCW, course page) | No URL ingest. | Same hole as `library-2`. |

## Syllabus

Design: `design-system/distributed_systems_syllabus_self_study_ai/code.html`. `subjects-7` and `subjects-8` cover module badges and a syllabus list. These are extra.

| UI | Backend today | Note |
|---|---|---|
| Ask your notes, export cards | Search hits; `GET /export` is not a deck | `hint-ask-notes`, `reviews-5` |
| Add chapter | Topics are created by ingest. No create-chapter route. | New action |
| Predicted retention, "restore course recall to 91% in ~12 minutes", dismiss | No recommendation resource | Close to `overview-7` |
| Mastered / Stable / In review / Weak counts | No stability-band rollup | Close to `analytics-8` |
| Subtopic due count and percent | Due queue has no topic id | Needs topic id on due items, which `overview-8` does not add |
| Linked document count, "4 cards drafted / Scheduled" | Questions and sources are countable. No drafted/scheduled module state. | New state |
| Next cycle, "Tomorrow, 08:00" | No next-cycle timestamp | Close to `settings-8` |
| Create subject: discipline, level, initial reference as a PDF, URL, or book title | `subjects-4` is category and level. Book title and URL are not a source. | URL is `library-2`. A book-title reference is new. |

## Exam workspace

Design: `design-system/exam_workspace_self_study_ai/code.html`. The list page is `final-tests.md`. The session API is `GET /tests/{id}`, answer, integrity events, submit.

| UI | Backend today | Note |
|---|---|---|
| Section label ("Section B"), question palette (current, answered, flagged, remaining) | `TestDetail` is the test plus public questions. No section, no answered set, no flag on a test item. | `POST /questions/{id}/flag` flags the question globally |
| Per-question weight and estimated minutes | Questions have no point weight | New |
| Autosave ("Saved 12s ago"), Save & exit | Answers are stored on `POST /tests/{id}/answer`. No saved-at on the test. | Partial |
| Formula sheet, scratchpad, topology diagram | Not stored | Likely client-only unless the diagram is source content |
| Rubric checklist while answering ("3 checks satisfied") | Feedback is withheld until submit, or until the question if `feedback_timing=immediate` | Conflicts with the answer-leak rule. Open question: criteria text only, or a live grade? |
| Markdown and LaTeX answer, word count | `answer_text` is a string | Client-only |

## Exam results

Design: `design-system/final_exam_results_distributed_systems_self_study_ai/code.html`.

The weighted rubric, points out of 100, results export, and "create cards from mistakes" are `hint-exam-rubric`. Still separate:

| UI | Backend today | Note |
|---|---|---|
| Grade letter ("Grade A") and pace ("93% pace", "8m remaining") | `score` is 0–1, `pass` is boolean, `time_taken_s` is on results | Letter and pace are not defined |
| Exit duration ("6s", "8s") | `IntegrityEvent` has `kind`, `at`, and `meta`. Duration is not a column. | Could be derived from paired focus-lost / focus-regained if both exist |

## Quiz session

Designs: `quiz_session_active_question_self_study_ai`, `quiz_session_answer_feedback_self_study_ai`.

Already live: MCQ and written answers, verdict, corrections, additions, model answer, citations, flag, gold, burst progress, low-confidence flag.

| UI | Backend today | Note |
|---|---|---|
| Points on the answer ("+8", streak bonus "+2") | Points are written to `points_ledger`. `AnswerResponse` is `attempt`, `question`, `low_confidence`. | The session cannot show the award without another call, and the ledger has no session-scoped read |
| Skip for now | No skip. A missing attempt is just unanswered. | New action |
| Report | `POST /questions/{id}/flag` exists. No separate report reason. | May be the same as flag |
| Coverage checklist before submit | Not stored | New, and it is learner-facing help rather than a grade |
| One item that is both MCQ and written | A question has one `kind` | New shape |
| Refresher passage before the answer | Citations are on the question. The answer-leak guard hides explanation until graded. | The passage can be a citation; the explanation cannot |

## Search results

Cited answer is `hint-ask-notes`. Extra actions on the same screen:

| UI | Backend today | Note |
|---|---|---|
| Save answer as a card, extract a flashcard from a passage | No "create question from this chunk" route. Manual `POST` of a question is not exposed; generation is session-scoped. | New |
| Generate a 5-question quiz from the cited hits | `POST /sessions` can take `source_ids` and `topic_ids`, not chunk ids | Partial |
| Add 2 cards to the daily review queue | Due dates come from FSRS after an attempt. No manual queue insert. | New |
| Type filter: PDF, slides, personal notes | `Source.kind` is `notes` or `book` | Slides are not a kind |
| Related concepts with mastery, suggested follow-up questions | Topics have titles. No mastery and no suggested questions. | Mastery is `subjects-7` / `analytics-8` |

## Onboarding

Designs: `onboarding_step_1_welcome`, `onboarding_step_2_create_subject`, `onboarding_step_3_ready`.

| UI | Backend today | Note |
|---|---|---|
| "Use on this device only" versus "Create an account to sync" | Auth is optional. Link-local and sync exist. | No new API |
| Goal: pass an exam versus learn thoroughly | Not stored. Exam crunch is only a retention preset in the settings design. | New if the goal should change scheduling |
| Exam date on the first subject | No exam date | Same as `settings-4` and `final-tests-1` |
| First-run card preview | Questions appear after ingest and generation | Depends on `hint-ingest-stages` plus existing generation |

## Settings controls the gap table skips

Designs: `settings_study_fsrs_self_study_ai`, `settings_ai_models_self_study_ai`.

| UI | Backend today | Note |
|---|---|---|
| Presets Standard / Exam crunch / Long-term | Each preset is a `desired_retention` (90, 94, 85). The field exists. | Client-only, unless the preset name is stored |
| Max reviews per day | `daily_goal` is questions answered. `new_questions_per_day` caps new cards. No review cap. | New field, separate from `settings-1` |
| Reset weights to defaults | No weight vector | Part of `settings-2` |
| Nav items with no panel: General, Exams & focus mode, Library & ingestion, Sync & devices, Account & credits, Appearance | Test defaults, providers, credits, and sync already have routes. No design body for these tabs. | Do not invent screens |

## Not gaps

| UI | Why it is not a gap |
|---|---|
| Reviews "4 New / 6 Learning / 18 Review" | Those states are on `GET /due-queue` `card_state.state`, and they sum to the due count. The client can count them. |
| Weekly points and the streak chip | `GET /daily-activity` and `StreakInfo` are live. |
| Command-palette chrome (`Cmd+K`) and the notifications bell | No query, list, or action is designed behind them. |
| Anki | The word does not appear. Deck download stays `reviews-5` until you ask for an Anki package. |
| In-exam focus banner and exit count of zero | `integrity_status` and `POST /tests/{id}/integrity-events` exist. The history table's exit count is `final-tests-6`. |
