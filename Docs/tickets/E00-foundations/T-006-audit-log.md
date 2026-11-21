---
id: T-006
title: Append an audit log that keeps IP addresses on the server
epic: E00-foundations
priority: P2
size: M
phase: 1
status: todo
blocked_by: [T-001, T-002]
gaps: []
screens: []
crates: [storage, api]
feature_flag: audit_log
---

## Summary

Sign-in, logout, account deletion, local-data link, credit changes, and export get an append-only server row. The row stores the client IP. No response body grows an IP field.

## User-visible behavior

Flag off: auth, credits, and export behave as they do now. Flag on: the same HTTP responses. Nothing in the web UI lists the log. There is no audit screen in the designs.

## Current state

`POST /auth/sign-in` stores `x-forwarded-for` on `auth_sessions.ip_hint` (`crates/api/src/routes/auth.rs`) and maps the row to `AuthSessionPublic` without that column (`session_from` in `crates/storage/src/auth_repos.rs`). `crates/api/src/middleware/access_log.rs` logs method, path, status, and `latency_ms`. It does not log IP, bodies, or tokens. Export is `GET /export`. Credits append through `CreditsRepository::append_entry`.

## API contract

No new route. Do not add `GET /audit`.

When the flag is on, these handlers insert one row after the mutation succeeds:

| handler | action |
|---|---|
| `POST /auth/sign-in` | `sign_in` |
| `POST /auth/logout` | `logout` |
| `POST /auth/logout-all` | `logout_all` |
| `POST /auth/delete-account` | `delete_account` |
| `POST /auth/link-local` | `link_local` |
| `POST /credits/topup` and `POST /credits/admin/adjust` | `credit_change` |
| `GET /export` | `export` |

Failed sign-in (bad password) writes nothing. 401 and 400 stay as they are.

`credit_change` `target_id` is the ledger entry id. `export` `target_id` is null. `sign_in` `target_id` is the session id.

## Data model

Table `audit_log` in migration `006`:

| column | notes |
|---|---|
| id | `new_id` |
| user_id | null if the caller is signed out |
| action | text, the names above |
| target_id | text null |
| ip | text null, from `x-forwarded-for` first hop, else null |
| user_agent | text null |
| created_at, updated_at | clock; `updated_at` equals `created_at` |

Append-only. No update API and no `deleted_at`. Not synced. Index `(user_id, created_at)`. Down drops the table.

## Business logic

Flag off: handlers do not write. Flag on: write after the successful mutation, in the same request. If the audit insert fails, log the error once and still return the original success. A missing audit row must not turn a successful logout into a 500.

IP is the first comma-separated value of `x-forwarded-for`, trimmed, max 64 characters. Absence stores null. Do not trust it as a security boundary. It is a record.

## Local-only vs synced behavior

`GET /export` while signed out writes `user_id` null. Sign-in and the other account routes already require a user, so those rows have `user_id`. Local-only study (subjects, answers, reviews) is not audited here. Credit routes already 401 when signed out, so they never write a local-only credit row.

## AI and cost impact

None.

## Events and audit

This ticket is the audit log. It does not also write the outbox.

## Security and privacy

No handler response, OpenAPI schema, or `tracing` field includes `ip` or `user_agent` from this table. Access log fields stay `request_id`, method, path, status, `latency_ms`. Repository tests may read `ip` in-process. `AuthSessionPublic` stays without `ip_hint`.

## Edge cases

- Missing `x-forwarded-for`: `ip` null, row still written.
- Header longer than 64 characters: store the first 64 of the first hop only.
- `link_local` with `confirm: false` already returns 400 and must not write.
- Delete-account writes the audit row before the user row is tombstoned, using the id from `current_user`.

## Acceptance criteria

1. Given the flag off, when sign-in succeeds, then `audit_log` has zero rows.
2. Given the flag on, when sign-in succeeds, then one `sign_in` row exists and the HTTP body has no `ip` field.
3. Given the flag on and a wrong password, when sign-in fails, then no audit row is written.
4. Given the flag on, when `GET /export` runs signed out, then one `export` row has `user_id` null.
5. Given `GET /auth/me`, when it returns sessions, then objects match `AuthSessionPublic` and have no `ip_hint`.

## Test plan

Extend `crates/api/tests/auth_phase5.rs` for sign-in success, sign-in failure, and logout. One export test beside `crates/api/tests/crud.rs`. Assert response JSON has no `ip` key. No Playwright.

## Frontend wiring

None. No placeholder. No `BACKEND_GAP`. The settings label "Audit log of cloud processing" is the credits table (C14), not this log.

## Docs to update

`docs/ARCHITECTURE.md` and `docs/SECURITY_REVIEW.md`: actions that are recorded, IP stored only on `audit_log` and `auth_sessions.ip_hint`, never in client JSON.

## Out of scope

A read API, retention or deletion of old rows, and auditing every study mutation. Failed-login rate limiting stays in `crates/api/src/rate_limit.rs`.

## Definition of done

- [ ] Migration applies and drops `audit_log` on `down`
- [ ] No public audit route to document; architecture doc lists the actions
- [ ] Auth and export tests green
- [ ] No placeholder or gap row
- [ ] Flag `audit_log` default off

## Open questions

None.
