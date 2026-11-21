# E10 Scoring

## Goal

Add the indexes the points ledger does not already provide: a 0–1000 knowledge score, gold count and gold accuracy, a points split by surface, and the next streak milestone.

## Scope

- **C23 Knowledge score.** A score clamped to 0–1000, a week-over-week delta, and a band, on `GET /dashboard`. The same number is the analytics figure. `total_points` and `level` stay as they are (`level_from_points` in `crates/learning/src/points.rs`). Closes `overview-1` and `analytics-5`. The formula is an open question. Proposed default: scale recent accuracy, mastery from C22, and gold accuracy from C24 into 1000, and document the weights in `Docs/LEARNING_ENGINE.md` before coding.
- **C24 Gold statistics.** `gold_count` and `gold_delta` need the time a question became gold. `created_at` is not that time. `gold_accuracy` is the mean score of attempts on questions with `is_gold`. Closes `overview-4` and `subjects-3`.
- **C25 Points breakdown.** Aggregate `points_ledger` into reviews, quizzes, gold, and streak shares for the reporting window (C29). Rows already store `test_id` and `multiplier_breakdown` (`gold_multiplier`, `streak_bonus`, `test_multiplier`). Reasons today are only `answer` and `override_compensation`. Quiz awards are distinguishable once C18 marks the session. Closes `analytics-7`.
- **C26 Streak milestones.** `StreakInfo` stays `current`, `longest`, `timezone`. Add the next threshold and its label. The design copy is "Next milestone badge at 14 days" while the current streak is 12, so the first thresholds include 14. Closes `reviews-7`.

Points, gold multipliers, and streak days already calculate on every graded attempt for both local-only and signed-in users. These capabilities only read and label that ledger. No AI call and no credits. Sync already merges the ledger by id and derives the balance from it.

## Out of scope

- Changing the points formula, anti-farm rule, or ledger idempotency in `Docs/LEARNING_ENGINE.md`.
- A new level curve. Level stays `n * 100` points.
- Gold promotion workflow. Proposed, confirmed, and rejected already exist on the question.

## Crates

`learning` for the score, gold aggregate, breakdown, and milestone table. `core` for the dashboard fields. `storage` for `gold_at` and the aggregate queries. `api` for the dashboard, ledger, and streak payloads.
