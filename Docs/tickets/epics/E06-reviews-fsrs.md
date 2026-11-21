# E06 Reviews and FSRS

## Goal

Expose the deck the scheduler already stores: load, forecast, and the next batch; let the learner read and tune FSRS weights, the max interval, and an uncapped session; and let a flashcard session rate Again / Hard / Good / Easy with the next interval shown first.

## Scope

- **C15 Review load and next batch.** One read model over `card_states` and `review_logs`. It returns estimated minutes (a documented seconds-per-card default), due and overdue counts grouped by subject, `subjects_due`, `due_count` on each subject, mean stability for the whole deck, a 7-day forecast in the learner's `learning_timezone`, the projected daily load at a proposed `desired_retention`, and the next batch (title, reason, question ids, minutes, points multiplier from the existing points config). `CardStateRepository::list_all` exists and has no HTTP route; this capability is that route plus the rollups. Due items gain `subject_id` so one queue response can be grouped. Closes `overview-2`, `overview-7`, `overview-8`, `overview-13`, `subjects-2`, `subjects-5`, `reviews-2`, `reviews-3`, `reviews-4`, `settings-1`.
- **C16 FSRS model.** Persist the 17 `rs-fsrs` weights, `maximum_interval_days` (user default and per-subject override), `fsrs_auto_tune`, and `schedule_updated_at`. `FsrsScheduler` in `crates/learning/src/scheduler.rs` reads them. Today it uses `Parameters::default()` and only sets `request_retention` and `enable_fuzz`. Reset restores the crate defaults. Optimize refits weights from `review_logs` and writes them back. Full session lifts the `burst_size` cap of 20 for `mode: review_due` only. Closes `settings-2`, `settings-3`, `settings-8`, `library-3`, `reviews-6`, `hint-fsrs-optimize`.
- **C17 Flashcard rating.** Before the learner rates, return the four next intervals from the scheduler. Accept Again / Hard / Good / Easy as the rating for that card instead of only `score_to_rating`. Support bury-until-tomorrow. `SessionScope` gains `question_ids` so Practice on one due card does not open the whole topic. `PATCH /questions/{id}` already edits the card. Closes `hint-flashcard-ratings` and `reviews-8`.

Local-only and signed-in users schedule on the device that holds their `card_states`. After sync, card state is still recomputed from merged `review_logs`, so weights and intervals travel as settings and logs, not as authoritative card rows. Optimizer and interval preview do not call a paid model. Cloud credits are unchanged.

## Out of scope

- The definition of "mastered", topic badges, and weak-topic rows (C22).
- Retention percent and the decay curve (C27).
- The exam date and clearing a retention override (C19). `desired_retention` overrides already save through `PATCH /learning-settings?subject_id=`.
- Deck file download (C31).
- Streak milestone copy (C26).

## Crates

`learning` for the scheduler, forecast, and optimizer. `core` for card, settings, and scope types. `storage` for weight columns, bury, and listing all card states. `api` for the routes. `questions` only for session scope on create.
