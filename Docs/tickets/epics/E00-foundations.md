# E00 Foundations

## Goal

Put the shared server pieces in place so later capabilities can ship independently: one error and pagination shape, generated types for the web client, a job record for work that outlives the request, feature flags, an audit log that keeps IP addresses on the server, an outbox for domain events, and fixtures a local developer and the test suite can both use.

## Scope

- **C00 API conventions.** Extend `crates/api/src/error.rs`. Keep the existing `error` code (`not_found`, `unauthorized`, `invalid`, `conflict`, `storage_error`, `upstream_error`). Add a stable list shape for new list endpoints: cursor or offset, `limit`, and `has_more`, chosen once and reused. Idempotency keys, already required on `TopUpRequest`, become required on paid credit charges and on AI calls that spend credits or write generated questions.
- **C01 OpenAPI and client types.** Publish an OpenAPI document from the Axum routes and generate the TypeScript types `apps/web` consumes. Hand-written response shapes in `apps/web/src/lib/api-client.ts` stop being the contract.
- **C02 Job runner and job status.** Replace fire-and-forget `tokio::spawn` in `crates/api/src/jobs.rs` with a job row: id, kind, status, progress, error, timestamps. Callers poll a status route. Ingest (C10) is the first caller. The same row is used later for optimization, cited answers, and bulk generation.
- **C03 Feature flags.** A flag read in `api`, stored per install, overridable per signed-in user. Default off for every new capability. Local-only and signed-in users can both be flagged. No flag service outside the process.
- **C04 Audit log.** Append-only server log for sign-in, logout, logout-all, delete-account, link-local, credit changes, and export. `auth_sessions.ip_hint` stays the stored client address. The audit row stores the IP. `AuthSessionPublic` and every other client payload continue to omit it. The access log in `crates/api/src/middleware/access_log.rs` stays free of bodies and tokens.
- **C05 Domain events and outbox.** One outbox table written in the same transaction as the domain change. Event names for source ingested, question answered, points awarded, test submitted, and gold changed. Delivery is in-process. No Kafka.
- **C06 Seed data and test fixtures.** A dev-only seed that loads one local profile, a subject, a parsed fixture source, and a few questions, using `study_core` types and the existing repositories. Shared builders for `crates/api/tests` and `crates/storage/tests` so new tests do not each invent a subject.

Local-only users get the same conventions, jobs, flags, and seed as a signed-in user. Audit and outbox rows that have a `user_id` leave it null until the account exists. Paid idempotency applies only when the call spends cloud credits.

## Out of scope

- Product endpoints that close a design gap. Those are C07–C32.
- A new auth system. Email/password, cookies, bearer tokens, and `POST /auth/link-local` stay as they are.
- A real payment gateway. `MockPaymentProvider` stays until a later payments task (`docs/PAYMENTS_TODO.md`).
- Cross-process workers, Kafka, or a separate flag product.

## Crates

`core` for flag and job types. `storage` for job, flag, audit, outbox, and seed repositories, plus a migration. `api` for the error shape, OpenAPI export, job status route, and flag checks. `learning`, `questions`, `ingest`, and `ai` only gain types they must emit; they do not own the tables.
