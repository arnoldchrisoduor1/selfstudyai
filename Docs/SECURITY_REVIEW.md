# Security review — Phase 5

Date: 2026-11-17. Backend hardening slice for accounts, tenant scoping, sync, and credits.

## Addressed in code

- Passwords: argon2id via `auth_util::hash_password`.
- Session tokens: random 32-byte hex, stored as SHA-256 hash only.
- Rate limits on sign-up, login, password-reset (`rate_limit_buckets`).
- **Tenant data access**: `user_id_condition` + `not_deleted` on settings, profiles, sources, topics, questions, AI providers; subject routes and export use `with_data_tenant` / `with_tenant_user` so signed-in users only see their rows (`user_id IS NULL` when no session).
- **Sync**: LWW merge by `version` on editable tables; append-only tables (`attempts`, `review_logs`, `points_ledger`) idempotent by id; **`card_states` not synced** (recomputed from review logs).
- **Cloud AI**: `CloudProvider` reads platform key from `CLOUD_AI_API_KEY` only; question burst generation calls `ensure_cloud_spend` when cloud is enabled and the request is authenticated.
- Credits: reserve-before-spend helper used on cloud generation path; ledger/reserve covered in tests.
- Export endpoint returns JSON without raw file blobs in v1 (files path documented in deploy doc).

## Open / follow-up

| Area | Risk | Action |
| --- | --- | --- |
| Tenant middleware | Global Axum `tenant_scope` still unused; routes call tenant helper ad hoc | Extend `with_data_tenant` to sources, questions, learning routes |
| Learning / session tables | Partial sync columns on write; not all reads tenant-scoped | Finish finals, chunks, study_sessions when cloud paths need them |
| Sync push | Metadata-only upsert (no full payload merge) | Field-level merge + file store + embedding model gate |
| CORS + cookies | — | `allow_credentials(true)`, explicit origins, `Cookie` + `Authorization` allowed headers |
| Global auth middleware | Disabled (Axum 0.8 `FromFn` + task-local conflict) | Header-based `auth_context::current_user` on protected routes only |
| Dependency audit | Not run in this slice | `cargo audit`, `npm audit` before go-live |
| Postgres RLS | Not added | Optional defense-in-depth for cloud |

## Prompt injection

Re-verify Phase 3 guards for notes and web search on any cloud AI path before enabling paid generation in production.