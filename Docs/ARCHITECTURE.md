# Architecture

Self Study AI is a local-first learning stack: Rust API + SQLite (or Postgres for multi-user cloud), static Next.js apps, and an optional Tauri desktop shell.

## Crate map

| Crate | Responsibility |
| --- | --- |
| `core` (`study_core`) | Domain types, clock, learning types. No I/O. |
| `storage` | SeaORM entities, migrations, repositories. SQLite default; Postgres via `DATABASE_URL`. |
| `ingest` | Source parsing, chunking, background jobs. |
| `ai` | `Provider` trait (embed, chat), OpenAI-compatible, Ollama, mock. |
| `learning` | FSRS scheduler, points, streaks, due queue helpers. |
| `questions` | Generation, grading, burst orchestration. |
| `api` | Axum router, auth context, routes, app state. |
| `apps/desktop` | Tauri 2; embedded API + webview. |

**Dependency rule:** `core` ← `storage` ← domain crates ← `api`. Only `api` and `desktop` compose the full stack. No Tauri or OS paths inside `core`, `storage`, or `api` internals beyond configured `FILES_DIR`.

```
core
  ^
  |
storage, learning, ingest, ai, questions
  ^
  |
 api  ←  desktop
```

## Frontend apps

| App | Port (dev) | Role |
| --- | --- | --- |
| `apps/web` | 3000 | Product UI. Static export. API via `lib/api-client.ts`. |
| `apps/landing` | 3001 | Marketing. Static export. No API calls. |
| `packages/ui` | — | Shared components; flat `src/`. No barrel file. |

`apps/web` and `apps/landing` never import each other. Share UI by moving files into `packages/ui`.

**Structure:** `pages` → `sections` → `components`. Sections do not import sections.

## Data stores

### Local (default)

- SQLite file: `data/selfstudy.db` (host API) or OS app data (`desktop`).
- Original uploads: `FILES_DIR` (default `data/files`), keyed by `content_hash`.

### Cloud (optional)

- Postgres when `DATABASE_URL` is `postgres://` or `postgresql://`.
- Same migrations as SQLite (`001` … `005_accounts_sync`).
- `user_id` on synced tables; tombstones via `deleted_at`; `version` for sync.

### Phase 5 tables (migration 005)

- **Auth:** `users`, `auth_sessions`, `email_tokens`
- **Sync:** `sync_cursors`; sync metadata columns on existing entity tables
- **Credits:** `credits_ledger`, `credit_reservations`
- **Files (cloud):** `stored_files`
- **Rate limits:** `rate_limit_buckets`

Append-only merge tables include `attempts`, `review_logs`, `points_ledger`, `usage_events`, `integrity_events`, `daily_activity`. Scheduling state (`card_states`) is recomputed after sync merges.

## API

- **Framework:** Axum on `API_HOST`:`API_PORT` (default `127.0.0.1:18080`).
- **Auth:** Built-in email/password. `auth_context::current_user` on protected routes (no global auth middleware yet — see `Docs/SECURITY_REVIEW.md`).
- **Sync:** Pull/push with cursor in `sync_cursors`.
- **Credits:** Ledger + reservations; `MockPaymentProvider`; admin adjust when `ADMIN_USER_ID` set.
- **Logging:** `tracing`; one line per request with `request_id`, `latency_ms`, `x-request-id` response header.

Route registration: `crates/api/src/routes/mod.rs`.

## Learning pipeline

1. Ingest source → topics/chunks/embeddings/FTS.
2. Search or study scope → question generation (notes or online grounding).
3. Attempt graded → FSRS `review_logs` → due queue.
4. Points/streaks from ledger rules (`Docs/LEARNING_ENGINE.md`).
5. Tests record `integrity_events`; attempts still schedule reviews.

## Desktop

Tauri loads exported `apps/web`, starts the same router on localhost, sets `window.__STUDY_API_BASE__`. SQLite under app data. The web `api-client` sends `x-study-client: desktop` on sign-in and `Authorization: Bearer …` afterward (cookies are not used in the webview). Remote cloud sign-in uses the same headers against a hosted API.

## Docker (dev stack)

`docker compose up` — Nginx on `8088`: `/` landing, `/app/` product, `/healthz` API. See `README.md`.

## Design system

- Tokens: `design-system/self-study-ai/MASTER.md` → `packages/ui/tailwind.preset.ts`.
- Landing overrides: `design-system/self-study-ai/pages/landing.md`.
- Edit page/component specs **before** implementing UI.

## Testing and CI

- Rust: unit + integration tests (mock providers).
- Playwright: `e2e/` (API health, landing, app smoke, `phase5.spec.ts` auth API).
- **CI/CD:** not configured in this repository (manual `cargo build`, `clippy`, `tsc`, lint per README).

## Security notes

See `docs/SECURITY_REVIEW.md` and `docs/DEPLOY_READINESS.md` for cookies, CORS, rate limits, and deploy env vars.