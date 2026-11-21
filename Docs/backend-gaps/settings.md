# Settings gaps

Route: `/settings/`. Designs: `design-system/settings_study_fsrs_self_study_ai` and `design-system/settings_ai_models_self_study_ai` (both light). Placeholder: `apps/web/src/lib/placeholders/settings.ts`.

Live data already used: `GET/PATCH /learning-settings` (retention, daily goal, new cards, mix, timezone, test defaults), `GET/PATCH /question-settings` (burst size, notes versus online), `GET /subjects`, `GET /due-queue?subject_id=`, `GET /dashboard` (`due_today`), `GET /points-ledger`, `GET /ai-providers`, `GET /credits/balance`, `GET /credits/ledger` when signed in. Display name, the key/value settings table, question settings, and account sync stay on their tabs.

| id | UI element | Design expects | Backend now | Suggested change |
|---|---|---|---|---|
| settings-1 | Volume note | A forecast such as "about 28 cards a day" at the chosen retention | `due_today` is the queue due now, not a forecast | Add a projected daily load for a retention target |
| settings-2 | Advanced weights | w0–w16, "17 weights configured" | Learning settings have no FSRS weight vector | Add the weight vector on `GET/PATCH /learning-settings` |
| settings-3 | Max interval | Days per subject, such as 180 or 365 | No max-interval field | Add `maximum_interval_days` on learning settings, including subject overrides |
| settings-4 | Custom toggle, Edit, exam chip | Per-subject retention override, an editor, and an exam countdown | `PATCH /learning-settings?subject_id=` can set retention. No way to clear an override. No exam date | Add a clear-override call and an exam date on the subject |
| settings-5 | Gateway key | One masked key with show, change, and test ping | Keys live on each `AiProvider`, not one managed gateway | Add a single gateway credential, or keep the provider form as the editor |
| settings-6 | Credits card | Tier, reset date, auto-reload, buy | `GET /credits/balance` is balance, reserved, available. `POST /credits/topup` is a mock top-up. No tier or reset | Add plan, reset date, and auto-reload. 401 when signed out |
| settings-7 | Usage table and Export CSV | Named tasks, chapter details, and a CSV | Ledger rows are `kind`, `reference`, and `amount` | Add task title and detail, plus `GET /credits/ledger.csv` |
| settings-8 | Cycle updated | A memory-model timestamp | No cycle timestamp | Add `schedule_updated_at` on learning settings or the dashboard |
| settings-9 | Model cards | Local, bring-your-own key, and app-credit cloud as the stored mode | Providers are a list. Nothing marks the active product mode | Add a workspace inference mode, separate from provider records |
