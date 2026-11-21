---
id: T-003
title: Publish OpenAPI for health, subjects, settings, and profiles
epic: E00-foundations
priority: P1
size: M
phase: 1
status: todo
blocked_by: [T-001, T-002]
gaps: []
screens: []
crates: [api]
feature_flag: openapi_export
---

## Summary

Add an OpenAPI document the web app can generate types from. This ticket covers the pipeline plus the small CRUD surface. The document is served only when `openapi_export` is on.

## User-visible behavior

Flag off (default): no new route the app calls, and `apps/web` keeps compiling against `apps/web/src/lib/api-client.ts`. Flag on: `GET /openapi.json` returns the document. No screen copy changes.

## Current state

Axum is 0.8 (`Cargo.toml` workspace). No `utoipa` dependency. Routes are registered in `crates/api/src/routes/mod.rs`. The web client types are handwritten in `apps/web/src/lib/api-client.ts`. `GET /healthz` returns `{ "status": "ok" }` from `HealthResponse` in `crates/api/src/routes/health.rs`.

## API contract

`GET /openapi.json`

- Auth: none.
- Flag off: 404 `{ "error": "not_found" }`.
- Flag on: 200 `application/json` OpenAPI 3.1 document.
- Paths in this ticket: `GET /healthz`, `GET/POST /subjects`, `GET/PATCH/DELETE /subjects/{id}`, `GET/POST /settings`, `GET/PATCH/DELETE /settings/{id}`, `GET/POST /local-profiles`, `GET/PATCH/DELETE /local-profiles/{id}`, `GET /flags`.
- Error responses use the `ApiError` JSON from `crates/api/src/error.rs`.
- Components include the page envelope from T-001 even though these routes still return raw arrays. Mark the envelope `Page` as a component for later routes. Do not change the live subject list to a page.

## Data model

No new table. Uses `feature_flags` and `flags::enabled` from T-002. The name `openapi_export` is one of the four registry rows T-002 seeds, default off. The document must include the `Page` component from T-001.

## Business logic

Use `utoipa` 5 with the Axum 0.8 extra. `ApiDoc` is built in `crates/api/src/openapi.rs` and merged by later tickets. Generation script writes `apps/web/src/lib/api-types.ts` (openapi-typescript, devDependency). The file is generated output. `api-client.ts` does not import it yet.

## Local-only vs synced behavior

The document is identical for local-only and signed-in callers. It describes both. It does not include secrets or example API keys.

## AI and cost impact

None.

## Events and audit

None.

## Security and privacy

Flag default off so a production process does not advertise the full schema until someone enables it. The document lists paths and schemas only, no sample tokens, no `ip_hint`.

## Edge cases

- Flag missing: treat as off, 404.
- Schema drift: a Rust test loads `/openapi.json` with the flag forced on and checks `paths` contains `/healthz` and `/subjects`.

## Acceptance criteria

1. Given the flag off, when `GET /openapi.json` is called, then the status is 404.
2. Given the flag on, when the route is called, then the body is an OpenAPI document whose paths include `/healthz` and `/subjects`.
3. Given `pnpm` exec of the generate script, when it finishes, then `apps/web/src/lib/api-types.ts` exists and `tsc --noEmit` still passes without importing that file from the client.
4. Given `GET /subjects`, when called, then the response is still a JSON array.

## Test plan

Rust integration test: flag off and on. Typecheck the web app. No Playwright flow.

## Frontend wiring

No component change. No `BACKEND_GAP`. Generated file is unused by sections.

## Docs to update

`docs/ARCHITECTURE.md`: how to regenerate `api-types.ts`. `README.md`: the command.

## Out of scope

Sources, search, sessions, learning, tests, auth, sync, credits, export (T-004). Switching `api-client.ts` off handwritten types. That happens when a product ticket deletes a placeholder.

## Definition of done

- [ ] No migration, or only the disabled `openapi_export` row if T-002's migration is shared
- [ ] `GET /openapi.json` documented
- [ ] Tests green and web typecheck green
- [ ] No placeholder removed
- [ ] No gap row
- [ ] `openapi_export` default off

## Open questions

None. `utoipa` 5 is the generator.
