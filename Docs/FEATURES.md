# Features

What Self Study AI implements today. This file is the source of truth for product copy (including the marketing site). Items marked **placeholder** or **not integrated** are intentional gaps.

## Local-first core

- **Subjects and goals** — Organize study material by subject. CRUD via API and web UI (`/subjects/`).
- **Settings** — Key/value settings stored in SQLite (or Postgres when `DATABASE_URL` is Postgres). Web UI at `/settings/`.
- **Desktop shell (Tauri 2)** — Embeds the product app and in-process Axum API. SQLite and uploaded files live under OS app data. Local-only use does not require an account.
- **Data export** — `GET /export` returns JSON (authenticated users get cloud scope; local export path documented in API).

## Ingest and search (Phase 2)

- **Sources** — Upload notes or books (`.md`, `.txt`, `.pdf`, `.epub`). Deduped by `content_hash` within a subject. Background ingest with progress and failure states.
- **Topics and chunks** — Hierarchical topics, ~500-token chunks with overlap, FTS5 keyword index plus stored embeddings.
- **Hybrid search** — Vector similarity + FTS fused ranking. Filters by subject, source, topic (`POST /search`). Web UI at `/search/` and `/sources/`.
- **AI providers** — OpenAI-compatible HTTP, Ollama, and `MockProvider` for tests. Keys stored server-side; masked in UI. Default chat and embedding models; re-embed when the embedding model changes.
- **Web search (optional)** — `WebSearchProvider` for online-grounded question generation. Generic HTTP + mock for tests.

**Limitations:** Scanned PDFs without extractable text fail ingest. Brute-force vector search in v1 (designed for later sqlite-vec/pgvector).

## Questions and study (Phase 3)

- **Generation** — Notes mode uses cited chunks; online mode uses search excerpts (labeled `grounding=online`). MCQ and written questions; cognitive levels recall → analyze; configurable mix and burst size.
- **Study sessions** — Burst-based flow: create/resume session, fetch next burst, submit answers, AI or deterministic grading, feedback panel, grade overrides, flag and gold promotion.
- **Question bank** — Filter, edit, archive, gold review queue (`/questions/`, `/questions/gold/`).
- **Usage tracking** — `usage_events` for generation, grading, embedding (feeds cloud credits accounting).

## Learning engine (Phase 4)

- **FSRS scheduling** — `rs-fsrs` behind a scheduler; ratings from attempt scores with configurable thresholds; due queue (overdue → today → new).
- **Points and streaks** — Append-only `points_ledger`; streaks and daily activity respect `learning_timezone`.
- **Overview** — Dashboard, due queue, points ledger (`/overview/`, `/study/`).
- **Tests** — Timed/focus-mode tests with integrity events, submit flow, results (`/tests/`). See `Docs/LEARNING_ENGINE.md`.

**Note:** `card_states` are derived from merged `review_logs` after sync; they are not authoritative across devices.

## Accounts, sync, and credits (Phase 5)

Optional. The product remains fully usable without signing in.

### Accounts

- Email/password (argon2id), sign-up, sign-in, verify email, password reset, logout, logout-all, delete account.
- Sessions: httpOnly cookies (web) and bearer tokens (desktop via `x-study-client: desktop` on sign-in; stored in `api-client`).
- `POST /auth/link-local` — upload local data to a new cloud account only after explicit confirmation.
- **Email:** `ConsoleSender` in dev/tests; SMTP implementation available for production config.

### Sync

- `GET /sync/status`, `POST /sync/pull`, `POST /sync/push` — versioned records, tombstones, batched cursor (`sync_cursors`).
- Conflict policy: last-write-wins on editable entities; append-only tables merge by id; card scheduling recomputed after merge.
- **UI:** Sync status in app shell; Settings account section (when present in web build).

### Cloud AI credits

- Prepaid **credits ledger** (`credits_ledger`, `credit_reservations`). Balance, ledger, top-up start via API.
- Cloud provider uses platform keys (`CLOUD_AI_API_KEY`); reserve → call → settle pattern; daily cap (`CREDITS_DAILY_CAP`).
- **Payments:** `MockPaymentProvider` and admin-only `POST /credits/admin/adjust` when `ADMIN_USER_ID` is set. **No real payment gateway** (Stripe/M-Pesa) — see `Docs/PAYMENTS_TODO.md`.

## Marketing site (`apps/landing`)

- Static Next.js export. Describes the features above without testimonials or fabricated metrics.
- Download / open-app links marked as placeholders until publish artifacts exist.

## Explicitly not done

| Area | Status |
| --- | --- |
| CI/CD (GitHub Actions, Jenkins) | **Not set up** |
| Real payment gateway | **Not integrated** (mock + admin adjust only) |
| Desktop macOS/Linux | Config present; **Windows-first verification** |
| Auto-update (desktop) | Documented TODO |
| Global auth middleware | Per-route `auth_context`; see `Docs/SECURITY_REVIEW.md` |

## Web app routes (product)

| Route | Purpose |
| --- | --- |
| `/subjects/` | Subject list |
| `/subjects/new/`, `/subjects/edit/` | Subject CRUD |
| `/sources/`, `/sources/detail/` | Library and topic tree |
| `/search/` | Hybrid search |
| `/study/`, `/study/session/` | Study home and session |
| `/questions/`, `/questions/gold/` | Bank and gold review |
| `/overview/` | Dashboard and due items |
| `/tests/` … | Test list, session, results |
| `/settings/` | Settings, providers, account/sync when enabled |
| `/dev/components/` | Component gallery |

## API surface (summary)

Health: `GET /healthz`. CRUD for subjects, settings, sources, topics, chunks, search, providers, sessions, questions, learning (`/due-queue`, `/dashboard`, …), tests, auth (`/auth/*`), sync (`/sync/*`), credits (`/credits/*`), `GET /export`. Full route list: `crates/api/src/routes/mod.rs`.