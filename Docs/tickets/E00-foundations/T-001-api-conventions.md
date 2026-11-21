---
id: T-001
title: Add the shared list envelope and idempotency store
epic: E00-foundations
priority: P0
size: M
phase: 1
status: todo
blocked_by: []
gaps: []
screens: []
crates: [core, storage, api]
feature_flag: none
---

## Summary

New list routes need one page shape, and paid or AI writes need one idempotency store. This ticket adds both as libraries. Existing routes keep their current JSON.

## User-visible behavior

No screen changes. `GET /subjects`, `GET /credits/ledger`, `POST /credits/topup`, and every other current route return the same bodies and status codes as today.

## Current state

`ApiError` in `crates/api/src/error.rs` already returns `not_found`, `unauthorized`, `invalid` (with `message`), `conflict`, `storage_error`, and `upstream_error`. List limits are ad hoc: `GET /points-ledger` uses `limit` default 50 max 500 (`crates/api/src/routes/learning.rs`), `GET /credits/ledger` hard-codes 100, `POST /sync/pull` uses its own cursor. `TopUpRequest.idempotency_key` is a body field used only by `crates/api/src/payment.rs`. No shared page type and no idempotency table.

## API contract

No new public route.

Helpers, used by later tickets:

- Query `limit` (default 50, max 100) and `offset` (default 0).
- Response envelope:

```json
{
  "items": [],
  "limit": 50,
  "offset": 0,
  "has_more": false
}
```

- `has_more` is true when another row exists past `offset + limit`.
- Validation failure is the existing 400 `{ "error": "invalid", "message": "..." }`. `limit` below 1 or `offset` below 0 is invalid.

Idempotency for a later write:

- Header `Idempotency-Key`, 1 to 200 visible ASCII characters.
- Missing header on a route that opts in: 400 `invalid`, message `idempotency key required`.
- Same key and same request hash: replay the stored status and body, no second side effect.
- Same key and different request hash: 409 `{ "error": "conflict" }`.
- `POST /credits/topup` is not switched to this header in this ticket.

`POST /sync/pull` keeps its cursor. It does not adopt `offset`.

## Data model

Migration `m20241121_006_foundations` in `crates/storage/src/migrator.rs`, registered after `Migration005AccountsSync`. This ticket creates only:

`idempotency_keys`

| column | notes |
|---|---|
| id | `study_core::new_id` |
| scope | `local` or `user:<user_id>` |
| idempotency_key | client key |
| request_hash | SHA-256 of method, path, and raw body |
| status_code | integer |
| response_body | text |
| created_at, updated_at | RFC3339 from `Clock`, not `Utc::now()` |

Unique `(scope, idempotency_key)`. No `deleted_at`. Not a synced table. Down migration drops the table.

## Business logic

`PageQuery::parse` clamps `limit` to 100. The repository asks for `limit + 1` rows and sets `has_more` from the extra row.

Idempotency scope is `user:<id>` inside `storage::with_tenant_user(Some(id))`, otherwise `local`. Replay lasts for the life of the row. No TTL in this ticket.

## Local-only vs synced behavior

Local-only writes use scope `local`. A signed-in user's keys do not replay a local-only call and the reverse. Cloud AI spend is the only paid case, and it already requires a signed-in user. The helper does not call a provider.

## AI and cost impact

None. No provider call and no credit charge. Later AI tickets must call this helper before they reserve credits.

## Events and audit

None.

## Security and privacy

Do not log the request body or the idempotency key. Store the response body the route already returned to that caller. A local scope on a shared server would mix users; this binary is one install per data directory, which matches the current local-only model.

## Edge cases

- `limit=0` and `offset=-1` are 400.
- Two concurrent requests with the same key: one insert wins, the other waits or replays. Use a unique constraint, not a check-then-insert without a transaction.
- Replay returns the original status even when it was 4xx.
- Empty list is `items: []`, `has_more: false`.

## Acceptance criteria

1. Given a parser with `limit=500`, when it runs, then the effective limit is 100.
2. Given 3 stored rows and `limit=2&offset=0`, when a list helper runs, then `has_more` is true and `items` has length 2.
3. Given the same key and the same body twice, when the helper runs, then the side effect runs once and the second response equals the stored body.
4. Given the same key and a different body, when the helper runs, then the status is 409 and the side effect does not run again.
5. Given `GET /subjects` after this migration, when a client calls it, then the JSON array shape is unchanged.

## Test plan

Unit tests in `crates/api` for page bounds. Integration test in `crates/storage/tests` or `crates/api/tests` with temp SQLite: insert the idempotency row, replay, and conflict. Assert `GET /subjects` from `crates/api/tests/crud.rs` still decodes a JSON array. No Playwright.

## Frontend wiring

None. No `BACKEND_GAP` to remove. `apps/web/src/lib/api-client.ts` stays as it is.

## Docs to update

`docs/ARCHITECTURE.md` API section: document the page envelope and the `Idempotency-Key` header for future routes. Do not rewrite existing route docs to claim they already use the envelope.

## Out of scope

Switching any existing list or `POST /credits/topup` onto these helpers. That happens in the ticket that changes that route. Cursor pagination for sync stays in `crates/api/src/routes/sync.rs`.

## Definition of done

- [ ] Migration `006` applies and its `down` drops `idempotency_keys`
- [ ] Helpers documented in `docs/ARCHITECTURE.md`
- [ ] Tests in the acceptance criteria are green
- [ ] No placeholder removed (none apply)
- [ ] No gap-doc row to close
- [ ] No feature flag (additive only)

## Open questions

None. Offset pages are the contract for new lists. Sync pull stays on its cursor.
