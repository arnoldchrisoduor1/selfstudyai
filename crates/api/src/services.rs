use std::sync::Arc;

use ai::{build_provider, ChatMessage, CloudProvider, Provider};
use questions::{
    generate_burst, grade_from_ai_json, grade_mcq, grading_system_prompt, grading_user_prompt,
    strip_answer_fields, ChunkContext, GenerateRequest, HttpWebSearchProvider,
    MockWebSearchProvider, WebSearchProvider,
};
use serde::Serialize;
use storage::{
    AttemptRepository, ChunkRepository, CreditsRepository, LearningSettingsRepository,
    NewAttemptRow, NewUsageEvent, QuestionRepository, QuestionSettingsRepository, Store,
    StudySessionRepository, TopicRepository, UsageEventRepository, WebSearchProviderRepository,
};
use study_core::{
    Attempt, GroundingMode, NewStudySession, Question, QuestionKind, QuestionPublic,
    QuestionSettings, SessionScope, StudySession, SETTING_DEDUPE_THRESHOLD,
    SETTING_WEB_SEARCH_PROVIDER,
};

use crate::error::ApiError;
use crate::jobs::resolve_provider;
use crate::middleware::auth::AuthUser;
use crate::routes::credits::ensure_cloud_spend;
use crate::learning_services::{attach_review_burst, record_learning_outcome};
use crate::state::AppState;
use study_core::StudyMode;

#[derive(Debug, Serialize)]
pub struct BurstResponse {
    pub session: StudySession,
    pub burst_index: i32,
    pub questions: Vec<QuestionPublic>,
    pub answered_ids: Vec<String>,
    pub partial_error: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct AnswerResponse {
    pub attempt: Attempt,
    pub question: Question,
    pub low_confidence: bool,
}

pub async fn create_or_resume_session(
    state: &AppState,
    input: NewStudySession,
    resume_id: Option<String>,
) -> Result<StudySession, ApiError> {
    if let Some(id) = resume_id {
        return state
            .store
            .get_session(&id)
            .await?
            .ok_or(ApiError::NotFound);
    }
    let settings = state.store.get_question_settings().await?;
    let burst_size = input.burst_size.unwrap_or(settings.default_burst_size);
    let session = state.store.create_session(input, burst_size).await?;
    Ok(session)
}

pub async fn fetch_burst(
    state: &AppState,
    session_id: &str,
    cloud_user: Option<&AuthUser>,
) -> Result<BurstResponse, ApiError> {
    let session = state
        .store
        .get_session(session_id)
        .await?
        .ok_or(ApiError::NotFound)?;
    if session.ended_at.is_some() {
        return Err(ApiError::Invalid("session already ended"));
    }

    let linked = state.store.list_session_questions(session_id).await?;
    let attempts = state.store.list_attempts_for_session(session_id).await?;
    let answered: Vec<String> = attempts.iter().map(|a| a.question_id.clone()).collect();

    let max_burst = state.store.max_burst_index(session_id).await?;
    let current_burst = if max_burst < 0 {
        0
    } else {
        let current_links: Vec<_> = linked
            .iter()
            .filter(|l| l.burst_index == max_burst)
            .collect();
        let all_answered = current_links
            .iter()
            .all(|l| answered.iter().any(|id| id == &l.question_id));
        if all_answered {
            max_burst + 1
        } else {
            max_burst
        }
    };

    let mut burst_links: Vec<_> = linked
        .iter()
        .filter(|l| l.burst_index == current_burst)
        .cloned()
        .collect();

    let mut partial_error = None;
    if burst_links.is_empty() {
        let lock = state.session_burst_lock(session_id).await;
        let _guard = lock.lock().await;
        // Re-check after lock — Strict Mode may double-fetch.
        let linked_again = state.store.list_session_questions(session_id).await?;
        burst_links = linked_again
            .into_iter()
            .filter(|l| l.burst_index == current_burst)
            .collect();
        if burst_links.is_empty() {
            let mode = StudyMode::parse(session.mode.trim()).unwrap_or(StudyMode::Practice);
            let generated = if matches!(mode, StudyMode::ReviewDue | StudyMode::Mixed) {
                let links = attach_review_burst(state, &session, current_burst).await?;
                (links, None)
            } else {
                generate_and_attach(state, &session, current_burst, cloud_user).await?
            };
            partial_error = generated.1;
            burst_links = generated.0;
        }
    }

    // Prefetch next burst in background once current exists.
    if !burst_links.is_empty() {
        let next = current_burst + 1;
        let has_next = linked.iter().any(|l| l.burst_index == next);
        if !has_next {
            spawn_pregenerate(state.clone(), session.clone(), next);
        }
    }

    let mut questions = Vec::new();
    for link in &burst_links {
        if let Some(q) = state.store.get_question(&link.question_id).await? {
            questions.push(strip_answer_fields(&q));
        }
    }

    Ok(BurstResponse {
        session,
        burst_index: current_burst,
        questions,
        answered_ids: answered,
        partial_error,
    })
}

fn spawn_pregenerate(state: AppState, session: StudySession, burst_index: i32) {
    tokio::spawn(async move {
        if let Err(err) = generate_and_attach(&state, &session, burst_index, None).await {
            tracing::warn!(
                session_id = %session.id,
                burst_index,
                error = %err_to_string(&err),
                "burst pregeneration failed"
            );
        }
    });
}

fn err_to_string(err: &ApiError) -> String {
    match err {
        ApiError::Invalid(m) => (*m).to_owned(),
        ApiError::InvalidOwned(m) => m.clone(),
        ApiError::Upstream(m) => m.clone(),
        ApiError::NotFound => "not_found".into(),
        ApiError::Unauthorized => "unauthorized".into(),
        ApiError::Conflict => "conflict".into(),
        ApiError::Storage(e) => e.to_string(),
    }
}

async fn generate_and_attach(
    state: &AppState,
    session: &StudySession,
    burst_index: i32,
    cloud_user: Option<&AuthUser>,
) -> Result<(Vec<storage::SessionQuestion>, Option<String>), ApiError> {
    // Another task may have filled this burst already.
    let existing = state.store.list_session_questions(&session.id).await?;
    let already: Vec<_> = existing
        .into_iter()
        .filter(|l| l.burst_index == burst_index)
        .collect();
    if !already.is_empty() {
        return Ok((already, None));
    }

    let settings = state.store.get_question_settings().await?;
    let grounding = GroundingMode::parse(&session.grounding_mode)
        .map_err(ApiError::Invalid)?;
    let scope: SessionScope = serde_json::from_value(session.scope.clone())
        .map_err(|_| ApiError::Invalid("invalid session scope"))?;

    let (provider, provider_label, chat_model, cloud_reservation) =
        load_generation_provider(state, cloud_user, session.burst_size).await?;

    let web = load_web_search(&state.store).await?;

    let chunks = load_chunk_contexts(&state.store, &session.subject_id, &scope).await?;
    let topic_query = chunks
        .first()
        .map(|c| format!("topic {}", c.topic_id))
        .or_else(|| scope.topic_ids.first().cloned());

    let topic_id_for_stems = scope.topic_ids.first().cloned().or_else(|| {
        chunks.first().map(|c| c.topic_id.clone())
    });
    let existing_stems = if let Some(topic_id) = topic_id_for_stems {
        state.store.list_stems_for_topic(&topic_id).await?
    } else {
        Vec::new()
    };

    let dedupe = dedupe_threshold(&state.store).await?;
    let burst_result = generate_burst(
        provider,
        web,
        GenerateRequest {
            subject_id: session.subject_id.clone(),
            grounding,
            burst_size: session.burst_size.max(1) as usize,
            mix: settings.cognitive_mix,
            chunks,
            topic_query,
            existing_stems,
            dedupe_threshold: dedupe,
            provider_label: provider_label.clone(),
            propose_gold_for_core: true,
        },
    )
    .await;

    let result = match burst_result {
        Ok(r) => r,
        Err(e) => {
            if let Some(ref reservation_id) = cloud_reservation {
                let _ = state.store.release_reservation(reservation_id).await;
            }
            return Err(e.into());
        }
    };

    if let Some(ref reservation_id) = cloud_reservation {
        let actual = result.questions.len() as i64;
        let reference = format!("session:{}:burst:{}", session.id, burst_index);
        state
            .store
            .settle_reservation(reservation_id, actual, &reference)
            .await?;
    }

    let _ = state
        .store
        .create_usage_event(NewUsageEvent {
            provider: provider_label,
            model: chat_model,
            kind: "generation".into(),
            tokens_in: 0,
            tokens_out: result.questions.len() as i32,
        })
        .await?;

    let created = state.store.create_questions(result.questions).await?;
    let ids: Vec<String> = created.iter().map(|q| q.id.clone()).collect();
    let links = state
        .store
        .add_session_questions(&session.id, &ids, burst_index, Some("new"))
        .await?;
    Ok((links, result.partial_error))
}

async fn load_chunk_contexts(
    store: &Store,
    subject_id: &str,
    scope: &SessionScope,
) -> Result<Vec<ChunkContext>, ApiError> {
    use storage::SourceRepository;
    let mut out = Vec::new();
    let source_ids = if !scope.source_ids.is_empty() {
        scope.source_ids.clone()
    } else if !scope.topic_ids.is_empty() {
        let mut inferred = Vec::new();
        for topic_id in &scope.topic_ids {
            if let Some(topic) = store.get_topic(topic_id).await? {
                if !inferred.iter().any(|id| id == &topic.source_id) {
                    inferred.push(topic.source_id);
                }
            }
        }
        inferred
    } else {
        store
            .list_sources(Some(subject_id))
            .await?
            .into_iter()
            .map(|s| s.id)
            .collect()
    };

    for source_id in source_ids {
        let topics = store.list_topics(&source_id).await?;
        let chunks = if scope.topic_ids.is_empty() {
            store.list_chunks(&source_id, None).await?
        } else {
            let mut collected = Vec::new();
            for topic_id in &scope.topic_ids {
                collected.extend(store.list_chunks(&source_id, Some(topic_id)).await?);
            }
            collected
        };
        for chunk in chunks {
            let is_core = topics
                .iter()
                .find(|t| t.id == chunk.topic_id)
                .map(|t| t.is_core)
                .unwrap_or(false);
            out.push(ChunkContext {
                id: chunk.id,
                text: chunk.text,
                topic_id: chunk.topic_id,
                source_id: chunk.source_id,
                is_core_topic: is_core,
            });
        }
    }
    // Cap context size.
    out.truncate(12);
    Ok(out)
}

async fn load_generation_provider(
    state: &AppState,
    cloud_user: Option<&AuthUser>,
    burst_size: i32,
) -> Result<(Arc<dyn Provider>, String, String, Option<String>), ApiError> {
    if let Some(user) = cloud_user {
        if state.cloud_ai_enabled {
            let estimate = burst_size.max(1) as i64;
            let reservation = ensure_cloud_spend(state, &user.user_id, estimate).await?;
            let provider = match CloudProvider::from_env() {
                Ok(p) => p,
                Err(e) => {
                    let _ = state.store.release_reservation(&reservation).await;
                    return Err(ApiError::Upstream(e.to_string()));
                }
            };
            let model = std::env::var("CLOUD_AI_CHAT_MODEL")
                .unwrap_or_else(|_| "gpt-4o-mini".to_string());
            return Ok((provider, "cloud".into(), model, Some(reservation)));
        }
    }
    let (provider, label, model) = load_chat_provider(state).await?;
    Ok((provider, label, model, None))
}

pub(crate) async fn load_chat_provider(
    state: &AppState,
) -> Result<(Arc<dyn Provider>, String, String), ApiError> {
    let (config, _) = resolve_provider(&state.store)
        .await
        .map_err(ApiError::Upstream)?;
    let kind = match config.kind {
        ai::ProviderKind::Mock => "mock",
        ai::ProviderKind::Ollama => "ollama",
        ai::ProviderKind::OpenAiCompatible => "openai_compatible",
    };
    let label = format!("{kind}:{}", config.chat_model);
    let chat_model = config.chat_model.clone();
    let provider = build_provider(&config).map_err(|e| ApiError::Upstream(e.to_string()))?;
    Ok((provider, label, chat_model))
}

async fn load_web_search(store: &Store) -> Result<Option<Arc<dyn WebSearchProvider>>, ApiError> {
    use storage::SettingRepository;
    let setting = store
        .find_setting_by_key(SETTING_WEB_SEARCH_PROVIDER)
        .await?;
    if let Some(setting) = setting {
        if let Some(secret) = store.get_web_search_secret(&setting.value).await? {
            if secret.endpoint == "mock" || secret.endpoint.starts_with("mock://") {
                return Ok(Some(Arc::new(MockWebSearchProvider::new())));
            }
            let http = HttpWebSearchProvider::new(secret.endpoint, secret.api_key)?;
            return Ok(Some(Arc::new(http)));
        }
    }
    // Default mock so online mode works in local/dev without config.
    Ok(Some(Arc::new(MockWebSearchProvider::new())))
}

async fn dedupe_threshold(store: &Store) -> Result<f32, ApiError> {
    use storage::SettingRepository;
    Ok(store
        .find_setting_by_key(SETTING_DEDUPE_THRESHOLD)
        .await?
        .and_then(|s| s.value.parse().ok())
        .unwrap_or(0.98))
}

pub async fn submit_answer(
    state: &AppState,
    session_id: &str,
    question_id: &str,
    answer_text: Option<String>,
    selected_option: Option<String>,
    time_taken_ms: Option<i64>,
) -> Result<AnswerResponse, ApiError> {
    let session = state
        .store
        .get_session(session_id)
        .await?
        .ok_or(ApiError::NotFound)?;
    if session.ended_at.is_some() {
        return Err(ApiError::Invalid("session already ended"));
    }
    let question = state
        .store
        .get_question(question_id)
        .await?
        .ok_or(ApiError::NotFound)?;
    let links = state.store.list_session_questions(session_id).await?;
    if !links.iter().any(|l| l.question_id == question_id) {
        return Err(ApiError::Invalid("question not in session"));
    }

    let kind = QuestionKind::parse(&question.kind).map_err(ApiError::Invalid)?;
    let grade = match kind {
        QuestionKind::Mcq => {
            let selected = selected_option
                .as_deref()
                .ok_or(ApiError::Invalid("selected_option required"))?;
            grade_mcq(&question, selected)?
        }
        QuestionKind::Written => {
            let answer = answer_text
                .as_deref()
                .ok_or(ApiError::Invalid("answer_text required"))?;
            let source_text = citation_source_text(&state.store, &question).await?;
            let (provider, provider_label, chat_model) = load_chat_provider(state).await?;
            let messages = [
                ChatMessage {
                    role: "system".into(),
                    content: grading_system_prompt(),
                },
                ChatMessage {
                    role: "user".into(),
                    content: grading_user_prompt(
                        &question.stem,
                        question.model_answer.as_deref().unwrap_or(""),
                        answer,
                        &source_text,
                    ),
                },
            ];
            let raw = provider
                .chat(&messages)
                .await
                .map_err(|e| ApiError::Upstream(e.to_string()))?;
            let _ = state
                .store
                .create_usage_event(NewUsageEvent {
                    provider: provider_label,
                    model: chat_model,
                    kind: "grading".into(),
                    tokens_in: 0,
                    tokens_out: 0,
                })
                .await?;
            grade_from_ai_json(&raw, question.model_answer.clone())?
        }
    };

    let feedback = serde_json::to_value(&grade.feedback)
        .map_err(|_| ApiError::Invalid("feedback serialize failed"))?;
    let attempt = state
        .store
        .create_attempt(NewAttemptRow {
            question_id: question_id.to_owned(),
            session_id: Some(session_id.to_owned()),
            test_id: None,
            answer_text,
            selected_option,
            score: grade.score,
            verdict: grade.verdict.as_str().to_owned(),
            feedback,
            graded_by: grade.graded_by.as_str().to_owned(),
            confidence: grade.confidence,
            time_taken_ms,
        })
        .await?;

    let resolved = state
        .store
        .get_resolved(Some(&session.subject_id))
        .await?;
    record_learning_outcome(state, &attempt, &question, &resolved, false, true).await?;

    let low_confidence = grade.confidence.map(|c| c < 0.55).unwrap_or(false);
    Ok(AnswerResponse {
        attempt,
        question,
        low_confidence,
    })
}

pub(crate) async fn citation_source_text(store: &Store, question: &Question) -> Result<String, ApiError> {
    let citation: study_core::Citation = serde_json::from_value(question.citations.clone())
        .map_err(|_| ApiError::Invalid("invalid citations"))?;
    match citation {
        study_core::Citation::Notes { chunk_ids } => {
            let mut parts = Vec::new();
            for id in chunk_ids {
                if let Some(chunk) = store.get_chunk(&id).await? {
                    parts.push(chunk.text);
                }
            }
            Ok(parts.join("\n\n"))
        }
        study_core::Citation::Online { url, excerpt } => Ok(format!("{url}\n{excerpt}")),
    }
}

pub async fn get_question_settings(store: &Store) -> Result<QuestionSettings, ApiError> {
    Ok(store.get_question_settings().await?)
}

pub async fn update_question_settings(
    store: &Store,
    settings: QuestionSettings,
) -> Result<QuestionSettings, ApiError> {
    Ok(store.update_question_settings(settings).await?)
}
