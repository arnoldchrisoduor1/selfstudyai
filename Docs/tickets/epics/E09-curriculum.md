# E09 Curriculum

## Goal

Define "mastered" once, and return it as subject coverage, a topic tree with badges, a resume target, weak topics, and the concept counts the analytics table uses.

## Scope

- **C22 Curriculum progress.** A subject progress read: category (from C11), current chapter, completion, mastered and total cards, note count, `last_studied_at`. A syllabus route for the subject: ordered modules from the existing topic tree (`parent_id`, `position`, `is_core`), with card counts, `mastery_pct`, and a status band (Strong / Stable / Review, plus the analytics stability band and lapse count). Resume returns the session scope for the current chapter. `POST /sessions` already accepts `topic_ids`; this capability fills `weakest_topics`, which `build_dashboard` currently hard-codes to `[]`, so the Practice button has an id to send. Coverage for a subject is covered topics over total topics, which the Final tests "24 of 26" line needs. Concept mastered counts for analytics use the same mastered rule. Closes `overview-3`, `overview-5`, `overview-6`, `overview-12`, `subjects-1`, `subjects-7`, `subjects-8`, `final-tests-3`, `analytics-4`, `analytics-8`.

The mastered rule is an open question. Proposed default, using data that already exists: a card is mastered when its FSRS state is `review`, its stability is at least 21 days, and its latest attempt score is at least `good_below` (default 0.95). Bands map off that stability. The ticket writes the rule down and tests it. Month-over-month and week-over-week deltas compare that count across `review_logs` dates.

Local-only and signed-in users see mastery for the database they are reading. After sync, mastery is recomputed from merged logs and attempts, the same way `card_states` are recomputed today. No AI call and no credits.

## Out of scope

- Subject category, level, and archived as editable fields (C11). This epic only reads `category`.
- The 0–1000 knowledge score (C23).
- The retention-by-elapsed-day curve (C27). Daily `cards_mastered` on the overview chart is C27, using this mastered rule.
- Add chapter, AI study recommendations on the syllabus, and drafted/scheduled module states. Those are possible misses.

## Crates

`learning` for the mastered rule and rollups. `core` for the progress and topic-stat types. `storage` for the queries across topics, questions, card states, and attempts. `api` for the syllabus, progress, and dashboard fields. `ingest` is unchanged; it already builds the topic tree.
