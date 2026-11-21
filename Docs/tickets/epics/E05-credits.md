# E05 Credits

## Goal

Show a signed-in learner their plan, when the balance resets or that it does not, auto-reload preferences, and a usage table that names the task, with a CSV download.

## Scope

- **C14 Credits plan and usage.** Extend `GET /credits/balance` (`balance`, `reserved`, `available` in `crates/core/src/credits.rs`) with the plan fields the settings card shows: tier name, reset date or an explicit no-reset, and auto-reload settings. `POST /credits/topup` stays the buy action and stays on `MockPaymentProvider` with `idempotency_key`. Ledger rows gain a task title and a detail string (the design's "Chapter practice generation" and chapter name), filled from the `usage_events` row the charge already references. `GET /credits/ledger.csv` returns those columns. Closes `settings-6` and `settings-7`.

Signed-out and local-only callers get 401, which the route already returns. They do not see a tier. Cloud AI charges go through this ledger. Local and bring-your-own-key calls write no credit row.

The designs disagree: the settings card has a reset date, and the marketing page says credits never expire. The ticket records that as an open question. Default until you decide: prepaid credits do not expire, `reset_at` is null, and auto-reload is off.

## Out of scope

- Stripe, M-Pesa, or any live charge. See `docs/PAYMENTS_TODO.md`.
- Changing the reserve, settle, refund, and daily-cap flow.
- The security audit log (C04). The settings label "Audit log of cloud processing" is this usage table, not the IP log.

## Crates

`core` for the balance and ledger types. `storage` for the migration and `credits_repos`. `api` for the balance, ledger, and CSV routes.
