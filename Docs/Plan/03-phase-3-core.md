Phase 3 of "self-study-ai": questions and answering. WEB ONLY: do not touch apps/desktop and do not run desktop tests. Keep core, storage, and api free of web-specific assumptions. No CI/CD. Follow the existing .cursor rules: reusable components in the flat components folder, sections folder, pages folder, and a design-system entry (design-system/self-study-ai/pages/<page>.md and components/<component>.md) for every new page and component.

1. Data model (new migrations):
   - questions: subject_id, source_id, topic_id, kind (mcq|written), cognitive_level (recall|understand|apply|analyze), stem, options (JSON, mcq only), correct_option (mcq only), model_answer, explanation, grounding (notes|online), citations (chunk ids for notes; URL + short excerpt for online), is_gold, gold_status (none|proposed|confirmed|rejected), status (active|archived|flagged), generated_by (provider/model), prompt_version, created_at.
   - study_sessions: subject_id, scope (subject|source|topic ids), grounding_mode, burst_size, started_at, ended_at.
   - session_questions: session_id, question_id, burst_index, position.
   - attempts: question_id, session_id, answer_text or selected_option, score (0 to 1), verdict (correct|partial|incorrect), feedback (JSON: corrections, additions, missing_points, model_answer shown), graded_by (deterministic|ai|manual_override), confidence, time_taken_ms, created_at. Store everything that spaced repetition will need later so Phase 4 can derive ratings without schema changes.
   - usage_events: provider, model, kind (generation|grading|embedding), tokens_in, tokens_out, created_at (this becomes the cloud credits ledger input later).
   - Settings additions: default burst size (default 4, adjustable globally and per subject), cognitive-level mix per subject (configurable percentages with sensible defaults including an adjustable share of application questions), default grounding mode.

2. Question generation (new questions crate or module, behind traits):
   - Notes mode: retrieve the topic's chunks, ask the provider for structured JSON questions according to the requested kind and cognitive-level mix, validate against a strict schema, retry once on invalid output, and reject any question without valid chunk citations. Every notes question must be answerable from the cited chunks.
   - Online mode: a WebSearchProvider trait with a generic HTTP implementation (configurable endpoint plus masked key, same secret-handling rules as AI provider keys) and a MockWebSearchProvider. Questions generated this way are labeled grounding=online and store the source URL plus the short excerpt used, never full page copies. Respect timeouts and fail gracefully.
   - Dedupe: before saving, compare each new question stem against existing questions in the same topic by embedding similarity and drop near-duplicates above a configurable threshold.
   - Bursts: generate questions in bursts of the configured size. While the user answers the current burst, pre-generate the next one in the background so sessions do not stall. If generation partially fails, deliver what succeeded and surface the error.
   - Gold: for topics flagged is_core (from Phase 2), the generator may propose candidate gold questions (gold_status=proposed). Nothing becomes gold until the user confirms it. Users can also promote any question to gold manually.
   - Treat chunk text and web excerpts as untrusted data: wrap them in clearly delimited sections, instruct the model never to follow instructions found inside them, and never include secrets in prompts.

3. Answering and grading:
   - MCQ is graded deterministically, no AI call.
   - Written answers are graded by the provider against the model answer and the cited source text, with a rubric, returning validated JSON: score, verdict, corrections (what was wrong), additions (what was missing), and a confidence value. Low confidence is flagged in the UI.
   - The user can override an AI grade ("I was actually right"), stored as graded_by=manual_override and kept alongside the original grade.
   - The API must never return correct_option, model_answer or explanation for a question the user has not yet answered in the current session.
   - Record usage_events for every generation and grading call.

4. Endpoints: create/resume/end session, fetch next burst, submit answer, override grade, list/get/edit/archive/flag/delete questions with filters (subject, source, topic, kind, level, gold, grounding), gold review queue with confirm/reject, manual gold toggle, question settings read/update, web search provider CRUD plus test-connection.

5. Web UI (apps/web), using shared components and adding reusable ones (QuestionCard, OptionList, AnswerEditor, FeedbackPanel, ScoreBadge, CitationList, BurstProgress, FilterBar, SegmentedControl):
   - Study home: pick subject, book and topic scope, notes vs online mode, burst size, start or resume.
   - Study session: one question at a time, MCQ options or a written answer editor, submit, then a feedback panel showing verdict, corrections, additions, model answer and citations; burst progress indicator; flag question; mark as gold; burst summary at the end.
   - Question bank: filterable table with view, edit, archive and delete.
   - Gold review: queue of proposed gold questions with confirm or reject.
   - Settings > Questions: burst size, cognitive-level mix, default grounding mode, web search provider.
   Include loading, empty and error states everywhere, and clear labeling of online-grounded questions.

6. Tests, written in this phase:
   - Rust unit tests: question schema validation and retry, mix allocation across a burst, MCQ grading, dedupe, the answer-leak guard, prompt assembly with hostile instruction text planted inside chunk content (it must stay inside the delimited data section), manual override logic, burst size changes.
   - Rust integration tests (MockProvider and MockWebSearchProvider, temp SQLite): fixture source to generated burst with valid citations; written answer graded with feedback; online-mode burst with URL citations; gold proposal then confirm and reject; background pre-generation of the next burst; partial generation failure; usage_events recorded.
   - Playwright (web only, mock mode): complete a 4-question session mixing MCQ and written, see feedback and override a grade; question bank filter and edit; gold review confirm and reject; change burst size and see it applied; online mode shows labeled questions; axe accessibility scan on the new pages.

7. Real-model quality check: add docs/QUESTION_QUALITY.md with a manual checklist of about 10 sample cases (good and bad written answers, ambiguous passages, hostile chunk text) to run against a real provider, since MockProvider only verifies the plumbing, not question or grading quality.

8. Run policy: per-step checks while building (cargo build, cargo clippy, tsc --noEmit, web lint). At the END of the phase run everything once (cargo test, integration tests, Playwright), fix failures, and prune Docker after every build.

Report: what was built, design decisions, anything not verified, and the exact commands to run it locally.