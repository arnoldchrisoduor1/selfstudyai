---
id: T-007
title: Write domain events to an in-process outbox
epic: E00-foundations
priority: P1
size: M
phase: 1
status: todo
blocked_by: [T-001, T-002]
gaps: []
screens: []
crates: [core, storage, api]
feature_flag: outbox
---

## Summary

Add one outbox table and emit five events from the writes that already succeed. Delivery is an in-process mark, not a bus. Flag off leaves those writes as they are.

## User-visible behavior

No screen changes in either flag state. Scores, reviews, and uploads stay on their current routes. The activity feed (C30) is the first reader and is a later ticket.

## Current state

No outbox. Points go to `points_ledger` from `record_learning_outcome` in `crates/api/src/learning_services.rs`. Answers go through `submit_answer` in `crates/api/src/services.rs`. Gold changes go through `POST /questions/{id}/gold`. Tests finish in `submit_test`. Ingest finishes in `run_ingest` (`crates/api/src/jobs.rs`). Those tables are the record. Nothing publishes an event.

## API contract

No new route.

`study_core` event names, snake case in JSON `event_type`:

| event_type | when |
|---|---|
| `source.ingested` | source status becomes `ready` |
| `question.answered` | an attempt is stored for a study answer |
| `points.awarded` | a `points_ledger` row with reason `answer` is inserted |
| `test.submitted` | `submit_test` sets status `submitted` |
| `question.gold_changed` | `is_gold` flips on `POST /questions/{id}/gold` |

Payload is JSON with ids only: `source_id`, `question_id`, `attempt_id`, `ledger_id`, `test_id`, `subject_id` as applicable, plus `is_gold` for the gold event. No stems, no file bytes, no prompts, no IP.

Flag off: callers do not insert. Flag on: insert in the same database transaction as the domain row when that write is already transactional. Where the current code writes in separate statements, insert the outbox row immediately after the successful domain insert and accept that a crash can leave one without the other. Do not rewrite those flows into new transactions in this ticket.

## Data model

Table `outbox` in migration `006`:

| column | notes |
|---|---|
| id | `new_id` |
| user_id | null when the tenant is local-only |
| event_type | text |
| payload | text JSON |
| created_at | clock |
| delivered_at | null until the in-process dispatcher runs |

Index `(delivered_at, created_at)`. Append-only aside from setting `delivered_at`. Not synced. Down drops the table.

## Business logic

After insert, `tokio::spawn` a dispatcher that sets `delivered_at` to now for that id. On process start, one pass sets `delivered_at` on rows where it is null. "Delivered" means the row is durable and marked. There is no subscriber in this ticket. Marking is what proves the hook ran.

Dispatcher failure leaves `delivered_at` null. The startup pass retries. Do not delete the row.

## Local-only vs synced behavior

`user_id` is null for local-only mutations and set for a signed-in tenant. Payload ids are the same either way. Outbox rows do not cross devices via sync. Each device emits for writes it commits.

## AI and cost impact

None. Emitting `question.answered` does not grade again and does not charge credits.

## Events and audit

Events listed above. No audit row. Payload must not copy `audit_log.ip`.

## Security and privacy

Payload is ids and one boolean. Repository code is the only reader. Do not log the payload at info level.

## Edge cases

- Ingest `failed` does not emit `source.ingested`.
- Grade override that only writes `override_compensation` does not emit a second `points.awarded`. The reason filter is `answer` only.
- Gold toggle to the same value does not emit.
- Duplicate delivery marks are harmless: setting `delivered_at` again is a no-op if it is already set.

## Acceptance criteria

1. Given the flag off, when a study answer is submitted, then `outbox` is empty and the attempt exists.
2. Given the flag on, when a study answer is submitted and points are awarded, then both `question.answered` and `points.awarded` exist and `delivered_at` becomes non-null.
3. Given the flag on, when ingest reaches `ready`, then one `source.ingested` row exists.
4. Given the flag on, when a test is submitted, then one `test.submitted` row exists and its payload has no IP key.
5. Given a null `delivered_at` left from a stopped dispatcher, when the process starts, then that row is marked delivered.

## Test plan

Integration tests in `crates/api/tests`: answer path from `questions_phase3.rs` or `learning_phase4.rs`, one ingest fixture, one test submit from `learning_phase4.rs`. Assert payload keys. No Playwright.

## Frontend wiring

None. No placeholder. No `BACKEND_GAP`. `overview-11` stays open until the activity-feed ticket.

## Docs to update

`docs/ARCHITECTURE.md`: event names, in-process delivery, no Kafka. Note that C30 will read this table.

## Out of scope

An HTTP feed, webhooks, retry with backoff beyond the startup sweep, and emitting on every ledger reason. Kafka and a second process are out.

## Definition of done

- [ ] Migration applies and drops `outbox` on `down`
- [ ] No public route; event names documented
- [ ] Tests for the five event types that this ticket emits (ingest, answer, points, test, gold) are green
- [ ] No placeholder or gap row
- [ ] Flag `outbox` default off

## Open questions

None. A crash between the domain insert and the outbox insert can drop one event. Closing that gap means wrapping each caller in one transaction, which this ticket does not do.
