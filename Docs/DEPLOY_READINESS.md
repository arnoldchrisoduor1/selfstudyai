# Deploy readiness (Phase 5 draft)

Deployment itself is out of scope. This checklist matches the current compose stack.

## Required environment

| Variable | Default | Notes |
| --- | --- | --- |
| `APP_ENV` | `development` | `production` enables JSON logs + secure cookies |
| `DATABASE_URL` | `sqlite://...` | Use `postgres://` for cloud multi-user |
| `API_HOST` / `API_PORT` | `127.0.0.1:18080` | Docker uses `8080` |
| `FILES_DIR` | `data/files` | Uploaded sources + export originals |
| `CORS_ORIGINS` | localhost list | Comma-separated |
| `MAX_UPLOAD_BYTES` | 50MB | |
| `CREDITS_DAILY_CAP` | `500` | Per-user usage credits |
| `ADMIN_USER_ID` | unset | Enables `/credits/admin/adjust` |
| `CLOUD_AI_API_KEY` | unset | Gates cloud AI when provider wired |

## Migrations

Run on startup via `storage::connect`. Order: `001` → `005_accounts_sync`.

## Health

- `GET /healthz`

## Backup

- Postgres: `pg_dump` on schedule; test restore quarterly.
- Files: snapshot `FILES_DIR` with DB; content deduped by `content_hash`.

## Rollback

1. Stop API.
2. Restore DB snapshot.
3. Restore file snapshot.
4. Deploy previous image tag.

## Not verified in Phase 5 slice

- Full Docker wipe rebuild (step 8).
- Playwright phase 5 suite.
- Desktop Windows smoke on CI host.