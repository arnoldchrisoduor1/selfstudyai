---
id: T-002
title: Store feature flags per install and per user
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

Later tickets ship dark. This ticket is the switch they read: one install default, optional override for a signed-in user, unknown names off.

## User-visible behavior

No screen reads flags yet. A caller of `GET /flags` sees the registry. Existing screens stay on their current routes and do not check flags.

## Current state

No flag table and no flag check. `crates/api/src/config.rs` is process env only (`MAX_UPLOAD_BYTES`, `DATABASE_URL`, and the rest).

## API contract

`GET /flags`

- Auth: optional. No user: install defaults. Signed-in: install default overridden by that user's rows.
- Response 200:

```json
{
  "flags": {
    "openapi_export": false,
    "jobs": false,
    "audit_log": false,
    "outbox": false
  }
}
```

- The object contains every name in the code registry and no others.
- 401 is not used. A bad bearer token still follows `optional_user` in `crates/api/src/auth_context.rs`: treat it as signed out and return install defaults.

`PUT /flags/{name}` is not public. Tests and the seed ticket write through the repository. A later admin UI can add a route.

Helper `flags::enabled(&state, name) -> bool` for route code. Unregistered name: false, and a `tracing` warn with the name. Registered missing row: false.

## Data model

Same migration file as T-001 if that ticket has not shipped the file yet; otherwise the next migration. Prefer one migration `m20241121_006_foundations` owned by T-001, and this ticket adds its statements to that file if T-001 is merged first. If this ticket lands first, it creates `006` and T-001 appends. Implementers coordinate so there is a single `006`.

`feature_flags`

| column | notes |
|---|---|
| name | primary key, text |
| enabled | integer 0/1, default 0 |
| updated_at | RFC3339 |

`feature_flag_overrides`

| column | notes |
|---|---|
| user_id | text |
| name | text |
| enabled | integer 0/1 |
| updated_at | RFC3339 |

Primary key `(user_id, name)`. No tombstone. Not synced in this ticket. Down drops both tables. Seed the four names above as disabled.

## Business logic

Resolve order: user override if `tenant_user_id()` is `Some` and a row exists, else install row, else false.

Registry is a `&'static [&'static str]` in `crates/api`. Adding a flag is a code change plus a migration insert. Default for every new capability flag is off.

## Local-only vs synced behavior

Local-only uses the install row only. There is no user id to override. A signed-in user on that same database can have an override. Cloud and local use the same tables. Flags do not follow sync pull/push in this ticket, so two devices can differ until a later sync ticket says otherwise.

## AI and cost impact

None.

## Events and audit

None. Turning a flag on is not an audit event in this ticket.

## Security and privacy

`GET /flags` returns booleans only. No IP, no user id, no secrets. Do not accept an arbitrary name from the client and echo it back. Overrides are written only by repository callers in-process, so a signed-in user cannot flip another user's row through HTTP.

## Edge cases

- Empty tables before seed insert: helper returns false.
- Override for an unknown name: ignore it on read.
- User A override does not affect user B or the signed-out response.

## Acceptance criteria

1. Given a fresh database, when `GET /flags` runs, then all four registry names are false.
2. Given install `jobs=1` and no user, when the helper runs, then `jobs` is true.
3. Given install `jobs=1` and user override `jobs=0`, when that user calls `GET /flags`, then `jobs` is false.
4. Given that override, when a signed-out call runs, then `jobs` is true.
5. Given an unregistered name, when the helper runs, then the result is false.

## Test plan

Integration test next to `crates/api/tests/crud.rs` with temp SQLite: seed, install on, user override off, signed-out read. No Playwright.

## Frontend wiring

None. Do not add a settings control. No placeholder and no `BACKEND_GAP`.

## Docs to update

`docs/ARCHITECTURE.md`: where flags live and that new capabilities default off. List the four names.

## Out of scope

Per-request percentage rollouts, a hosted flag service, and syncing flag rows. Checking a flag inside ingest, auth, or export waits for T-003 onward.

## Definition of done

- [ ] Migration applies and `down` drops both tables
- [ ] `GET /flags` documented in `docs/ARCHITECTURE.md`
- [ ] Acceptance tests green
- [ ] No placeholder or gap row
- [ ] Registry defaults are off

## Open questions

None. Device-local flags are the default until a sync ticket opts in.
