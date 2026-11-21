# Learning Engine

Phase 4 reference for rating mapping, points, streaks, tests/integrity, and defaults.
Change behavior here first, then code.

## Clock

All scheduling, streaks, and test timers use a `Clock` trait (`study_core::Clock`).
Business logic must not call `Utc::now()` directly.

| Env | Behavior |
|-----|----------|
| `APP_ENV=production` | Always `SystemClock`. `STUDY_CLOCK_ISO` ignored. |
| Otherwise | Optional `STUDY_CLOCK_ISO` (RFC3339 / `%Y-%m-%dT%H:%M:%SZ`) builds a `FakeClock`. |
| Tests | `storage::connect_with_clock` + `AppState::with_scheduler(..., Some(fake))` for advance. |

## Timezone

Setting key: `learning_timezone` (default `UTC`).
Streak and daily activity dates use a fixed offset (`UTC`, `Z`, `+03:00`, `-05:00`).
Named IANA zones without a numeric offset fall back to UTC until a zone DB is added.
Browser may seed timezone on first run via learning settings PATCH.

## Rating mapping (score → FSRS)

Configurable thresholds (`learning_rating_thresholds`):

| Condition | Rating |
|-----------|--------|
| `score < again_below` (default 0.4) | Again |
| `score < hard_below` (default 0.7) | Hard |
| `score < good_below` (default 0.95) | Good |
| else | Easy |

Every graded attempt (study or test) schedules via `rs-fsrs` behind `Scheduler`.
Manual grade override re-runs scheduling for that attempt and writes compensating points entries (ledger is append-only).

## Due queue order

1. Overdue reviews  
2. Due today  
3. New cards  

Within a bucket: earliest `due`, then `question_id`.

## Desired retention

Default `0.9` (range 0.7–0.99). Higher retention → shorter intervals.

## Points formula

```
base = base_kind * level_multiplier
raw = base
    * score
    * gold_multiplier          // 1.0 or config.gold_multiplier
    * (1 + streak_bonus)       // capped
    * test_multiplier          // 1.0 unless clean focus-mode test
    * anti_farm_multiplier     // 0 when same question already answered today
total = round(raw)
```

Defaults (`learning_points_config`):

| Field | Default |
|-------|---------|
| base_mcq | 10 |
| base_written | 15 |
| level_recall / understand / apply / analyze | 1.0 / 1.1 / 1.25 / 1.4 |
| gold_multiplier | 1.5 |
| streak_bonus_per_day | 0.05 |
| streak_bonus_cap | 0.5 |
| test_multiplier | 1.25 |
| same_day_repeat_multiplier | 0.0 |

Ledger reasons: `attempt_award`, `attempt_override_compensate`, etc.
Unique `(attempt_id, reason)` prevents double awards.
Overrides never edit rows; they append compensating amounts.

Level progress: level `n` needs `n * 100` points in that band.

## Streaks

Streak = consecutive **user-local** calendar days where `daily_activity.goal_met`.
Daily goal defaults to 10 questions (`learning_daily_goal`).
Alive if last goal day is today or yesterday; a gap resets current, longest kept.

## Study modes

| Mode | Behavior |
|------|----------|
| practice | Generate new bursts (Phase 3) |
| review_due | Serve due queue only |
| mixed | Blend reviews + new by `review_new_ratio` (default 0.7 reviews) with `new_questions_per_day` cap |

Session rows record `item_kind` (`new` \| `review`).

## Settings resolution

Order: **subject override → user default → system default**.
One resolver: `learning::resolve_learning_settings`.
Keys: `learning_*`; subject: `subject:{id}:learning_*`.

## Final tests

Config snapshotted into `tests.config` at create time.
Timer enforced server-side; late submit → expired/reject.
Answer leak: no `correct_option` / `model_answer` / `explanation` until submit (or per-question if `feedback_timing=immediate`).

### Integrity

Focus mode: UI requires fullscreen to start; logs:

`focus_lost`, `focus_regained`, `tab_hidden`, `fullscreen_exit`, `paste`, `copy`, `context_menu`, `resize`

**Honest limit:** the browser can detect and record these events; it cannot prevent them. This is an accountability log.

| Status | When |
|--------|------|
| unverified | Focus mode off, or fullscreen never entered |
| flagged | Any flagging event while focus mode + fullscreen |
| clean | Focus mode + fullscreen, no flagging events |

Flagged / unverified tests do **not** earn the test points multiplier.

## Defaults summary

| Setting | Default |
|---------|---------|
| desired_retention | 0.9 |
| daily_goal | 10 |
| new_questions_per_day | 20 |
| review_new_ratio | 0.7 |
| timezone | UTC |
| test question_count | 10 |
| test time_limit_s | 1800 |
| test pass_mark | 0.7 |
| test feedback_timing | end |
| test navigation | free |
| test focus_mode | false |
