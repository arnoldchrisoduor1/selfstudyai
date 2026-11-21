# Desktop manual tests (Windows)

Automated desktop smoke (embedded Axum + `/healthz`):

```bash
cargo run -p self-study-desktop -- --smoke
# or: cd apps/desktop && npm run smoke
```

## Windows verification status (Phase 5 wrap)

| Check | Status |
| --- | --- |
| `--smoke` (`lib.rs` spawns API on ephemeral port, `server::health_ok`) | **Not run** in Phase 5 wrap (disk full during `self-study-desktop` compile); logic reviewed in `server.rs` / `lib.rs` |
| Full Tauri webview manual checklist below | **Pending** — run on a Windows workstation |
| macOS / Linux Tauri | **Unverified** (configs present) |

Smoke is conceptual: `apps/desktop/src-tauri/src/server.rs` binds localhost, runs `storage::connect` + `api::router` with SQLite under `%AppData%\self-study-ai\selfstudy.db` (via `dirs::data_dir()`), and polls raw HTTP until `200` + body `ok`.

## Auth headers (desktop)

`POST /auth/sign-in` looks at `x-study-client: desktop` and returns `bearer_token` instead of `Set-Cookie`. The product `api-client` sets that header when `window.__STUDY_API_BASE__` is injected by Tauri (`lib.rs` init script), stores the token in `localStorage`, and sends `Authorization: Bearer …` on later requests.

## Manual checklist

1. Launch `cd apps/desktop && npm run dev` — webview loads study app.
2. Create subject, upload fixture, search, answer question, short test.
3. Quit and relaunch — data still in app-data SQLite.
4. Sign in (Settings → Account) — sync pull returns records when a cloud API is configured.
5. Sign out — local SQLite still usable offline.