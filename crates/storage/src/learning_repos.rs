use async_trait::async_trait;
use sea_orm::{
    ActiveModelTrait, ColumnTrait, EntityTrait, PaginatorTrait, QueryFilter, QueryOrder, Set,
};
use std::collections::HashSet;
use study_core::{
    CardState, DailyActivity, FinalTest, IntegrityEvent, LearningSettings,
    LearningSettingsPatch, LearningSettingsSources, NewIntegrityEvent, PointsLedgerEntry,
    ResolvedLearningSettings, ReviewLog, SettingSource, TestQuestion,
    SETTING_DAILY_GOAL, SETTING_DESIRED_RETENTION, SETTING_NEW_PER_DAY, SETTING_POINTS_CONFIG,
    SETTING_RATING_THRESHOLDS, SETTING_REVIEW_NEW_RATIO, SETTING_TEST_DEFAULTS, SETTING_TIMEZONE,
    subject_setting_key,
};

use crate::entities::{
    attempt, card_state, daily_activity, final_test, integrity_event, points_ledger, review_log,
    test_question,
};
use crate::error::{map_query, StorageError};
use crate::repos::SettingRepository;
use crate::sync_meta::new_row_sync_fields;
use crate::Store;

fn new_id() -> String {
    uuid::Uuid::new_v4().to_string()
}

fn card_state_from(model: card_state::Model) -> CardState {
    CardState {
        id: model.id,
        question_id: model.question_id,
        due: model.due,
        stability: model.stability,
        difficulty: model.difficulty,
        state: model.state,
        reps: model.reps,
        lapses: model.lapses,
        last_review: model.last_review,
        created_at: model.created_at,
        updated_at: model.updated_at,
    }
}

fn review_log_from(model: review_log::Model) -> ReviewLog {
    ReviewLog {
        id: model.id,
        question_id: model.question_id,
        attempt_id: model.attempt_id,
        rating: model.rating,
        state_before: model.state_before,
        state_after: model.state_after,
        scheduled_days: model.scheduled_days,
        elapsed_days: model.elapsed_days,
        created_at: model.created_at,
    }
}

fn points_from(model: points_ledger::Model) -> Result<PointsLedgerEntry, StorageError> {
    let multiplier_breakdown: serde_json::Value = serde_json::from_str(&model.multiplier_breakdown)
        .map_err(|_| StorageError::Invalid("invalid multiplier_breakdown json"))?;
    Ok(PointsLedgerEntry {
        id: model.id,
        amount: model.amount,
        reason: model.reason,
        attempt_id: model.attempt_id,
        test_id: model.test_id,
        multiplier_breakdown,
        created_at: model.created_at,
    })
}

fn daily_from(model: daily_activity::Model) -> DailyActivity {
    DailyActivity {
        id: model.id,
        date: model.date,
        questions_answered: model.questions_answered,
        points_earned: model.points_earned,
        minutes_studied: model.minutes_studied,
        goal_met: model.goal_met,
    }
}

fn final_test_from(model: final_test::Model) -> Result<FinalTest, StorageError> {
    let config: serde_json::Value = serde_json::from_str(&model.config)
        .map_err(|_| StorageError::Invalid("invalid test config json"))?;
    Ok(FinalTest {
        id: model.id,
        subject_id: model.subject_id,
        config,
        status: model.status,
        started_at: model.started_at,
        submitted_at: model.submitted_at,
        time_limit_s: model.time_limit_s,
        score: model.score,
        pass: model.pass,
        integrity_status: model.integrity_status,
        created_at: model.created_at,
        updated_at: model.updated_at,
    })
}

fn test_question_from(model: test_question::Model) -> TestQuestion {
    TestQuestion {
        id: model.id,
        test_id: model.test_id,
        question_id: model.question_id,
        position: model.position,
    }
}

fn integrity_from(model: integrity_event::Model) -> Result<IntegrityEvent, StorageError> {
    let meta: serde_json::Value = serde_json::from_str(&model.meta)
        .map_err(|_| StorageError::Invalid("invalid integrity meta json"))?;
    Ok(IntegrityEvent {
        id: model.id,
        test_id: model.test_id,
        kind: model.kind,
        at: model.at,
        meta,
    })
}

#[derive(Debug, Clone)]
pub struct NewReviewLogRow {
    pub question_id: String,
    pub attempt_id: String,
    pub rating: String,
    pub state_before: String,
    pub state_after: String,
    pub scheduled_days: f64,
    pub elapsed_days: f64,
}

#[derive(Debug, Clone)]
pub struct NewPointsLedgerRow {
    pub amount: i32,
    pub reason: String,
    pub attempt_id: Option<String>,
    pub test_id: Option<String>,
    pub multiplier_breakdown: serde_json::Value,
}

#[derive(Debug, Clone)]
pub struct NewFinalTestRow {
    pub subject_id: String,
    pub config: serde_json::Value,
    pub time_limit_s: Option<i32>,
}

#[derive(Debug, Clone, Default)]
pub struct ActivityIncrement {
    pub questions_answered: i32,
    pub points_earned: i32,
    pub minutes_studied: i32,
    pub goal_met: bool,
}

#[async_trait]
pub trait CardStateRepository: Send + Sync {
    async fn get_by_question(&self, question_id: &str) -> Result<Option<CardState>, StorageError>;
    async fn upsert(&self, state: CardState) -> Result<CardState, StorageError>;
    async fn list_due(&self, as_of: &str) -> Result<Vec<CardState>, StorageError>;
    async fn list_all(&self) -> Result<Vec<CardState>, StorageError>;
    async fn backfill_card_states_from_attempts(&self) -> Result<u32, StorageError>;
}

#[async_trait]
pub trait ReviewLogRepository: Send + Sync {
    async fn create(&self, input: NewReviewLogRow) -> Result<ReviewLog, StorageError>;
    async fn list_for_question(&self, question_id: &str) -> Result<Vec<ReviewLog>, StorageError>;
    async fn exists_for_attempt(&self, attempt_id: &str) -> Result<bool, StorageError>;
    async fn delete_for_attempt(&self, attempt_id: &str) -> Result<bool, StorageError>;
}

#[async_trait]
pub trait PointsLedgerRepository: Send + Sync {
    async fn append(&self, input: NewPointsLedgerRow) -> Result<PointsLedgerEntry, StorageError>;
    async fn sum_total(&self) -> Result<i64, StorageError>;
    async fn list(&self, limit: u32) -> Result<Vec<PointsLedgerEntry>, StorageError>;
}

#[async_trait]
pub trait DailyActivityRepository: Send + Sync {
    async fn get_by_date(&self, date: &str) -> Result<Option<DailyActivity>, StorageError>;
    async fn upsert_increment(
        &self,
        date: &str,
        delta: ActivityIncrement,
    ) -> Result<DailyActivity, StorageError>;
    async fn list_range(&self, from: &str, to: &str) -> Result<Vec<DailyActivity>, StorageError>;
    async fn list_all(&self) -> Result<Vec<DailyActivity>, StorageError>;
}

#[async_trait]
pub trait FinalTestRepository: Send + Sync {
    async fn create(&self, input: NewFinalTestRow) -> Result<FinalTest, StorageError>;
    async fn get(&self, id: &str) -> Result<Option<FinalTest>, StorageError>;
    async fn list(&self, subject_id: Option<&str>) -> Result<Vec<FinalTest>, StorageError>;
    async fn start_test(&self, id: &str) -> Result<Option<FinalTest>, StorageError>;
    async fn submit_test(
        &self,
        id: &str,
        score: f64,
        pass: bool,
    ) -> Result<Option<FinalTest>, StorageError>;
    async fn expire_test(&self, id: &str) -> Result<Option<FinalTest>, StorageError>;
    async fn update_integrity_status(
        &self,
        id: &str,
        integrity_status: &str,
    ) -> Result<Option<FinalTest>, StorageError>;
}

#[async_trait]
pub trait TestQuestionRepository: Send + Sync {
    async fn add_many(
        &self,
        test_id: &str,
        question_ids: &[String],
    ) -> Result<Vec<TestQuestion>, StorageError>;
    async fn list_for_test(&self, test_id: &str) -> Result<Vec<TestQuestion>, StorageError>;
}

#[async_trait]
pub trait IntegrityEventRepository: Send + Sync {
    async fn create(
        &self,
        test_id: &str,
        input: NewIntegrityEvent,
    ) -> Result<IntegrityEvent, StorageError>;
    async fn list_for_test(&self, test_id: &str) -> Result<Vec<IntegrityEvent>, StorageError>;
}

#[async_trait]
pub trait LearningSettingsRepository: Send + Sync {
    async fn get_user_patch(&self) -> Result<LearningSettingsPatch, StorageError>;
    async fn update_user_patch(
        &self,
        patch: LearningSettingsPatch,
    ) -> Result<LearningSettingsPatch, StorageError>;
    async fn get_subject_patch(
        &self,
        subject_id: &str,
    ) -> Result<LearningSettingsPatch, StorageError>;
    async fn update_subject_patch(
        &self,
        subject_id: &str,
        patch: LearningSettingsPatch,
    ) -> Result<LearningSettingsPatch, StorageError>;
    async fn get_resolved(
        &self,
        subject_id: Option<&str>,
    ) -> Result<ResolvedLearningSettings, StorageError>;
}

#[async_trait]
impl CardStateRepository for Store {
    async fn get_by_question(&self, question_id: &str) -> Result<Option<CardState>, StorageError> {
        let row = card_state::Entity::find()
            .filter(card_state::Column::QuestionId.eq(question_id))
            .one(&self.db)
            .await
            .map_err(map_query)?;
        Ok(row.map(card_state_from))
    }

    async fn upsert(&self, state: CardState) -> Result<CardState, StorageError> {
        let stamp = self.now();
        match card_state::Entity::find()
            .filter(card_state::Column::QuestionId.eq(state.question_id.clone()))
            .one(&self.db)
            .await
            .map_err(map_query)?
        {
            Some(existing) => {
                let mut active: card_state::ActiveModel = existing.into();
                active.due = Set(state.due);
                active.stability = Set(state.stability);
                active.difficulty = Set(state.difficulty);
                active.state = Set(state.state);
                active.reps = Set(state.reps);
                active.lapses = Set(state.lapses);
                active.last_review = Set(state.last_review);
                active.updated_at = Set(stamp);
                let updated = active.update(&self.db).await.map_err(map_query)?;
                Ok(card_state_from(updated))
            }
            None => {
                let id = if state.id.trim().is_empty() {
                    new_id()
                } else {
                    state.id
                };
                let created_at = if state.created_at.trim().is_empty() {
                    stamp.clone()
                } else {
                    state.created_at
                };
                let model = card_state::ActiveModel {
                    id: Set(id),
                    question_id: Set(state.question_id),
                    due: Set(state.due),
                    stability: Set(state.stability),
                    difficulty: Set(state.difficulty),
                    state: Set(state.state),
                    reps: Set(state.reps),
                    lapses: Set(state.lapses),
                    last_review: Set(state.last_review),
                    created_at: Set(created_at),
                    updated_at: Set(stamp),
                };
                let inserted = model.insert(&self.db).await.map_err(map_query)?;
                Ok(card_state_from(inserted))
            }
        }
    }

    async fn list_due(&self, as_of: &str) -> Result<Vec<CardState>, StorageError> {
        let rows = card_state::Entity::find()
            .filter(card_state::Column::Due.lte(as_of))
            .order_by_asc(card_state::Column::Due)
            .all(&self.db)
            .await
            .map_err(map_query)?;
        Ok(rows.into_iter().map(card_state_from).collect())
    }

    async fn list_all(&self) -> Result<Vec<CardState>, StorageError> {
        let rows = card_state::Entity::find()
            .order_by_asc(card_state::Column::Due)
            .all(&self.db)
            .await
            .map_err(map_query)?;
        Ok(rows.into_iter().map(card_state_from).collect())
    }

    async fn backfill_card_states_from_attempts(&self) -> Result<u32, StorageError> {
        let attempts = attempt::Entity::find().all(&self.db).await.map_err(map_query)?;
        let question_ids: HashSet<String> = attempts.into_iter().map(|a| a.question_id).collect();
        let stamp = self.now();
        let mut created = 0u32;
        for question_id in question_ids {
            let exists = card_state::Entity::find()
                .filter(card_state::Column::QuestionId.eq(&question_id))
                .one(&self.db)
                .await
                .map_err(map_query)?
                .is_some();
            if exists {
                continue;
            }
            let model = card_state::ActiveModel {
                id: Set(new_id()),
                question_id: Set(question_id),
                due: Set(stamp.clone()),
                stability: Set(0.0),
                difficulty: Set(0.0),
                state: Set("new".to_owned()),
                reps: Set(0),
                lapses: Set(0),
                last_review: Set(None),
                created_at: Set(stamp.clone()),
                updated_at: Set(stamp.clone()),
            };
            model.insert(&self.db).await.map_err(map_query)?;
            created += 1;
        }
        Ok(created)
    }
}

#[async_trait]
impl ReviewLogRepository for Store {
    async fn create(&self, input: NewReviewLogRow) -> Result<ReviewLog, StorageError> {
        let (user_id, version, deleted_at) = new_row_sync_fields();
        let model = review_log::ActiveModel {
            id: Set(new_id()),
            question_id: Set(input.question_id),
            attempt_id: Set(input.attempt_id),
            rating: Set(input.rating),
            state_before: Set(input.state_before),
            state_after: Set(input.state_after),
            scheduled_days: Set(input.scheduled_days),
            elapsed_days: Set(input.elapsed_days),
            user_id,
            version,
            deleted_at,
            created_at: Set(self.now()),
            ..Default::default()
        };
        let inserted = model.insert(&self.db).await.map_err(map_query)?;
        Ok(review_log_from(inserted))
    }

    async fn list_for_question(&self, question_id: &str) -> Result<Vec<ReviewLog>, StorageError> {
        let rows = review_log::Entity::find()
            .filter(review_log::Column::QuestionId.eq(question_id))
            .order_by_asc(review_log::Column::CreatedAt)
            .all(&self.db)
            .await
            .map_err(map_query)?;
        Ok(rows.into_iter().map(review_log_from).collect())
    }

    async fn exists_for_attempt(&self, attempt_id: &str) -> Result<bool, StorageError> {
        let count = review_log::Entity::find()
            .filter(review_log::Column::AttemptId.eq(attempt_id))
            .count(&self.db)
            .await
            .map_err(map_query)?;
        Ok(count > 0)
    }

    async fn delete_for_attempt(&self, attempt_id: &str) -> Result<bool, StorageError> {
        let result = review_log::Entity::delete_many()
            .filter(review_log::Column::AttemptId.eq(attempt_id))
            .exec(&self.db)
            .await
            .map_err(map_query)?;
        Ok(result.rows_affected > 0)
    }
}

#[async_trait]
impl PointsLedgerRepository for Store {
    async fn append(&self, input: NewPointsLedgerRow) -> Result<PointsLedgerEntry, StorageError> {
        let breakdown = serde_json::to_string(&input.multiplier_breakdown)
            .map_err(|_| StorageError::Invalid("multiplier_breakdown serialize failed"))?;
        let (user_id, version, deleted_at) = new_row_sync_fields();
        let model = points_ledger::ActiveModel {
            id: Set(new_id()),
            amount: Set(input.amount),
            reason: Set(input.reason.clone()),
            attempt_id: Set(input.attempt_id.clone()),
            test_id: Set(input.test_id),
            multiplier_breakdown: Set(breakdown),
            user_id,
            version,
            deleted_at,
            created_at: Set(self.now()),
            ..Default::default()
        };
        match model.insert(&self.db).await {
            Ok(inserted) => points_from(inserted),
            Err(err) => {
                let mapped = map_query(err);
                if !matches!(mapped, StorageError::Conflict) {
                    return Err(mapped);
                }
                let Some(attempt_id) = input.attempt_id.as_deref() else {
                    return Err(StorageError::Conflict);
                };
                let row = points_ledger::Entity::find()
                    .filter(points_ledger::Column::AttemptId.eq(attempt_id))
                    .filter(points_ledger::Column::Reason.eq(&input.reason))
                    .one(&self.db)
                    .await
                    .map_err(map_query)?;
                match row {
                    Some(existing) => points_from(existing),
                    None => Err(StorageError::Conflict),
                }
            }
        }
    }

    async fn sum_total(&self) -> Result<i64, StorageError> {
        let rows = points_ledger::Entity::find()
            .all(&self.db)
            .await
            .map_err(map_query)?;
        Ok(rows.into_iter().map(|r| r.amount as i64).sum())
    }

    async fn list(&self, limit: u32) -> Result<Vec<PointsLedgerEntry>, StorageError> {
        let rows = points_ledger::Entity::find()
            .order_by_desc(points_ledger::Column::CreatedAt)
            .all(&self.db)
            .await
            .map_err(map_query)?;
        rows.into_iter()
            .take(limit as usize)
            .map(points_from)
            .collect()
    }
}

#[async_trait]
impl DailyActivityRepository for Store {
    async fn get_by_date(&self, date: &str) -> Result<Option<DailyActivity>, StorageError> {
        let row = daily_activity::Entity::find()
            .filter(daily_activity::Column::Date.eq(date))
            .one(&self.db)
            .await
            .map_err(map_query)?;
        Ok(row.map(daily_from))
    }

    async fn upsert_increment(
        &self,
        date: &str,
        delta: ActivityIncrement,
    ) -> Result<DailyActivity, StorageError> {
        match daily_activity::Entity::find()
            .filter(daily_activity::Column::Date.eq(date))
            .one(&self.db)
            .await
            .map_err(map_query)?
        {
            Some(existing) => {
                let questions = existing.questions_answered + delta.questions_answered;
                let points = existing.points_earned + delta.points_earned;
                let minutes = existing.minutes_studied + delta.minutes_studied;
                let goal_met = existing.goal_met || delta.goal_met;
                let mut active: daily_activity::ActiveModel = existing.into();
                active.questions_answered = Set(questions);
                active.points_earned = Set(points);
                active.minutes_studied = Set(minutes);
                active.goal_met = Set(goal_met);
                let updated = active.update(&self.db).await.map_err(map_query)?;
                Ok(daily_from(updated))
            }
            None => {
                let model = daily_activity::ActiveModel {
                    id: Set(new_id()),
                    date: Set(date.to_owned()),
                    questions_answered: Set(delta.questions_answered),
                    points_earned: Set(delta.points_earned),
                    minutes_studied: Set(delta.minutes_studied),
                    goal_met: Set(delta.goal_met),
                    ..Default::default()
                };
                let inserted = model.insert(&self.db).await.map_err(map_query)?;
                Ok(daily_from(inserted))
            }
        }
    }

    async fn list_range(&self, from: &str, to: &str) -> Result<Vec<DailyActivity>, StorageError> {
        let rows = daily_activity::Entity::find()
            .filter(daily_activity::Column::Date.gte(from))
            .filter(daily_activity::Column::Date.lte(to))
            .order_by_asc(daily_activity::Column::Date)
            .all(&self.db)
            .await
            .map_err(map_query)?;
        Ok(rows.into_iter().map(daily_from).collect())
    }

    async fn list_all(&self) -> Result<Vec<DailyActivity>, StorageError> {
        let rows = daily_activity::Entity::find()
            .order_by_asc(daily_activity::Column::Date)
            .all(&self.db)
            .await
            .map_err(map_query)?;
        Ok(rows.into_iter().map(daily_from).collect())
    }
}

#[async_trait]
impl FinalTestRepository for Store {
    async fn create(&self, input: NewFinalTestRow) -> Result<FinalTest, StorageError> {
        let subject_id = input.subject_id.trim().to_owned();
        if subject_id.is_empty() {
            return Err(StorageError::Invalid("subject_id required"));
        }
        let config = serde_json::to_string(&input.config)
            .map_err(|_| StorageError::Invalid("config serialize failed"))?;
        let stamp = self.now();
        let model = final_test::ActiveModel {
            id: Set(new_id()),
            subject_id: Set(subject_id),
            config: Set(config),
            status: Set("draft".to_owned()),
            started_at: Set(None),
            submitted_at: Set(None),
            time_limit_s: Set(input.time_limit_s),
            score: Set(None),
            pass: Set(None),
            integrity_status: Set("unverified".to_owned()),
            created_at: Set(stamp.clone()),
            updated_at: Set(stamp),
            ..Default::default()
        };
        let inserted = model.insert(&self.db).await.map_err(map_query)?;
        final_test_from(inserted)
    }

    async fn get(&self, id: &str) -> Result<Option<FinalTest>, StorageError> {
        match final_test::Entity::find_by_id(id)
            .one(&self.db)
            .await
            .map_err(map_query)?
        {
            Some(model) => Ok(Some(final_test_from(model)?)),
            None => Ok(None),
        }
    }

    async fn list(&self, subject_id: Option<&str>) -> Result<Vec<FinalTest>, StorageError> {
        let mut query = final_test::Entity::find();
        if let Some(subject_id) = subject_id {
            query = query.filter(final_test::Column::SubjectId.eq(subject_id));
        }
        let rows = query
            .order_by_desc(final_test::Column::CreatedAt)
            .all(&self.db)
            .await
            .map_err(map_query)?;
        rows.into_iter().map(final_test_from).collect()
    }

    async fn start_test(&self, id: &str) -> Result<Option<FinalTest>, StorageError> {
        let Some(existing) = final_test::Entity::find_by_id(id)
            .one(&self.db)
            .await
            .map_err(map_query)?
        else {
            return Ok(None);
        };
        let mut active: final_test::ActiveModel = existing.into();
        let stamp = self.now();
        active.status = Set("in_progress".to_owned());
        active.started_at = Set(Some(stamp.clone()));
        active.updated_at = Set(stamp);
        let updated = active.update(&self.db).await.map_err(map_query)?;
        Ok(Some(final_test_from(updated)?))
    }

    async fn submit_test(
        &self,
        id: &str,
        score: f64,
        pass: bool,
    ) -> Result<Option<FinalTest>, StorageError> {
        let Some(existing) = final_test::Entity::find_by_id(id)
            .one(&self.db)
            .await
            .map_err(map_query)?
        else {
            return Ok(None);
        };
        let mut active: final_test::ActiveModel = existing.into();
        let stamp = self.now();
        active.status = Set("submitted".to_owned());
        active.submitted_at = Set(Some(stamp.clone()));
        active.score = Set(Some(score));
        active.pass = Set(Some(pass));
        active.updated_at = Set(stamp);
        let updated = active.update(&self.db).await.map_err(map_query)?;
        Ok(Some(final_test_from(updated)?))
    }

    async fn expire_test(&self, id: &str) -> Result<Option<FinalTest>, StorageError> {
        let Some(existing) = final_test::Entity::find_by_id(id)
            .one(&self.db)
            .await
            .map_err(map_query)?
        else {
            return Ok(None);
        };
        let mut active: final_test::ActiveModel = existing.into();
        active.status = Set("expired".to_owned());
        active.updated_at = Set(self.now());
        let updated = active.update(&self.db).await.map_err(map_query)?;
        Ok(Some(final_test_from(updated)?))
    }

    async fn update_integrity_status(
        &self,
        id: &str,
        integrity_status: &str,
    ) -> Result<Option<FinalTest>, StorageError> {
        let Some(existing) = final_test::Entity::find_by_id(id)
            .one(&self.db)
            .await
            .map_err(map_query)?
        else {
            return Ok(None);
        };
        let mut active: final_test::ActiveModel = existing.into();
        active.integrity_status = Set(integrity_status.trim().to_owned());
        active.updated_at = Set(self.now());
        let updated = active.update(&self.db).await.map_err(map_query)?;
        Ok(Some(final_test_from(updated)?))
    }
}

#[async_trait]
impl TestQuestionRepository for Store {
    async fn add_many(
        &self,
        test_id: &str,
        question_ids: &[String],
    ) -> Result<Vec<TestQuestion>, StorageError> {
        let mut out = Vec::with_capacity(question_ids.len());
        for (position, question_id) in question_ids.iter().enumerate() {
            let model = test_question::ActiveModel {
                id: Set(new_id()),
                test_id: Set(test_id.to_owned()),
                question_id: Set(question_id.clone()),
                position: Set(position as i32),
                ..Default::default()
            };
            let inserted = model.insert(&self.db).await.map_err(map_query)?;
            out.push(test_question_from(inserted));
        }
        Ok(out)
    }

    async fn list_for_test(&self, test_id: &str) -> Result<Vec<TestQuestion>, StorageError> {
        let rows = test_question::Entity::find()
            .filter(test_question::Column::TestId.eq(test_id))
            .order_by_asc(test_question::Column::Position)
            .all(&self.db)
            .await
            .map_err(map_query)?;
        Ok(rows.into_iter().map(test_question_from).collect())
    }
}

#[async_trait]
impl IntegrityEventRepository for Store {
    async fn create(
        &self,
        test_id: &str,
        input: NewIntegrityEvent,
    ) -> Result<IntegrityEvent, StorageError> {
        let input = input.normalized().map_err(StorageError::Invalid)?;
        let at = input
            .at
            .unwrap_or_else(|| self.now());
        let meta = serde_json::to_string(&input.meta.unwrap_or(serde_json::json!({})))
            .map_err(|_| StorageError::Invalid("meta serialize failed"))?;
        let model = integrity_event::ActiveModel {
            id: Set(new_id()),
            test_id: Set(test_id.to_owned()),
            kind: Set(input.kind),
            at: Set(at),
            meta: Set(meta),
            ..Default::default()
        };
        let inserted = model.insert(&self.db).await.map_err(map_query)?;
        integrity_from(inserted)
    }

    async fn list_for_test(&self, test_id: &str) -> Result<Vec<IntegrityEvent>, StorageError> {
        let rows = integrity_event::Entity::find()
            .filter(integrity_event::Column::TestId.eq(test_id))
            .order_by_asc(integrity_event::Column::At)
            .all(&self.db)
            .await
            .map_err(map_query)?;
        rows.into_iter().map(integrity_from).collect()
    }
}

async fn read_patch(
    store: &Store,
    key_for: impl Fn(&str) -> String,
) -> Result<LearningSettingsPatch, StorageError> {
    let mut patch = LearningSettingsPatch::default();
    if let Some(s) = store.find_setting_by_key(&key_for(SETTING_DESIRED_RETENTION)).await? {
        if let Ok(v) = s.value.parse::<f64>() {
            patch.desired_retention = Some(v);
        }
    }
    if let Some(s) = store.find_setting_by_key(&key_for(SETTING_DAILY_GOAL)).await? {
        if let Ok(v) = s.value.parse::<u32>() {
            patch.daily_goal = Some(v);
        }
    }
    if let Some(s) = store.find_setting_by_key(&key_for(SETTING_NEW_PER_DAY)).await? {
        if let Ok(v) = s.value.parse::<u32>() {
            patch.new_questions_per_day = Some(v);
        }
    }
    if let Some(s) = store.find_setting_by_key(&key_for(SETTING_REVIEW_NEW_RATIO)).await? {
        if let Ok(v) = s.value.parse::<f64>() {
            patch.review_new_ratio = Some(v);
        }
    }
    if let Some(s) = store.find_setting_by_key(&key_for(SETTING_TIMEZONE)).await? {
        if !s.value.trim().is_empty() {
            patch.timezone = Some(s.value);
        }
    }
    if let Some(s) = store.find_setting_by_key(&key_for(SETTING_RATING_THRESHOLDS)).await? {
        patch.rating_thresholds =
            serde_json::from_str(&s.value).ok();
    }
    if let Some(s) = store.find_setting_by_key(&key_for(SETTING_POINTS_CONFIG)).await? {
        patch.points = serde_json::from_str(&s.value).ok();
    }
    if let Some(s) = store.find_setting_by_key(&key_for(SETTING_TEST_DEFAULTS)).await? {
        patch.test_defaults = serde_json::from_str(&s.value).ok();
    }
    Ok(patch)
}

async fn merge_and_persist_patch(
    store: &Store,
    key_for: impl Fn(&str) -> String,
    patch: LearningSettingsPatch,
) -> Result<LearningSettingsPatch, StorageError> {
    let mut merged = read_patch(store, &key_for).await?;
    if let Some(v) = patch.desired_retention {
        merged.desired_retention = Some(v);
        upsert_value(store, &key_for(SETTING_DESIRED_RETENTION), &v.to_string()).await?;
    }
    if let Some(v) = patch.daily_goal {
        merged.daily_goal = Some(v);
        upsert_value(store, &key_for(SETTING_DAILY_GOAL), &v.to_string()).await?;
    }
    if let Some(v) = patch.new_questions_per_day {
        merged.new_questions_per_day = Some(v);
        upsert_value(store, &key_for(SETTING_NEW_PER_DAY), &v.to_string()).await?;
    }
    if let Some(v) = patch.review_new_ratio {
        merged.review_new_ratio = Some(v);
        upsert_value(store, &key_for(SETTING_REVIEW_NEW_RATIO), &v.to_string()).await?;
    }
    if let Some(v) = patch.timezone {
        upsert_value(store, &key_for(SETTING_TIMEZONE), &v).await?;
        merged.timezone = Some(v);
    }
    if let Some(v) = patch.rating_thresholds {
        let raw = serde_json::to_string(&v)
            .map_err(|_| StorageError::Invalid("rating_thresholds serialize failed"))?;
        upsert_value(store, &key_for(SETTING_RATING_THRESHOLDS), &raw).await?;
        merged.rating_thresholds = Some(v);
    }
    if let Some(v) = patch.points {
        let raw = serde_json::to_string(&v)
            .map_err(|_| StorageError::Invalid("points serialize failed"))?;
        upsert_value(store, &key_for(SETTING_POINTS_CONFIG), &raw).await?;
        merged.points = Some(v);
    }
    if let Some(v) = patch.test_defaults {
        let normalized = v.normalized().map_err(StorageError::Invalid)?;
        let raw = serde_json::to_string(&normalized)
            .map_err(|_| StorageError::Invalid("test_defaults serialize failed"))?;
        upsert_value(store, &key_for(SETTING_TEST_DEFAULTS), &raw).await?;
        merged.test_defaults = Some(normalized);
    }
    Ok(merged)
}

async fn upsert_value(store: &Store, key: &str, value: &str) -> Result<(), StorageError> {
    use study_core::NewSetting;
    if let Some(existing) = store.find_setting_by_key(key).await? {
        let _ = store
            .update_setting(
                &existing.id,
                NewSetting {
                    key: key.to_owned(),
                    value: value.to_owned(),
                },
            )
            .await?;
    } else {
        let _ = store
            .create_setting(NewSetting {
                key: key.to_owned(),
                value: value.to_owned(),
            })
            .await?;
    }
    Ok(())
}

fn resolve_settings(
    user: &LearningSettingsPatch,
    subject: &LearningSettingsPatch,
) -> ResolvedLearningSettings {
    let system = LearningSettings::default();
    let mut settings = system.clone();
    let mut sources = LearningSettingsSources {
        desired_retention: SettingSource::System,
        daily_goal: SettingSource::System,
        new_questions_per_day: SettingSource::System,
        review_new_ratio: SettingSource::System,
        timezone: SettingSource::System,
        points: SettingSource::System,
        test_defaults: SettingSource::System,
    };

    apply_layer(&mut settings, &mut sources, user, SettingSource::User);
    apply_layer(&mut settings, &mut sources, subject, SettingSource::Subject);
    settings.streak.daily_goal_questions = settings.daily_goal;

    ResolvedLearningSettings { settings, sources }
}

fn apply_layer(
    settings: &mut LearningSettings,
    sources: &mut LearningSettingsSources,
    patch: &LearningSettingsPatch,
    source: SettingSource,
) {
    if let Some(v) = patch.desired_retention {
        settings.desired_retention = v;
        sources.desired_retention = source;
    }
    if let Some(v) = patch.daily_goal {
        settings.daily_goal = v;
        sources.daily_goal = source;
    }
    if let Some(v) = patch.new_questions_per_day {
        settings.new_questions_per_day = v;
        sources.new_questions_per_day = source;
    }
    if let Some(v) = patch.review_new_ratio {
        settings.review_new_ratio = v;
        sources.review_new_ratio = source;
    }
    if let Some(ref v) = patch.timezone {
        settings.timezone = v.clone();
        sources.timezone = source;
    }
    if let Some(ref v) = patch.rating_thresholds {
        settings.rating_thresholds = v.clone();
    }
    if let Some(ref v) = patch.points {
        settings.points = v.clone();
        sources.points = source;
    }
    if let Some(ref v) = patch.test_defaults {
        settings.test_defaults = v.clone();
        sources.test_defaults = source;
    }
}

#[async_trait]
impl LearningSettingsRepository for Store {
    async fn get_user_patch(&self) -> Result<LearningSettingsPatch, StorageError> {
        read_patch(self, |key| key.to_owned()).await
    }

    async fn update_user_patch(
        &self,
        patch: LearningSettingsPatch,
    ) -> Result<LearningSettingsPatch, StorageError> {
        merge_and_persist_patch(self, |key| key.to_owned(), patch).await
    }

    async fn get_subject_patch(
        &self,
        subject_id: &str,
    ) -> Result<LearningSettingsPatch, StorageError> {
        let key_for = |key: &str| subject_setting_key(subject_id, key);
        read_patch(self, key_for).await
    }

    async fn update_subject_patch(
        &self,
        subject_id: &str,
        patch: LearningSettingsPatch,
    ) -> Result<LearningSettingsPatch, StorageError> {
        let subject_id = subject_id.to_owned();
        merge_and_persist_patch(self, move |key| subject_setting_key(&subject_id, key), patch).await
    }

    async fn get_resolved(
        &self,
        subject_id: Option<&str>,
    ) -> Result<ResolvedLearningSettings, StorageError> {
        let user = self.get_user_patch().await?;
        let subject = match subject_id {
            Some(id) => self.get_subject_patch(id).await?,
            None => LearningSettingsPatch::default(),
        };
        Ok(resolve_settings(&user, &subject))
    }
}