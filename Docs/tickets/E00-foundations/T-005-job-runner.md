---
id: T-005
title: Record background jobs and keep ingest on spawn when the flag is off
epic: E00-foundations
priority: P1
size: M
phase: 1
status: todo
blocked_by: [T-001, T-002, T-003]
gaps: []
screens: []
crates: [core, storage, api]
feature_flag: jobs
---

## Summary

Ingest and re-embed already run on `tokio::spawn` in `crates/api/src/jobs.rs` and report progress only on the source row. This ticket adds a job row and `GET /jobs/{id}` so later work (optimize, cited answers, bulk generation) can poll. With the flag off, spawn behavior is unchanged.

## User-visible behavior

Flag off: upload and re-embed still move `Source.status` through `pending`, `processing`, `ready`, or `failed`. No job id in the upload response.

Flag on: `POST /sources` and `POST /sources/{id}/reembed` responses are unchanged, and a job row tracks the same work. A client that knows the id can poll. The library screen does not show that id until the ingest-stages ticket.

## Current state

`spawn_ingest` and `spawn_reembed` detach a task. Progress writes are `update_source_status` at 5, 20, 50, then ready or failed (`crates/api/src/jobs.rs`). No `jobs` table. Failure is a tracing error plus `Source.error`.

## API contract

`GET /jobs/{id}`

- Auth: optional, same tenant rules as the rest of the API.
- Flag off: 404 `not_found`.
- Flag on, missing id: 404 `not_found`.
- Flag on, job owned by another user: 404 `not_found` (do not use 403).
- Flag on, local job (`user_id` null) and the caller is signed in: 404.
- Flag on, local job and the caller is signed out: 200.
- Flag on, job `user_id` equals the caller: 200.

```json
{
  "id": "018f...",
  "kind": "ingest",
  "status": "running",
  "progress": 20,
  "error": null,
  "resource_table": "sources",
  "resource_id": "018f...",
  "created_at": "2026-11-21T12:00:00Z",
  "updated_at": "2026-11-21T12:00:01Z",
  "finished_at": null
}
```

`kind`: `ingest` or `reembed` in this ticket. `status`: `queued`, `running`, `succeeded`, `failed`. No `cancelled` until the ingest-stages ticket.

Sync handler. Does not start work. Add the path to the OpenAPI document from T-003.

## Data model

Table `jobs` in migration `006` (append if the file exists):

| column | notes |
|---|---|
| id | `new_id` |
| user_id | null for local-only |
| kind | text |
| status | text |
| progress | integer 0–100 |
| error | text null |
| resource_table | text null |
| resource_id | text null |
| created_at, updated_at | clock |
| finished_at | null until a terminal status |

Index `(resource_table, resource_id)`. No tombstone and no sync. Jobs are device-local. Down drops `jobs`.

## Business logic

Flag on: insert `queued`, spawn the existing task, set `running`, copy the same progress numbers the source row already gets, set `succeeded` or `failed` with `finished_at`. The task still updates the source. A panic or `Err` from `run_ingest` sets the job `failed` and still sets the source `failed` as today.

Flag off: do not insert a row. Call today's `spawn_ingest` / `spawn_reembed` unchanged.

There is no worker process and no retry loop. One spawn, one row.

## Local-only vs synced behavior

Local-only jobs have `user_id` null and are visible only to a signed-out caller on that process. Signed-in jobs are visible only to that user. Jobs are not pulled or pushed by `crates/storage/src/sync_engine.rs`. A second device does not see them.

## AI and cost impact

None in this ticket. Re-embed still calls the current provider when that path already did. No new credit charge and no idempotency header on upload.

## Events and audit

None. The outbox ticket may later emit `source.ingested` from the same success path. Do not emit it here.

## Security and privacy

404 for a job the caller must not see. `error` is the same string already stored on `Source.error` (parser message), not a stack trace or a database URL. Do not put file bytes on the job row.

## Edge cases

- Upload of an empty file still fails in the existing handler before spawn. No job.
- Process exit mid-spawn leaves `running`. This ticket does not sweep stale jobs. Document that. A later ticket can mark `running` older than a threshold as `failed`.
- Two re-embeds of one source: two job rows. Source progress follows the latest task, which matches today.

## Acceptance criteria

1. Given the flag off, when a fixture file is uploaded, then the source reaches `ready` or `failed` and `GET /jobs/{id}` is 404 for any id.
2. Given the flag on, when upload starts, then a `ingest` job exists and its terminal status matches the source (`succeeded` with `ready`, or `failed` with `failed`).
3. Given a job for user A, when user B calls `GET /jobs/{id}`, then the status is 404.
4. Given a local-only job, when a signed-in user calls `GET /jobs/{id}`, then the status is 404.
5. Given the flag on and a broken pdf, when ingest finishes, then the job `error` is non-empty and the source `status` is `failed`.

## Test plan

Extend `crates/api/tests/ingest_search.rs` with flag off (current assertions) and flag on (job row). Use the temp SQLite app builder those tests already use. No Playwright. Library UI still polls the source, not the job.

## Frontend wiring

None. No placeholder. No `BACKEND_GAP`. Upload still uses `POST /sources`.

## Docs to update

`docs/ARCHITECTURE.md` job paragraph: table, flag, and that ingest remains the source of truth for the library status chip. OpenAPI path from this ticket.

## Out of scope

Named stages, cancel, retry, OCR, and DOCX (`hint-ingest-stages`, capability C10). A global worker. Changing `Source.status`.

## Definition of done

- [ ] `jobs` migration applies and drops on `down`
- [ ] `GET /jobs/{id}` is in the OpenAPI document
- [ ] Ingest tests green for flag off and flag on
- [ ] No placeholder or gap row
- [ ] Flag `jobs` default off

## Open questions

None. Stale `running` rows after a crash are left for a follow-up, not guessed here.
