# E12 Exports

## Goal

Let the learner download the review deck and an analytics report. `GET /export` today returns subjects, settings, and profiles only (`crates/api/src/routes/export.rs`).

## Scope

- **C31 Deck export.** A deck download of question, card state, due, and stability for the learner's cards. The Reviews "Export deck" button and the syllabus "Export cards" action both use it. Format is JSON unless a ticket chooses a documented flashcard file. Anki is not a design requirement; the word does not appear in the product HTML. Closes `reviews-5`.
- **C32 Analytics export.** A report download of the analytics screen for the active window (C29): retention, study time, points breakdown, topic table, and test scores. Closes `analytics-2`. The exam-results "Export Report" is the results file on C21, not this report.

Local-only users download from their own API, as `GET /export` already allows. Signed-in users download their tenant's rows. Exports are audited (C04) and do not include IP addresses, API keys, or other users' data. No AI call and no credits.

## Out of scope

- Original uploaded files. Phase 5 mentioned them on the account export. This epic does not add a zip of `FILES_DIR`.
- Replacing `GET /export`. The account JSON export stays.
- Anki package layout, scheduling round-trip, or media.

## Crates

`api` for the two download routes. `storage` and `learning` for the queries. `core` for the deck and report types. No new table unless the report is generated as a job (C02) for large accounts.
