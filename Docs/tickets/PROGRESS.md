# Ticket backlog progress

Docs only. No application code, migrations, or tests in this pass.

Source of truth for this phase: `docs/backend-gaps/`, `BACKEND_GAP(...)` in `apps/web`, `apps/web/src/lib/placeholders/`, and the Rust workspace under `crates/`.

## T0 — Inventory

- [x] Parse every gap doc row into `docs/tickets/_work/gaps.json`
- [x] Verify each row against the API, entities, and migrations. Status is `MISSING`, `PARTIAL`, or `EXISTS`
- [x] `EXISTS` rows are in `docs/tickets/_work/wiring-fixes.md` and will not become tickets
- [x] Design HTML scan is in `docs/tickets/_work/possible-missed-gaps.md`
- [x] Hint list checked. Accepted hints are `source: "hint"` in `gaps.json`. Rejected hints are in the hint table in `possible-missed-gaps.md`

Stopped here. Say **continue** to start T1 (capability map and epics).

### Counts

Gap-doc rows: **67**. Missing **34**, partial **32**, exists **1**.

| View | Missing | Partial | Exists | Total |
|---|---:|---:|---:|---:|
| Overview | 5 | 8 | 0 | 13 |
| Subjects | 5 | 3 | 0 | 8 |
| Library | 4 | 1 | 0 | 5 |
| Reviews | 4 | 4 | 0 | 8 |
| Quizzes | 2 | 6 | 0 | 8 |
| Final tests | 5 | 2 | 0 | 7 |
| Analytics | 5 | 3 | 1 | 9 |
| Settings | 4 | 5 | 0 | 9 |

Hint rows added, not in the table above: **5** (1 missing, 4 partial).

`settings-9` is in the gap doc and is not tagged `BACKEND_GAP` in the frontend.

### Exists (no ticket)

- `analytics-9` — plot `GET /tests` scores. Keep the sample for the empty state only.

## T1 — Capability map and epics

- [x] `docs/tickets/capabilities.md` — 33 capabilities, each open gap on exactly one
- [x] `docs/tickets/epics/E00-foundations.md` through `E12-exports.md`

Stopped here. Say **continue** to start T2 (dependency graph, priority, five delivery phases, `docs/tickets/ROADMAP.md`).

### Capabilities

33 (C00–C32). 7 foundation capabilities close no design gap. 26 close 71 open gaps. `analytics-9` is not assigned.

| Epic | Capabilities |
|---|---|
| E00 Foundations | C00–C06 |
| E01 Sync and devices | C07 |
| E02 Documents and ingestion | C08–C11 |
| E03 Search and answers | C12 |
| E04 AI providers | C13 |
| E05 Credits | C14 |
| E06 Reviews and FSRS | C15–C17 |
| E07 Quizzes | C18 |
| E08 Exams | C19–C21 |
| E09 Curriculum | C22 |
| E10 Scoring | C23–C26 |
| E11 Analytics | C27–C30 |
| E12 Exports | C31–C32 |

## T2 — Dependency graph and ordering

- [x] `blocked_by` for all 33 capabilities
- [x] Build order: foundations, then dependency, then screens unlocked, then core-loop weight
- [x] Priority P0–P3
- [x] Five delivery phases in `docs/tickets/ROADMAP.md`
- [x] Graph check: 0 cycles, 0 dependencies on a later phase, mermaid edges match the table

The five `Docs/Plan/` phases are the finished build. This roadmap is the next five phases for the gap backlog.

Stopped here. Say **continue** to start T3 (tickets, epic by epic, stopping after each epic). First epic is E00 Foundations.

### Order

| Phase | Capabilities | Priority mix |
|---|---|---|
| 1 Foundations | C00–C06 | 2 P0, 3 P1, 2 P2 |
| 2 Review load and library | C15, C16, C08, C09, C10, C11 | 4 P1, 2 P2 |
| 3 Mastery, exams, dashboard score | C22, C19, C27, C17, C24, C23, C31 | 1 P0, 4 P1, 2 P2 |
| 4 Generation, quizzes, transcript | C13, C12, C21, C18, C20, C26 | 2 P0, 1 P1, 2 P2, 1 P3 |
| 5 Sync copy, credits, analytics | C07, C14, C28, C29, C25, C30, C32 | 5 P1, 2 P2 |

## T3 — Tickets

E00 Foundations written. Stopped for review.

| Id | Title | Priority | Size | Blocked by |
|---|---|---|---|---|
| T-001 | Shared list envelope and idempotency store | P0 | M | — |
| T-002 | Feature flags per install and per user | P0 | M | — |
| T-003 | OpenAPI for health, subjects, settings, profiles | P1 | M | T-001, T-002 |
| T-004 | OpenAPI for the remaining current routes | P1 | M | T-003 |
| T-005 | Job rows; ingest spawn unchanged when flag off | P1 | M | T-001, T-002, T-003 |
| T-006 | Audit log, IP stays server-side | P2 | M | T-001, T-002 |
| T-007 | In-process outbox, five events | P1 | M | T-001, T-002 |
| T-008 | Dev seed and shared fixture builders | P2 | M | — |

Files: `docs/tickets/E00-foundations/`. No gap ids. All phase 1. No L tickets.

Next epic on continue: E01 Sync and devices (C07, one capability).

## T4 — Indexes and validation

Not started.
