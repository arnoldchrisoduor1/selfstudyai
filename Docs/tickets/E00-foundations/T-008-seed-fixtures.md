---
id: T-008
title: Seed one local subject and share test fixture builders
epic: E00-foundations
priority: P2
size: M
phase: 1
status: todo
blocked_by: []
gaps: []
screens: []
crates: [storage, api, ingest]
feature_flag: none
---

## Summary

A developer with an empty SQLite file can load one profile, one subject, one parsed note, and a few questions without clicking through the UI. API and storage tests can call the same builders instead of each inventing a subject.

## User-visible behavior

`APP_ENV=production` refuses the seed command and does not insert demo rows. In development, `cargo run -p api -- --seed` inserts the demo set once. The web app shows that subject on `/subjects/` after a refresh. Re-running the command does not duplicate rows.

## Current state

`crates/api/src/main.rs` connects, runs migrations, and ensures a mock AI provider (`ensure_mock_provider`). It has no seed flag. `crates/api/tests/*.rs` and `crates/storage/tests/crud.rs` each create subjects inline. Ingest fixtures already exist at `crates/ingest/tests/fixtures/sample.md`.

## API contract

No new HTTP route.

CLI: `cargo run -p api -- --seed`

- `APP_ENV=production`: exit with an error, no writes. Message `seed refused in production`.
- Otherwise: insert the demo set if the seed subject id is absent.
- Prints counts of profiles, subjects, sources, and questions inserted. No tokens and no database URL.

## Data model

No migration. Uses existing tables only.

Stable ids so reruns are idempotent:

| record | id |
|---|---|
| profile | `seed-profile` |
| subject | `seed-subject` |
| source | `seed-source` |

Questions use ids `seed-question-1` through `seed-question-4`. If `seed-subject` exists, the command exits 0 and inserts nothing else.

The source row is `kind=notes`, `status=ready`, `file_name=sample.md`, `title` taken from the markdown fixture. Topics and chunks come from `ingest::run_pipeline` on `crates/ingest/tests/fixtures/sample.md` bytes, then the existing chunk and topic repositories. Four questions: two `mcq` and two `written`, cognitive levels spread across `recall` and `apply`, `grounding=notes`, citations pointing at real chunk ids from that pipeline, `is_gold=false`, `status=active`.

`user_id` is null on every seeded row. Do not create a user, a session, or a credit balance.

## Business logic

Build questions with `NewQuestion::normalized` so invalid citations fail the command. Do not call an AI provider. The mock provider ensure in `main` still runs before seed so embeddings can be skipped: this seed does not embed. `needs_reembed` on the source is true so a later re-embed has an honest flag. Search will not find vectors until someone re-embeds. That is acceptable for a demo subject list and a question list.

Shared builders live in `crates/storage/src/test_support.rs` behind `cfg(feature = "test-support")` or as a public module `storage::fixtures` that production routes do not call. `crates/api/tests` and `crates/storage/tests` gain a `fn seed_subject(store) -> Subject` used by one rewritten test in each crate as proof. Do not rewrite every existing test in this ticket.

## Local-only vs synced behavior

The seed is local-only data (`user_id` null). A later `POST /auth/link-local` with `confirm: true` can assign those rows, which is existing behavior. The seed command never calls link-local and never signs up. Production cloud processes cannot run it.

## AI and cost impact

None. No `Provider::chat`, no embeddings, no credits.

## Events and audit

Do not emit outbox or audit rows from the seed command, even if those flags are on. Seed is a fixture, not a user action.

## Security and privacy

Refuse when `APP_ENV=production`. Demo question text comes from the markdown fixture's headings, not from a copied textbook. No password and no API key in the seed.

## Edge cases

- Second run: exit 0, no duplicate subject (primary key on `seed-subject`).
- Fixture file missing: non-zero exit, no partial subject left behind. Insert in one transaction.
- Pipeline returns zero chunks: exit with an error and roll back. Do not insert questions with empty citations.

## Acceptance criteria

1. Given `APP_ENV=production` and `--seed`, when the process starts, then it exits with an error and the database is unchanged.
2. Given a fresh dev database, when `--seed` runs, then one subject `seed-subject` exists with a ready source and four active questions.
3. Given the seed already applied, when `--seed` runs again, then subject count stays 1.
4. Given `seed_subject` in a storage test, when it returns, then `get_subject` finds that id.
5. Given the seeded questions, when `NewQuestion` rules are applied, then each has a notes citation whose chunk id was inserted.

## Test plan

`crates/api` test or a `#[ignore]`-free unit test that runs the seed function against temp SQLite twice and asserts idempotency. One storage test uses `seed_subject`. `cargo test -p ingest` still passes. No Playwright. Manual check: dev server, `--seed`, open `/subjects/` and see the subject. State in the PR if that click was not run.

## Frontend wiring

None. The subject appears through the existing `GET /subjects` list. No placeholder removal.

## Docs to update

`README.md`: the seed command and the production refusal. `docs/ARCHITECTURE.md`: demo ids and that vectors are absent until re-embed.

## Out of scope

Rewriting every test to the helper. Seeding card states, reviews, tests, or a user account. Embedding the fixture. Demo data for analytics charts.

## Definition of done

- [ ] No migration
- [ ] Command documented in the README
- [ ] Idempotent seed test and one builder test green
- [ ] No placeholder or gap row
- [ ] No feature flag; production refusal is the guard

## Open questions

None.
