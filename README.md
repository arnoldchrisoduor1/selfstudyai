# Self Study

Local-first learning tool: ingest notes and books, search chunks, generate and grade questions, FSRS review, points, streaks, and tests. Optional accounts add cloud sync and prepaid platform AI credits. **CI/CD is not set up yet**—checks are manual.

## Layout

| Path | Role |
| --- | --- |
| `crates/core` | Domain types (`study_core`). No I/O. |
| `crates/storage` | SeaORM repositories and migrations. SQLite default; Postgres via `DATABASE_URL`. |
| `crates/ingest` | Source parsing, chunking, background ingest. |
| `crates/ai` | `Provider` trait — OpenAI-compatible, Ollama, mock. |
| `crates/learning` | FSRS scheduling, points, streaks. |
| `crates/questions` | Question generation and grading. |
| `crates/api` | Axum API — study, learning, tests, auth, sync, credits, export. |
| `apps/web` | Product app. Next.js pages router, static export. |
| `apps/landing` | Marketing site. Static export with real feature copy from `Docs/FEATURES.md`. |
| `apps/desktop` | Tauri 2 shell. Web export + in-process API. |
| `packages/ui` | Shared UI. Only cross-app component sharing path. |
| `e2e` | Playwright smoke tests. |
| `design-system/self-study-ai` | Brand and page/component specs. |
| `Docs` | `FEATURES.md`, `ARCHITECTURE.md`, deploy and security notes. |

## Dependency direction

```
core
  ^
  |
storage, learning, ingest, ai, questions
  ^
  |
 api  ←  desktop
```

- `core` depends on nothing in the workspace (lib name `study_core`).
- `api` is the only crate that wires the full backend.
- `apps/desktop` depends on `api` and `storage`.

Frontend:

```
pages -> sections -> components
                  -> hooks (web)
                  -> lib
```

`apps/web` and `apps/landing` do not import each other. Import shared controls as `@self-study/ui/Button` (no barrel).

## Web and landing

Both apps use `output: 'export'`. No server-only Next.js features.

| App | Dev URL | Notes |
| --- | --- | --- |
| Web | `http://127.0.0.1:3000/` | `NEXT_PUBLIC_BASE_PATH` empty locally; Docker uses `/app`. |
| Landing | `http://127.0.0.1:3001/` | `NEXT_PUBLIC_LANDING_ORIGIN`, `NEXT_PUBLIC_APP_URL` optional at build. |

The product app uses `apps/web/src/lib/api-client.ts`. Default API: `http://127.0.0.1:18080`. Desktop sets `window.__STUDY_API_BASE__`.

**Product routes:** `/subjects/`, `/sources/`, `/search/`, `/study/`, `/questions/`, `/overview/`, `/tests/`, `/settings/`, `/dev/components/`.

**Landing routes:** `/`, `/privacy/`, `/terms/` (legal pages are placeholders).

## Accounts, sync, credits (Phase 5)

Optional. Local-only use remains fully supported.

- **Auth:** `/auth/*` — email/password, sessions, link-local, export, delete account.
- **Sync:** `/sync/status`, `/sync/pull`, `/sync/push` — versioned rows and tombstones (`005_accounts_sync` migration).
- **Credits:** `/credits/*` — ledger, mock top-up, admin adjust when `ADMIN_USER_ID` is set. **No real payment gateway** (`Docs/PAYMENTS_TODO.md`).

See `Docs/FEATURES.md` and `Docs/ARCHITECTURE.md` for detail.

## Desktop

Tauri 2 serves `apps/web` and runs Axum on `127.0.0.1:18080`. SQLite under OS app data `self-study-ai/selfstudy.db`. Windows is the first verification target.

```bash
cd apps/desktop
npm run dev
```

```bash
cargo build -p self-study-desktop
cargo run -p self-study-desktop -- --smoke
```

## Logs

Rust: `tracing`. `APP_ENV=production` → JSON logs. Request completion lines include `request_id`, `latency_ms`, and `x-request-id`. Web failures log once via `apps/web/src/lib/logger.ts` (no payloads).

## Run

```bash
cp .env.example .env
cargo run -p api
npm install
npm run dev:web
npm run dev:landing
```

API: `127.0.0.1:18080`. SQLite: `data/selfstudy.db`. Postgres: `postgres://` URL selects Postgres. Migrations `001`–`005_accounts_sync` on connect.

Docker (Nginx `8088`):

```bash
docker compose up --build
```

| URL | Service |
| --- | --- |
| `http://localhost:8088/` | Landing |
| `http://localhost:8088/app/` | Product app |
| `http://localhost:8088/healthz` | API |

Set `NEXT_PUBLIC_APP_URL=http://localhost:8088/app/` when building landing for compose.

## Checks

```bash
cargo build --workspace
cargo clippy --workspace --all-targets -- -D warnings
npm run typecheck
npm run lint:web
cd apps/landing && npm run typecheck && npm run lint
```

Playwright (`e2e/`) is optional smoke—not part of the minimal scaffold gate. Specs: `smoke.spec.ts`, `phase2`–`phase4`, and `phase5.spec.ts` (auth API smoke). **No CI pipeline** runs these automatically yet.

## Design

Tokens: `design-system/self-study-ai/MASTER.md` → `packages/ui/tailwind.preset.ts`. Landing overrides: `design-system/self-study-ai/pages/landing.md`. Lexend + Source Sans 3 via `next/font`.