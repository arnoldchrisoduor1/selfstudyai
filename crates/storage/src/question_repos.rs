use async_trait::async_trait;
use sea_orm::{
    ActiveModelTrait, ColumnTrait, EntityTrait, PaginatorTrait, QueryFilter, QueryOrder, Set,
};
use study_core::{
    Attempt, NewQuestion, NewStudySession, NewUsageEvent, NewWebSearchProvider, Question,
    QuestionFilter, QuestionSettings, SessionQuestion, StudySession, UpdateQuestion,
    UpdateWebSearchProvider, WebSearchProvider, SETTING_BURST_SIZE, SETTING_COGNITIVE_MIX,
    SETTING_GROUNDING_MODE, CognitiveMix,
};

use crate::entities::{
    attempt, question, session_question, study_session, usage_event, web_search_provider,
};
use crate::error::{map_query, StorageError};
use crate::repos::SettingRepository;
use crate::sync_meta::{bump_version, new_row_sync_fields};
use crate::tenant::{not_deleted, user_id_condition};
use crate::Store;

fn new_id() -> String {
    uuid::Uuid::new_v4().to_string()
}

fn mask_key(key: &str) -> String {
    let trimmed = key.trim();
    if trimmed.is_empty() {
        return String::new();
    }
    let suffix: String = trimmed
        .chars()
        .rev()
        .take(4)
        .collect::<String>()
        .chars()
        .rev()
        .collect();
    format!("****{suffix}")
}

fn parse_json_opt(raw: &Option<String>) -> Option<serde_json::Value> {
    raw.as_ref()
        .and_then(|s| serde_json::from_str(s).ok())
}

fn question_from(model: question::Model) -> Result<Question, StorageError> {
    let options = parse_json_opt(&model.options);
    let citations: serde_json::Value = serde_json::from_str(&model.citations)
        .map_err(|_| StorageError::Invalid("invalid citations json"))?;
    Ok(Question {
        id: model.id,
        subject_id: model.subject_id,
        source_id: model.source_id,
        topic_id: model.topic_id,
        kind: model.kind,
        cognitive_level: model.cognitive_level,
        stem: model.stem,
        options,
        correct_option: model.correct_option,
        model_answer: model.model_answer,
        explanation: model.explanation,
        grounding: model.grounding,
        citations,
        is_gold: model.is_gold,
        gold_status: model.gold_status,
        status: model.status,
        generated_by: model.generated_by,
        prompt_version: model.prompt_version,
        created_at: model.created_at,
    })
}

fn session_from(model: study_session::Model) -> Result<StudySession, StorageError> {
    let scope: serde_json::Value = serde_json::from_str(&model.scope)
        .map_err(|_| StorageError::Invalid("invalid session scope json"))?;
    Ok(StudySession {
        id: model.id,
        subject_id: model.subject_id,
        scope,
        grounding_mode: model.grounding_mode,
        burst_size: model.burst_size,
        mode: model.mode,
        started_at: model.started_at,
        ended_at: model.ended_at,
    })
}

fn session_question_from(model: session_question::Model) -> SessionQuestion {
    SessionQuestion {
        id: model.id,
        session_id: model.session_id,
        question_id: model.question_id,
        burst_index: model.burst_index,
        position: model.position,
        item_kind: model.item_kind,
    }
}

fn attempt_from(model: attempt::Model) -> Result<Attempt, StorageError> {
    let feedback: serde_json::Value = serde_json::from_str(&model.feedback)
        .map_err(|_| StorageError::Invalid("invalid feedback json"))?;
    Ok(Attempt {
        id: model.id,
        question_id: model.question_id,
        session_id: model.session_id,
        test_id: model.test_id,
        answer_text: model.answer_text,
        selected_option: model.selected_option,
        score: model.score,
        verdict: model.verdict,
        feedback,
        graded_by: model.graded_by,
        confidence: model.confidence,
        original_score: model.original_score,
        original_verdict: model.original_verdict,
        time_taken_ms: model.time_taken_ms,
        created_at: model.created_at,
    })
}

fn web_search_from(model: web_search_provider::Model) -> WebSearchProvider {
    let has_api_key = model
        .api_key
        .as_ref()
        .map(|k| !k.trim().is_empty())
        .unwrap_or(false);
    let api_key_hint = model
        .api_key
        .as_ref()
        .filter(|k| !k.trim().is_empty())
        .map(|k| mask_key(k));
    WebSearchProvider {
        id: model.id,
        name: model.name,
        endpoint: model.endpoint,
        has_api_key,
        api_key_hint,
        created_at: model.created_at,
        updated_at: model.updated_at,
    }
}

#[derive(Debug, Clone)]
pub struct WebSearchSecret {
    pub id: String,
    pub name: String,
    pub endpoint: String,
    pub api_key: Option<String>,
}

#[derive(Debug, Clone)]
pub struct NewAttemptRow {
    pub question_id: String,
    pub session_id: Option<String>,
    pub test_id: Option<String>,
    pub answer_text: Option<String>,
    pub selected_option: Option<String>,
    pub score: f32,
    pub verdict: String,
    pub feedback: serde_json::Value,
    pub graded_by: String,
    pub confidence: Option<f32>,
    pub time_taken_ms: Option<i64>,
}

#[async_trait]
pub trait QuestionRepository: Send + Sync {
    async fn list_questions(&self, filter: QuestionFilter) -> Result<Vec<Question>, StorageError>;
    async fn get_question(&self, id: &str) -> Result<Option<Question>, StorageError>;
    async fn create_question(&self, input: NewQuestion) -> Result<Question, StorageError>;
    async fn create_questions(&self, inputs: Vec<NewQuestion>) -> Result<Vec<Question>, StorageError>;
    async fn update_question(
        &self,
        id: &str,
        input: UpdateQuestion,
    ) -> Result<Option<Question>, StorageError>;
    async fn delete_question(&self, id: &str) -> Result<bool, StorageError>;
    async fn list_stems_for_topic(&self, topic_id: &str) -> Result<Vec<(String, String)>, StorageError>;
}

#[async_trait]
pub trait StudySessionRepository: Send + Sync {
    async fn create_session(&self, input: NewStudySession, burst_size: u32) -> Result<StudySession, StorageError>;
    async fn get_session(&self, id: &str) -> Result<Option<StudySession>, StorageError>;
    async fn list_open_sessions(&self, subject_id: &str) -> Result<Vec<StudySession>, StorageError>;
    async fn end_session(&self, id: &str) -> Result<Option<StudySession>, StorageError>;
    async fn add_session_questions(
        &self,
        session_id: &str,
        question_ids: &[String],
        burst_index: i32,
        item_kind: Option<&str>,
    ) -> Result<Vec<SessionQuestion>, StorageError>;
    async fn list_session_questions(
        &self,
        session_id: &str,
    ) -> Result<Vec<SessionQuestion>, StorageError>;
    async fn max_burst_index(&self, session_id: &str) -> Result<i32, StorageError>;
}

#[async_trait]
pub trait AttemptRepository: Send + Sync {
    async fn create_attempt(&self, input: NewAttemptRow) -> Result<Attempt, StorageError>;
    async fn get_attempt(&self, id: &str) -> Result<Option<Attempt>, StorageError>;
    async fn list_attempts_for_session(
        &self,
        session_id: &str,
    ) -> Result<Vec<Attempt>, StorageError>;
    async fn latest_attempt_for_question(
        &self,
        session_id: &str,
        question_id: &str,
    ) -> Result<Option<Attempt>, StorageError>;
    async fn list_attempts_for_test(&self, test_id: &str) -> Result<Vec<Attempt>, StorageError>;
    async fn prior_attempts_same_day(
        &self,
        question_id: &str,
        since_iso: &str,
        exclude_attempt_id: &str,
    ) -> Result<u32, StorageError>;
    async fn override_attempt(
        &self,
        id: &str,
        verdict: &str,
        score: f32,
    ) -> Result<Option<Attempt>, StorageError>;
}

#[async_trait]
pub trait UsageEventRepository: Send + Sync {
    async fn create_usage_event(&self, input: NewUsageEvent) -> Result<study_core::UsageEvent, StorageError>;
    async fn list_usage_events(&self, limit: u32) -> Result<Vec<study_core::UsageEvent>, StorageError>;
}

#[async_trait]
pub trait WebSearchProviderRepository: Send + Sync {
    async fn list_web_search_providers(&self) -> Result<Vec<WebSearchProvider>, StorageError>;
    async fn get_web_search_provider(&self, id: &str) -> Result<Option<WebSearchProvider>, StorageError>;
    async fn get_web_search_secret(&self, id: &str) -> Result<Option<WebSearchSecret>, StorageError>;
    async fn create_web_search_provider(
        &self,
        input: NewWebSearchProvider,
    ) -> Result<WebSearchProvider, StorageError>;
    async fn update_web_search_provider(
        &self,
        id: &str,
        input: UpdateWebSearchProvider,
    ) -> Result<Option<WebSearchProvider>, StorageError>;
    async fn delete_web_search_provider(&self, id: &str) -> Result<bool, StorageError>;
}

#[async_trait]
pub trait QuestionSettingsRepository: Send + Sync {
    async fn get_question_settings(&self) -> Result<QuestionSettings, StorageError>;
    async fn update_question_settings(
        &self,
        settings: QuestionSettings,
    ) -> Result<QuestionSettings, StorageError>;
}

#[async_trait]
impl QuestionRepository for Store {
    async fn list_questions(&self, filter: QuestionFilter) -> Result<Vec<Question>, StorageError> {
        let mut query = question::Entity::find()
            .filter(user_id_condition(question::Column::UserId))
            .filter(not_deleted(question::Column::DeletedAt));
        if let Some(subject_id) = filter.subject_id.as_deref() {
            query = query.filter(question::Column::SubjectId.eq(subject_id));
        }
        if let Some(source_id) = filter.source_id.as_deref() {
            query = query.filter(question::Column::SourceId.eq(source_id));
        }
        if let Some(topic_id) = filter.topic_id.as_deref() {
            query = query.filter(question::Column::TopicId.eq(topic_id));
        }
        if let Some(kind) = filter.kind.as_deref() {
            query = query.filter(question::Column::Kind.eq(kind));
        }
        if let Some(level) = filter.cognitive_level.as_deref() {
            query = query.filter(question::Column::CognitiveLevel.eq(level));
        }
        if let Some(gold) = filter.gold {
            query = query.filter(question::Column::IsGold.eq(gold));
        }
        if let Some(gold_status) = filter.gold_status.as_deref() {
            query = query.filter(question::Column::GoldStatus.eq(gold_status));
        }
        if let Some(grounding) = filter.grounding.as_deref() {
            query = query.filter(question::Column::Grounding.eq(grounding));
        }
        if let Some(status) = filter.status.as_deref() {
            query = query.filter(question::Column::Status.eq(status));
        }
        let rows = query
            .order_by_desc(question::Column::CreatedAt)
            .all(&self.db)
            .await
            .map_err(map_query)?;
        rows.into_iter().map(question_from).collect()
    }

    async fn get_question(&self, id: &str) -> Result<Option<Question>, StorageError> {
        match question::Entity::find_by_id(id)
            .filter(user_id_condition(question::Column::UserId))
            .filter(not_deleted(question::Column::DeletedAt))
            .one(&self.db)
            .await
            .map_err(map_query)?
        {
            Some(model) => Ok(Some(question_from(model)?)),
            None => Ok(None),
        }
    }

    async fn create_question(&self, input: NewQuestion) -> Result<Question, StorageError> {
        let input = input
            .normalized()
            .map_err(StorageError::Invalid)?;
        let id = new_id();
        let created_at = self.now();
        let options = input
            .options
            .as_ref()
            .map(|v| serde_json::to_string(v).unwrap_or_else(|_| "null".into()));
        let citations = serde_json::to_string(&input.citations)
            .map_err(|_| StorageError::Invalid("citations serialize failed"))?;
        let (user_id, version, deleted_at) = new_row_sync_fields();
        let model = question::ActiveModel {
            id: Set(id),
            subject_id: Set(input.subject_id),
            source_id: Set(input.source_id),
            topic_id: Set(input.topic_id),
            kind: Set(input.kind),
            cognitive_level: Set(input.cognitive_level),
            stem: Set(input.stem),
            options: Set(options),
            correct_option: Set(input.correct_option),
            model_answer: Set(input.model_answer),
            explanation: Set(input.explanation),
            grounding: Set(input.grounding),
            citations: Set(citations),
            is_gold: Set(input.is_gold),
            gold_status: Set(input.gold_status),
            status: Set(input.status),
            generated_by: Set(input.generated_by),
            prompt_version: Set(input.prompt_version),
            user_id,
            version,
            deleted_at,
            created_at: Set(created_at),
            ..Default::default()
        };
        let inserted = model.insert(&self.db).await.map_err(map_query)?;
        question_from(inserted)
    }

    async fn create_questions(
        &self,
        inputs: Vec<NewQuestion>,
    ) -> Result<Vec<Question>, StorageError> {
        let mut out = Vec::with_capacity(inputs.len());
        for input in inputs {
            out.push(self.create_question(input).await?);
        }
        Ok(out)
    }

    async fn update_question(
        &self,
        id: &str,
        input: UpdateQuestion,
    ) -> Result<Option<Question>, StorageError> {
        let input = input.normalized().map_err(StorageError::Invalid)?;
        let Some(existing) = question::Entity::find_by_id(id)
            .filter(user_id_condition(question::Column::UserId))
            .filter(not_deleted(question::Column::DeletedAt))
            .one(&self.db)
            .await
            .map_err(map_query)?
        else {
            return Ok(None);
        };
        let ver = existing.version;
        let mut active: question::ActiveModel = existing.into();
        if let Some(stem) = input.stem {
            active.stem = Set(stem);
        }
        if let Some(options) = input.options {
            active.options = Set(Some(
                serde_json::to_string(&options)
                    .map_err(|_| StorageError::Invalid("options serialize failed"))?,
            ));
        }
        if let Some(correct_option) = input.correct_option {
            active.correct_option = Set(Some(correct_option));
        }
        if let Some(model_answer) = input.model_answer {
            active.model_answer = Set(Some(model_answer));
        }
        if let Some(explanation) = input.explanation {
            active.explanation = Set(Some(explanation));
        }
        if let Some(status) = input.status {
            active.status = Set(status);
        }
        if let Some(is_gold) = input.is_gold {
            active.is_gold = Set(is_gold);
        }
        if let Some(gold_status) = input.gold_status {
            active.gold_status = Set(gold_status);
        }
        if let Some(cognitive_level) = input.cognitive_level {
            active.cognitive_level = Set(cognitive_level);
        }
        active.version = bump_version(ver);
        let updated = active.update(&self.db).await.map_err(map_query)?;
        Ok(Some(question_from(updated)?))
    }

    async fn delete_question(&self, id: &str) -> Result<bool, StorageError> {
        let Some(existing) = question::Entity::find_by_id(id)
            .filter(user_id_condition(question::Column::UserId))
            .filter(not_deleted(question::Column::DeletedAt))
            .one(&self.db)
            .await
            .map_err(map_query)?
        else {
            return Ok(false);
        };
        let ver = existing.version;
        let mut active: question::ActiveModel = existing.into();
        let stamp = self.now();
        active.deleted_at = Set(Some(stamp));
        active.version = bump_version(ver);
        active.update(&self.db).await.map_err(map_query)?;
        Ok(true)
    }

    async fn list_stems_for_topic(
        &self,
        topic_id: &str,
    ) -> Result<Vec<(String, String)>, StorageError> {
        let rows = question::Entity::find()
            .filter(question::Column::TopicId.eq(topic_id))
            .filter(question::Column::Status.eq("active"))
            .all(&self.db)
            .await
            .map_err(map_query)?;
        Ok(rows.into_iter().map(|r| (r.id, r.stem)).collect())
    }
}

#[async_trait]
impl StudySessionRepository for Store {
    async fn create_session(
        &self,
        input: NewStudySession,
        burst_size: u32,
    ) -> Result<StudySession, StorageError> {
        let input = input.normalized().map_err(StorageError::Invalid)?;
        let id = new_id();
        let started_at = self.now();
        let scope = serde_json::to_string(&input.scope)
            .map_err(|_| StorageError::Invalid("scope serialize failed"))?;
        let mode = input
            .mode
            .unwrap_or_else(|| study_core::StudyMode::Practice.as_str().to_owned());
        let model = study_session::ActiveModel {
            id: Set(id),
            subject_id: Set(input.subject_id),
            scope: Set(scope),
            grounding_mode: Set(input.grounding_mode),
            burst_size: Set(burst_size as i32),
            mode: Set(mode),
            started_at: Set(started_at),
            ended_at: Set(None),
            ..Default::default()
        };
        let inserted = model.insert(&self.db).await.map_err(map_query)?;
        session_from(inserted)
    }

    async fn get_session(&self, id: &str) -> Result<Option<StudySession>, StorageError> {
        match study_session::Entity::find_by_id(id)
            .one(&self.db)
            .await
            .map_err(map_query)?
        {
            Some(model) => Ok(Some(session_from(model)?)),
            None => Ok(None),
        }
    }

    async fn list_open_sessions(&self, subject_id: &str) -> Result<Vec<StudySession>, StorageError> {
        let rows = study_session::Entity::find()
            .filter(study_session::Column::SubjectId.eq(subject_id))
            .filter(study_session::Column::EndedAt.is_null())
            .order_by_desc(study_session::Column::StartedAt)
            .all(&self.db)
            .await
            .map_err(map_query)?;
        rows.into_iter().map(session_from).collect()
    }

    async fn end_session(&self, id: &str) -> Result<Option<StudySession>, StorageError> {
        let Some(existing) = study_session::Entity::find_by_id(id)
            .one(&self.db)
            .await
            .map_err(map_query)?
        else {
            return Ok(None);
        };
        let mut active: study_session::ActiveModel = existing.into();
        active.ended_at = Set(Some(self.now()));
        let updated = active.update(&self.db).await.map_err(map_query)?;
        Ok(Some(session_from(updated)?))
    }

    async fn add_session_questions(
        &self,
        session_id: &str,
        question_ids: &[String],
        burst_index: i32,
        item_kind: Option<&str>,
    ) -> Result<Vec<SessionQuestion>, StorageError> {
        let item_kind = item_kind.unwrap_or("new").trim().to_owned();
        let mut out = Vec::with_capacity(question_ids.len());
        for (position, question_id) in question_ids.iter().enumerate() {
            let model = session_question::ActiveModel {
                id: Set(new_id()),
                session_id: Set(session_id.to_owned()),
                question_id: Set(question_id.clone()),
                burst_index: Set(burst_index),
                position: Set(position as i32),
                item_kind: Set(item_kind.clone()),
                ..Default::default()
            };
            let inserted = model.insert(&self.db).await.map_err(map_query)?;
            out.push(session_question_from(inserted));
        }
        Ok(out)
    }

    async fn list_session_questions(
        &self,
        session_id: &str,
    ) -> Result<Vec<SessionQuestion>, StorageError> {
        let rows = session_question::Entity::find()
            .filter(session_question::Column::SessionId.eq(session_id))
            .order_by_asc(session_question::Column::BurstIndex)
            .order_by_asc(session_question::Column::Position)
            .all(&self.db)
            .await
            .map_err(map_query)?;
        Ok(rows.into_iter().map(session_question_from).collect())
    }

    async fn max_burst_index(&self, session_id: &str) -> Result<i32, StorageError> {
        let rows = session_question::Entity::find()
            .filter(session_question::Column::SessionId.eq(session_id))
            .all(&self.db)
            .await
            .map_err(map_query)?;
        Ok(rows
            .into_iter()
            .map(|r| r.burst_index)
            .max()
            .unwrap_or(-1))
    }
}

#[async_trait]
impl AttemptRepository for Store {
    async fn create_attempt(&self, input: NewAttemptRow) -> Result<Attempt, StorageError> {
        let feedback = serde_json::to_string(&input.feedback)
            .map_err(|_| StorageError::Invalid("feedback serialize failed"))?;
        let (user_id, version, deleted_at) = new_row_sync_fields();
        let model = attempt::ActiveModel {
            id: Set(new_id()),
            question_id: Set(input.question_id),
            session_id: Set(input.session_id),
            test_id: Set(input.test_id),
            answer_text: Set(input.answer_text),
            selected_option: Set(input.selected_option),
            score: Set(input.score),
            verdict: Set(input.verdict),
            feedback: Set(feedback),
            graded_by: Set(input.graded_by),
            confidence: Set(input.confidence),
            original_score: Set(None),
            original_verdict: Set(None),
            time_taken_ms: Set(input.time_taken_ms),
            user_id,
            version,
            deleted_at,
            created_at: Set(self.now()),
            ..Default::default()
        };
        let inserted = model.insert(&self.db).await.map_err(map_query)?;
        attempt_from(inserted)
    }

    async fn get_attempt(&self, id: &str) -> Result<Option<Attempt>, StorageError> {
        match attempt::Entity::find_by_id(id)
            .one(&self.db)
            .await
            .map_err(map_query)?
        {
            Some(model) => Ok(Some(attempt_from(model)?)),
            None => Ok(None),
        }
    }

    async fn list_attempts_for_session(
        &self,
        session_id: &str,
    ) -> Result<Vec<Attempt>, StorageError> {
        let rows = attempt::Entity::find()
            .filter(attempt::Column::SessionId.eq(session_id))
            .order_by_asc(attempt::Column::CreatedAt)
            .all(&self.db)
            .await
            .map_err(map_query)?;
        rows.into_iter().map(attempt_from).collect()
    }

    async fn latest_attempt_for_question(
        &self,
        session_id: &str,
        question_id: &str,
    ) -> Result<Option<Attempt>, StorageError> {
        let rows = attempt::Entity::find()
            .filter(attempt::Column::SessionId.eq(session_id))
            .filter(attempt::Column::QuestionId.eq(question_id))
            .order_by_desc(attempt::Column::CreatedAt)
            .all(&self.db)
            .await
            .map_err(map_query)?;
        match rows.into_iter().next() {
            Some(model) => Ok(Some(attempt_from(model)?)),
            None => Ok(None),
        }
    }

    async fn list_attempts_for_test(&self, test_id: &str) -> Result<Vec<Attempt>, StorageError> {
        let rows = attempt::Entity::find()
            .filter(attempt::Column::TestId.eq(test_id))
            .order_by_asc(attempt::Column::CreatedAt)
            .all(&self.db)
            .await
            .map_err(map_query)?;
        rows.into_iter().map(attempt_from).collect()
    }

    async fn prior_attempts_same_day(
        &self,
        question_id: &str,
        since_iso: &str,
        exclude_attempt_id: &str,
    ) -> Result<u32, StorageError> {
        let count = attempt::Entity::find()
            .filter(attempt::Column::QuestionId.eq(question_id))
            .filter(attempt::Column::CreatedAt.gte(since_iso))
            .filter(attempt::Column::Id.ne(exclude_attempt_id))
            .count(&self.db)
            .await
            .map_err(map_query)?;
        Ok(count as u32)
    }

    async fn override_attempt(
        &self,
        id: &str,
        verdict: &str,
        score: f32,
    ) -> Result<Option<Attempt>, StorageError> {
        let Some(existing) = attempt::Entity::find_by_id(id)
            .one(&self.db)
            .await
            .map_err(map_query)?
        else {
            return Ok(None);
        };
        let original_score = existing.original_score.unwrap_or(existing.score);
        let original_verdict = existing
            .original_verdict
            .clone()
            .unwrap_or_else(|| existing.verdict.clone());
        let mut active: attempt::ActiveModel = existing.into();
        active.original_score = Set(Some(original_score));
        active.original_verdict = Set(Some(original_verdict));
        active.score = Set(score);
        active.verdict = Set(verdict.to_owned());
        active.graded_by = Set("manual_override".to_owned());
        let updated = active.update(&self.db).await.map_err(map_query)?;
        Ok(Some(attempt_from(updated)?))
    }
}

#[async_trait]
impl UsageEventRepository for Store {
    async fn create_usage_event(
        &self,
        input: NewUsageEvent,
    ) -> Result<study_core::UsageEvent, StorageError> {
        let input = input.normalized().map_err(StorageError::Invalid)?;
        let model = usage_event::ActiveModel {
            id: Set(new_id()),
            provider: Set(input.provider),
            model: Set(input.model),
            kind: Set(input.kind),
            tokens_in: Set(input.tokens_in),
            tokens_out: Set(input.tokens_out),
            created_at: Set(self.now()),
            ..Default::default()
        };
        let inserted = model.insert(&self.db).await.map_err(map_query)?;
        Ok(study_core::UsageEvent {
            id: inserted.id,
            provider: inserted.provider,
            model: inserted.model,
            kind: inserted.kind,
            tokens_in: inserted.tokens_in,
            tokens_out: inserted.tokens_out,
            created_at: inserted.created_at,
        })
    }

    async fn list_usage_events(
        &self,
        limit: u32,
    ) -> Result<Vec<study_core::UsageEvent>, StorageError> {
        let rows = usage_event::Entity::find()
            .order_by_desc(usage_event::Column::CreatedAt)
            .all(&self.db)
            .await
            .map_err(map_query)?;
        Ok(rows
            .into_iter()
            .take(limit as usize)
            .map(|r| study_core::UsageEvent {
                id: r.id,
                provider: r.provider,
                model: r.model,
                kind: r.kind,
                tokens_in: r.tokens_in,
                tokens_out: r.tokens_out,
                created_at: r.created_at,
            })
            .collect())
    }
}

#[async_trait]
impl WebSearchProviderRepository for Store {
    async fn list_web_search_providers(&self) -> Result<Vec<WebSearchProvider>, StorageError> {
        let rows = web_search_provider::Entity::find()
            .order_by_asc(web_search_provider::Column::Name)
            .all(&self.db)
            .await
            .map_err(map_query)?;
        Ok(rows.into_iter().map(web_search_from).collect())
    }

    async fn get_web_search_provider(
        &self,
        id: &str,
    ) -> Result<Option<WebSearchProvider>, StorageError> {
        Ok(web_search_provider::Entity::find_by_id(id)
            .one(&self.db)
            .await
            .map_err(map_query)?
            .map(web_search_from))
    }

    async fn get_web_search_secret(
        &self,
        id: &str,
    ) -> Result<Option<WebSearchSecret>, StorageError> {
        Ok(web_search_provider::Entity::find_by_id(id)
            .one(&self.db)
            .await
            .map_err(map_query)?
            .map(|m| WebSearchSecret {
                id: m.id,
                name: m.name,
                endpoint: m.endpoint,
                api_key: m.api_key,
            }))
    }

    async fn create_web_search_provider(
        &self,
        input: NewWebSearchProvider,
    ) -> Result<WebSearchProvider, StorageError> {
        let input = input.normalized().map_err(StorageError::Invalid)?;
        let stamp = self.now();
        let model = web_search_provider::ActiveModel {
            id: Set(new_id()),
            name: Set(input.name),
            endpoint: Set(input.endpoint),
            api_key: Set(input.api_key),
            created_at: Set(stamp.clone()),
            updated_at: Set(stamp),
            ..Default::default()
        };
        let inserted = model.insert(&self.db).await.map_err(map_query)?;
        Ok(web_search_from(inserted))
    }

    async fn update_web_search_provider(
        &self,
        id: &str,
        input: UpdateWebSearchProvider,
    ) -> Result<Option<WebSearchProvider>, StorageError> {
        let Some(existing) = web_search_provider::Entity::find_by_id(id)
            .one(&self.db)
            .await
            .map_err(map_query)?
        else {
            return Ok(None);
        };
        let mut active: web_search_provider::ActiveModel = existing.into();
        if let Some(name) = input.name {
            let name = name.trim().to_owned();
            if name.is_empty() {
                return Err(StorageError::Invalid("name required"));
            }
            active.name = Set(name);
        }
        if let Some(endpoint) = input.endpoint {
            let endpoint = endpoint.trim().to_owned();
            if endpoint.is_empty() {
                return Err(StorageError::Invalid("endpoint required"));
            }
            active.endpoint = Set(endpoint);
        }
        if input.clear_api_key.unwrap_or(false) {
            active.api_key = Set(None);
        } else if let Some(api_key) = input.api_key {
            let trimmed = api_key.trim().to_owned();
            if !trimmed.is_empty() {
                active.api_key = Set(Some(trimmed));
            }
        }
        active.updated_at = Set(self.now());
        let updated = active.update(&self.db).await.map_err(map_query)?;
        Ok(Some(web_search_from(updated)))
    }

    async fn delete_web_search_provider(&self, id: &str) -> Result<bool, StorageError> {
        let result = web_search_provider::Entity::delete_by_id(id)
            .exec(&self.db)
            .await
            .map_err(map_query)?;
        Ok(result.rows_affected > 0)
    }
}

#[async_trait]
impl QuestionSettingsRepository for Store {
    async fn get_question_settings(&self) -> Result<QuestionSettings, StorageError> {
        let defaults = QuestionSettings::default();
        let burst = self
            .find_setting_by_key(SETTING_BURST_SIZE)
            .await?
            .and_then(|s| s.value.parse::<u32>().ok())
            .unwrap_or(defaults.default_burst_size);
        let mix = match self.find_setting_by_key(SETTING_COGNITIVE_MIX).await? {
            Some(s) => serde_json::from_str::<CognitiveMix>(&s.value).unwrap_or(defaults.cognitive_mix),
            None => defaults.cognitive_mix,
        };
        let grounding = self
            .find_setting_by_key(SETTING_GROUNDING_MODE)
            .await?
            .map(|s| s.value)
            .unwrap_or(defaults.default_grounding_mode);
        QuestionSettings {
            default_burst_size: burst,
            cognitive_mix: mix,
            default_grounding_mode: grounding,
        }
        .normalized()
        .map_err(StorageError::Invalid)
    }

    async fn update_question_settings(
        &self,
        settings: QuestionSettings,
    ) -> Result<QuestionSettings, StorageError> {
        let settings = settings.normalized().map_err(StorageError::Invalid)?;
        upsert_setting(self, SETTING_BURST_SIZE, &settings.default_burst_size.to_string()).await?;
        let mix = serde_json::to_string(&settings.cognitive_mix)
            .map_err(|_| StorageError::Invalid("mix serialize failed"))?;
        upsert_setting(self, SETTING_COGNITIVE_MIX, &mix).await?;
        upsert_setting(
            self,
            SETTING_GROUNDING_MODE,
            &settings.default_grounding_mode,
        )
        .await?;
        Ok(settings)
    }
}

async fn upsert_setting(store: &Store, key: &str, value: &str) -> Result<(), StorageError> {
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
