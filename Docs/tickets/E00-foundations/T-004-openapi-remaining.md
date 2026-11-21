---
id: T-004
title: Document the remaining HTTP routes in OpenAPI
epic: E00-foundations
priority: P1
size: M
phase: 1
status: todo
blocked_by: [T-003]
gaps: []
screens: []
crates: [api]
feature_flag: openapi_export
---

## Summary

Finish the OpenAPI document so every route already registered in `crates/api/src/routes/mod.rs` has a path, a schema, and an error response. Live handlers stay as they are.

## User-visible behavior

Flag off: unchanged app. Flag on: `GET /openapi.json` lists the routes below as well as the T-003 paths. Screens still call `api-client.ts`.

## Current state

T-003 covers health, subjects, settings, profiles, and flags. The router also exposes sources, topics, chunks, search, AI providers, web-search providers, sessions, questions, question settings, learning, tests, dev clock, auth, sync, credits, and export. Request and response structs already exist on those handlers (`study_core` types and local structs such as `BurstResponse`, `AnswerResponse`, `TestDetail`).

## API contract

Extend `crates/api/src/openapi.rs`. For each route in `routes/mod.rs` not covered by T-003:

- Method and path match the `.route` registration, including path params.
- Auth: `none`, `optional`, or `required`, matching the handler (`current_user` vs `optional_user` vs neither).
- Body and query schemas match the existing `Deserialize` types. Do not invent fields.
- Success schema matches the existing `Serialize` type. `GET /questions` stays a JSON array in the document because that is what the handler returns.
- Errors: 400, 401, 404, 409, 502 where `ApiError` can produce them today.
- `POST /credits/topup` documents the existing body `idempotency_key`, not the T-001 header.
- `GET /dev/clock` and `POST /dev/clock` stay in the document and are noted as non-production.

Regenerate `apps/web/src/lib/api-types.ts`.

## Data model

None.

## Business logic

None. Documentation only. A test fails if a path registered on the router is absent from the document. Build that check by walking the `Router` or by a maintained list that the test compares to `mod.rs`. Prefer a unit test that the OpenAPI path set equals the route set, so a new route cannot merge without a schema.

## Local-only vs synced behavior

The document describes both. Auth routes say a local-only caller receives 401 from `current_user`. Do not document a different schema per mode.

## AI and cost impact

None. Provider routes document `has_api_key` and `api_key_hint`. They do not document a field that returns the raw key. `NewAiProvider.api_key` is write-only in the schema.

## Events and audit

None.

## Security and privacy

Schemas must not include `ip_hint`, password hashes, or session token hashes. `AuthSessionPublic` is the session shape. `SignIn` response on desktop includes `bearer_token`; document it as a secret the client stores, and do not put an example token in the spec.

## Edge cases

- Multipart `POST /sources` is `multipart/form-data` with `subject_id`, `title`, `kind`, `file`, not JSON.
- Routes that return `StatusCode::NO_CONTENT` have an empty 204 body.
- `POST /auth/sign-in` has two response shapes (cookie JSON vs bearer JSON). Document both with `oneOf` or the desktop header `x-study-client` as a parameter.

## Acceptance criteria

1. Given the flag on, when `/openapi.json` is loaded, then every path in `routes/mod.rs` is present.
2. Given `QuestionPublic`, when the burst schema is generated, then `correct_option` and `model_answer` are absent.
3. Given the generate script, when it runs, then `tsc --noEmit` passes.
4. Given any handler test in `crates/api/tests`, when this ticket is applied, then those tests still pass without editing assertions.

## Test plan

One Rust test for path coverage. Re-run `cargo test -p api` to confirm no handler change. Web typecheck. No Playwright.

## Frontend wiring

None. Do not replace `api-client.ts` functions in this ticket.

## Docs to update

`docs/ARCHITECTURE.md` points at `GET /openapi.json` as the route list instead of a hand-maintained table. Leave `docs/FEATURES.md` behavior text as it is.

## Out of scope

New routes from T-005, T-006, and T-007. Those tickets add their own paths. Changing response JSON to the T-001 page envelope.

## Definition of done

- [ ] No migration
- [ ] OpenAPI path set matches `routes/mod.rs`
- [ ] `cargo test -p api` and web typecheck green
- [ ] No placeholder or gap row
- [ ] Flag `openapi_export` still default off

## Open questions

None.
