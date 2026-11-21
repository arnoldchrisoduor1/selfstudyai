# Library gaps

Route: `/sources/`. Design: `design-system/library_self_study_ai` (light). Dark twin: `library_dark_mode_self_study_ai`. Placeholder: `apps/web/src/lib/placeholders/library.ts`.

Live data already used: `GET /sources`, `GET /subjects`, `GET /questions` (card counts), `GET /topics/{source}` (concept count), `POST /sources` upload, `DELETE /sources/{id}`, `POST /sources/{id}/reembed`, `POST /search` when "Search inside documents" is on. Sync now calls `POST /sync/push` and `POST /sync/pull` on click. The page does not call `GET /sync/status` on load, because that 401s when signed out. Read opens `/sources/detail/`. FSRS settings opens `/settings/`.

| id | UI element | Design expects | Backend now | Suggested change |
|---|---|---|---|---|
| library-1 | Storage stat | Used bytes and a local/cloud mirror label ("1.8 GB") | `Source` has no byte size. No quota | Add `bytes` on `Source` and `storage_used` / `storage_quota` on a library summary |
| library-2 | Import from URL | Create a source from a URL | `POST /sources` is multipart file upload only | Add `POST /sources/url` with `subject_id` and `url` |
| library-3 | Corpus footer | A flag that automatic FSRS tuning is on | Learning settings have `desired_retention` and caps. No tuning-enabled flag | Add `fsrs_auto_tune` on `GET /learning-settings` |
| library-4 | Backup copy | Encryption-at-rest and multi-device availability lines | `GET /sync/status` is `state`, `last_sync_at`, `message` | Add `encrypted` and `devices` on the sync status, or drop the claims until they exist |
| library-5 | Type & size, textbook meta | File size, page count, author | `Source` has `title`, `kind`, `file_name`, `status`, `progress` | Add `bytes`, `page_count`, and `author` on `Source` |
