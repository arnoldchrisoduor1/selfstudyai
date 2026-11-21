use chrono::{DateTime, Utc};
use rs_fsrs::{Card, Parameters, Rating as FsrsRating, State as FsrsState, FSRS};
use study_core::{
    CardLearningState, CardState, Clock, DueQueueItem, ReviewRating,
};

#[derive(Debug, Clone, PartialEq)]
pub struct ScheduleOutcome {
    pub stability: f64,
    pub difficulty: f64,
    pub state: CardLearningState,
    pub reps: i32,
    pub lapses: i32,
    pub due: DateTime<Utc>,
    pub last_review: DateTime<Utc>,
    pub scheduled_days: f64,
    pub elapsed_days: f64,
}

pub trait Scheduler: Send + Sync {
    fn schedule(
        &self,
        previous: Option<&CardState>,
        rating: ReviewRating,
        now: DateTime<Utc>,
        desired_retention: f64,
    ) -> Result<ScheduleOutcome, ScheduleError>;
}

#[derive(Debug, thiserror::Error, PartialEq, Eq)]
pub enum ScheduleError {
    #[error("invalid card timestamp")]
    InvalidTimestamp,
}

#[derive(Debug, Default, Clone)]
pub struct FsrsScheduler;

impl FsrsScheduler {
    fn parameters(desired_retention: f64) -> Parameters {
        let mut params = Parameters::default();
        params.request_retention = desired_retention.clamp(0.7, 0.99);
        params.enable_fuzz = false;
        params
    }

    fn to_fsrs_rating(rating: ReviewRating) -> FsrsRating {
        match rating {
            ReviewRating::Again => FsrsRating::Again,
            ReviewRating::Hard => FsrsRating::Hard,
            ReviewRating::Good => FsrsRating::Good,
            ReviewRating::Easy => FsrsRating::Easy,
        }
    }

    fn from_fsrs_state(state: FsrsState) -> CardLearningState {
        match state {
            FsrsState::New => CardLearningState::New,
            FsrsState::Learning => CardLearningState::Learning,
            FsrsState::Review => CardLearningState::Review,
            FsrsState::Relearning => CardLearningState::Relearning,
        }
    }

    fn parse_ts(raw: &str) -> Result<DateTime<Utc>, ScheduleError> {
        if let Ok(dt) = DateTime::parse_from_rfc3339(raw) {
            return Ok(dt.with_timezone(&Utc));
        }
        if let Ok(naive) = chrono::NaiveDateTime::parse_from_str(raw, "%Y-%m-%dT%H:%M:%SZ") {
            return Ok(DateTime::<Utc>::from_naive_utc_and_offset(naive, Utc));
        }
        Err(ScheduleError::InvalidTimestamp)
    }

    fn card_from_state(previous: Option<&CardState>, now: DateTime<Utc>) -> Result<Card, ScheduleError> {
        let Some(prev) = previous else {
            return Ok(Card {
                due: now,
                stability: 0.0,
                difficulty: 0.0,
                elapsed_days: 0,
                scheduled_days: 0,
                reps: 0,
                lapses: 0,
                state: FsrsState::New,
                last_review: now,
            });
        };
        let due = Self::parse_ts(&prev.due)?;
        let last_review = prev
            .last_review
            .as_deref()
            .map(Self::parse_ts)
            .transpose()?
            .unwrap_or(now);
        let state = match CardLearningState::parse(&prev.state).unwrap_or(CardLearningState::New) {
            CardLearningState::New => FsrsState::New,
            CardLearningState::Learning => FsrsState::Learning,
            CardLearningState::Review => FsrsState::Review,
            CardLearningState::Relearning => FsrsState::Relearning,
        };
        Ok(Card {
            due,
            stability: prev.stability,
            difficulty: prev.difficulty,
            elapsed_days: 0,
            scheduled_days: 0,
            reps: prev.reps,
            lapses: prev.lapses,
            state,
            last_review,
        })
    }
}

impl Scheduler for FsrsScheduler {
    fn schedule(
        &self,
        previous: Option<&CardState>,
        rating: ReviewRating,
        now: DateTime<Utc>,
        desired_retention: f64,
    ) -> Result<ScheduleOutcome, ScheduleError> {
        let fsrs = FSRS::new(Self::parameters(desired_retention));
        let card = Self::card_from_state(previous, now)?;
        let elapsed_days = if previous.and_then(|p| p.last_review.as_ref()).is_some() {
            now.signed_duration_since(card.last_review)
                .num_days()
                .max(0) as f64
        } else {
            0.0
        };
        let info = fsrs.next(card, now, Self::to_fsrs_rating(rating));
        let next = info.card;
        Ok(ScheduleOutcome {
            stability: next.stability,
            difficulty: next.difficulty,
            state: Self::from_fsrs_state(next.state),
            reps: next.reps,
            lapses: next.lapses,
            due: next.due,
            last_review: next.last_review,
            scheduled_days: next.scheduled_days as f64,
            elapsed_days: if info.review_log.elapsed_days > 0 {
                info.review_log.elapsed_days as f64
            } else {
                elapsed_days
            },
        })
    }
}

/// Overdue first, then due today, then new. Within bucket: earliest due first.
pub fn order_due_queue(mut items: Vec<DueQueueItem>, now: DateTime<Utc>) -> Vec<DueQueueItem> {
    let today_end = now.date_naive().and_hms_opt(23, 59, 59).map(|n| {
        DateTime::<Utc>::from_naive_utc_and_offset(n, Utc)
    });
    items.sort_by(|a, b| {
        let bucket = |item: &DueQueueItem| -> u8 {
            if item.card_state.state == CardLearningState::New.as_str()
                && item.card_state.last_review.is_none()
                && item.overdue_days <= 0.0
            {
                return 2;
            }
            if item.overdue_days > 0.0 {
                return 0;
            }
            1
        };
        bucket(a)
            .cmp(&bucket(b))
            .then_with(|| {
                a.card_state
                    .due
                    .cmp(&b.card_state.due)
            })
            .then_with(|| a.question_id.cmp(&b.question_id))
    });
    let _ = today_end;
    items
}

pub fn overdue_days(due: &str, now: DateTime<Utc>) -> f64 {
    match FsrsScheduler::parse_ts(due) {
        Ok(due_at) => {
            let secs = now.signed_duration_since(due_at).num_seconds() as f64;
            secs / 86_400.0
        }
        Err(_) => 0.0,
    }
}

pub fn format_due(dt: DateTime<Utc>) -> String {
    dt.format("%Y-%m-%dT%H:%M:%SZ").to_string()
}

/// Convenience: schedule using a Clock.
pub fn schedule_with_clock(
    scheduler: &dyn Scheduler,
    previous: Option<&CardState>,
    rating: ReviewRating,
    clock: &dyn Clock,
    desired_retention: f64,
) -> Result<ScheduleOutcome, ScheduleError> {
    scheduler.schedule(previous, rating, clock.now_utc(), desired_retention)
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::Duration;
    use study_core::FakeClock;

    fn base_now() -> DateTime<Utc> {
        DateTime::parse_from_rfc3339("2026-06-01T12:00:00Z")
            .unwrap()
            .with_timezone(&Utc)
    }

    #[test]
    fn known_sequence_increases_interval_on_good() {
        let scheduler = FsrsScheduler;
        let now = base_now();
        let first = scheduler
            .schedule(None, ReviewRating::Good, now, 0.9)
            .unwrap();
        assert!(first.stability > 0.0);
        assert_eq!(first.state, CardLearningState::Learning);

        let card = CardState {
            id: "c1".into(),
            question_id: "q1".into(),
            due: format_due(first.due),
            stability: first.stability,
            difficulty: first.difficulty,
            state: first.state.as_str().into(),
            reps: first.reps,
            lapses: first.lapses,
            last_review: Some(format_due(first.last_review)),
            created_at: format_due(now),
            updated_at: format_due(now),
        };
        let later = now + Duration::days(1);
        let second = scheduler
            .schedule(Some(&card), ReviewRating::Good, later, 0.9)
            .unwrap();
        assert!(second.stability >= first.stability);
    }

    #[test]
    fn higher_retention_shortens_interval() {
        let scheduler = FsrsScheduler;
        let now = base_now();
        let low = scheduler
            .schedule(None, ReviewRating::Good, now, 0.8)
            .unwrap();
        let high = scheduler
            .schedule(None, ReviewRating::Good, now, 0.95)
            .unwrap();
        // After first review both may be in learning; compare after advancing to review.
        let card_low = CardState {
            id: "c".into(),
            question_id: "q".into(),
            due: format_due(low.due),
            stability: low.stability,
            difficulty: low.difficulty,
            state: low.state.as_str().into(),
            reps: low.reps,
            lapses: low.lapses,
            last_review: Some(format_due(low.last_review)),
            created_at: format_due(now),
            updated_at: format_due(now),
        };
        let card_high = CardState {
            stability: high.stability,
            difficulty: high.difficulty,
            due: format_due(high.due),
            state: high.state.as_str().into(),
            reps: high.reps,
            lapses: high.lapses,
            last_review: Some(format_due(high.last_review)),
            ..card_low.clone()
        };
        let later = now + Duration::days(3);
        let out_low = scheduler
            .schedule(Some(&card_low), ReviewRating::Good, later, 0.8)
            .unwrap();
        let out_high = scheduler
            .schedule(Some(&card_high), ReviewRating::Good, later, 0.95)
            .unwrap();
        assert!(
            out_high.scheduled_days <= out_low.scheduled_days
                || out_high.due <= out_low.due
        );
    }

    #[test]
    fn due_ordering_overdue_then_today_then_new() {
        let now = base_now();
        let mk = |id: &str, due_offset_days: i64, state: &str, last: bool| {
            let due = now + Duration::days(due_offset_days);
            DueQueueItem {
                question_id: id.into(),
                overdue_days: overdue_days(&format_due(due), now),
                card_state: CardState {
                    id: id.into(),
                    question_id: id.into(),
                    due: format_due(due),
                    stability: 1.0,
                    difficulty: 5.0,
                    state: state.into(),
                    reps: if last { 1 } else { 0 },
                    lapses: 0,
                    last_review: if last {
                        Some(format_due(now - Duration::days(2)))
                    } else {
                        None
                    },
                    created_at: format_due(now),
                    updated_at: format_due(now),
                },
            }
        };
        let ordered = order_due_queue(
            vec![
                mk("new", 0, "new", false),
                mk("today", 0, "review", true),
                mk("overdue", -2, "review", true),
            ],
            now,
        );
        assert_eq!(ordered[0].question_id, "overdue");
        assert_eq!(ordered[1].question_id, "today");
        assert_eq!(ordered[2].question_id, "new");
    }

    #[test]
    fn clock_drives_schedule_time() {
        let clock = FakeClock::new(base_now());
        let out = schedule_with_clock(
            &FsrsScheduler,
            None,
            ReviewRating::Easy,
            &clock,
            0.9,
        )
        .unwrap();
        assert_eq!(out.last_review, base_now());
    }
}
