# Subjects gaps

Route: `/subjects/`. Design: `design-system/subjects_self_study_ai` (light). Dark twin: `subjects_dark_mode_self_study_ai`. Placeholder: `apps/web/src/lib/placeholders/subjects.ts`.

Live data already used: `GET /subjects` (name, description), `GET /sources`, `GET /questions`, `GET /questions?gold=true`, `GET /tests`, `GET /dashboard` (`due_today`), `GET /due-queue?subject_id=` per subject, `GET /topics/{source}` titles, `POST /sessions` for Study now, `POST /subjects` via the existing `/subjects/new/` form, upload through `/sources/`.

| id | UI element | Design expects | Backend now | Suggested change |
|---|---|---|---|---|
| subjects-1 | Mastery coverage | A percent, a month-over-month delta, and a mastered/total card ratio | Questions can be counted. No mastery percent, delta, or mastered split on `Subject` or `GET /dashboard` | Add `mastery_pct`, `mastery_delta`, `mastered_count`, and `card_count` on each subject in `GET /subjects` or `GET /dashboard` |
| subjects-2 | Review minutes | Estimated minutes for the due queue, on the urgent card and on each subject | Due count exists. No duration | Add `estimated_review_minutes` on `GET /due-queue` |
| subjects-3 | Gold accuracy | A percent beside the gold count ("98.2%") | `GET /questions?gold=true` returns the list. No accuracy for that set | Add `gold_accuracy` on `GET /dashboard` |
| subjects-4 | Category tabs and card tags | Discipline, level, and an archived flag, with counts | `Subject` is `id`, `name`, `description`, timestamps | Add `category`, `level`, and `archived` on `Subject` |
| subjects-5 | Sort by review urgency | Order subjects by how due they are | Due counts are per subject only after N queue calls. No sort key | Add `due_count` on each subject so the client can sort without N requests |
| subjects-6 | Import history | A history of file imports | Sources have `created_at` and `status`. No import-history feed | Add `GET /sources/imports` with file name, subject, status, and time |
| subjects-7 | Module score badges | Per-module percent and a Strong / Stable / Review label | `GET /topics/{source}` returns `title` and `position` only | Add `mastery_pct` and `status` on `Topic` |
| subjects-8 | Open subject and View all modules | Open the syllabus and list every module | Topics are flat per source. No subject syllabus tree, and no chapter resource | Add `GET /subjects/{id}/syllabus` with ordered modules, card counts, and mastery |
