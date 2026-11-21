use axum::extract::{Path, Query, State};
use axum::http::{HeaderMap, StatusCode};
use axum::Json;
use serde::Deserialize;
use study_core::{Question, QuestionFilter, UpdateQuestion};

use crate::error::ApiError;
use crate::state::AppState;
use crate::tenant_scope::with_data_tenant;
use storage::QuestionRepository;

#[derive(Debug, Deserialize)]
pub struct ListQuery {
    pub subject_id: Option<String>,
    pub source_id: Option<String>,
    pub topic_id: Option<String>,
    pub kind: Option<String>,
    pub cognitive_level: Option<String>,
    pub gold: Option<bool>,
    pub gold_status: Option<String>,
    pub grounding: Option<String>,
    pub status: Option<String>,
}

pub async fn list(
    State(state): State<AppState>,
    headers: HeaderMap,
    Query(query): Query<ListQuery>,
) -> Result<Json<Vec<Question>>, ApiError> {
    with_data_tenant(&state, &headers, || async {
        let filter = QuestionFilter {
            subject_id: query.subject_id,
            source_id: query.source_id,
            topic_id: query.topic_id,
            kind: query.kind,
            cognitive_level: query.cognitive_level,
            gold: query.gold,
            gold_status: query.gold_status,
            grounding: query.grounding,
            status: query.status,
        };
        Ok(Json(state.store.list_questions(filter).await?))
    })
    .await
}

pub async fn get_one(
    State(state): State<AppState>,
    Path(id): Path<String>,
) -> Result<Json<Question>, ApiError> {
    state
        .store
        .get_question(&id)
        .await?
        .map(Json)
        .ok_or(ApiError::NotFound)
}

pub async fn update(
    State(state): State<AppState>,
    Path(id): Path<String>,
    Json(body): Json<UpdateQuestion>,
) -> Result<Json<Question>, ApiError> {
    state
        .store
        .update_question(&id, body)
        .await?
        .map(Json)
        .ok_or(ApiError::NotFound)
}

pub async fn archive(
    State(state): State<AppState>,
    Path(id): Path<String>,
) -> Result<Json<Question>, ApiError> {
    state
        .store
        .update_question(
            &id,
            UpdateQuestion {
                stem: None,
                options: None,
                correct_option: None,
                model_answer: None,
                explanation: None,
                status: Some("archived".into()),
                is_gold: None,
                gold_status: None,
                cognitive_level: None,
            },
        )
        .await?
        .map(Json)
        .ok_or(ApiError::NotFound)
}

pub async fn flag(
    State(state): State<AppState>,
    Path(id): Path<String>,
) -> Result<Json<Question>, ApiError> {
    state
        .store
        .update_question(
            &id,
            UpdateQuestion {
                stem: None,
                options: None,
                correct_option: None,
                model_answer: None,
                explanation: None,
                status: Some("flagged".into()),
                is_gold: None,
                gold_status: None,
                cognitive_level: None,
            },
        )
        .await?
        .map(Json)
        .ok_or(ApiError::NotFound)
}

pub async fn delete_one(
    State(state): State<AppState>,
    Path(id): Path<String>,
) -> Result<StatusCode, ApiError> {
    if !state.store.delete_question(&id).await? {
        return Err(ApiError::NotFound);
    }
    Ok(StatusCode::NO_CONTENT)
}

pub async fn gold_queue(
    State(state): State<AppState>,
    Query(query): Query<SubjectQuery>,
) -> Result<Json<Vec<Question>>, ApiError> {
    let filter = QuestionFilter {
        subject_id: query.subject_id,
        source_id: None,
        topic_id: None,
        kind: None,
        cognitive_level: None,
        gold: None,
        gold_status: Some("proposed".into()),
        grounding: None,
        status: Some("active".into()),
    };
    Ok(Json(state.store.list_questions(filter).await?))
}

#[derive(Debug, Deserialize)]
pub struct SubjectQuery {
    pub subject_id: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct GoldDecision {
    pub confirm: bool,
}

pub async fn gold_review(
    State(state): State<AppState>,
    Path(id): Path<String>,
    Json(body): Json<GoldDecision>,
) -> Result<Json<Question>, ApiError> {
    let (is_gold, gold_status) = if body.confirm {
        (true, "confirmed")
    } else {
        (false, "rejected")
    };
    state
        .store
        .update_question(
            &id,
            UpdateQuestion {
                stem: None,
                options: None,
                correct_option: None,
                model_answer: None,
                explanation: None,
                status: None,
                is_gold: Some(is_gold),
                gold_status: Some(gold_status.into()),
                cognitive_level: None,
            },
        )
        .await?
        .map(Json)
        .ok_or(ApiError::NotFound)
}

#[derive(Debug, Deserialize)]
pub struct GoldToggle {
    pub is_gold: bool,
}

pub async fn gold_toggle(
    State(state): State<AppState>,
    Path(id): Path<String>,
    Json(body): Json<GoldToggle>,
) -> Result<Json<Question>, ApiError> {
    let gold_status = if body.is_gold { "confirmed" } else { "none" };
    state
        .store
        .update_question(
            &id,
            UpdateQuestion {
                stem: None,
                options: None,
                correct_option: None,
                model_answer: None,
                explanation: None,
                status: None,
                is_gold: Some(body.is_gold),
                gold_status: Some(gold_status.into()),
                cognitive_level: None,
            },
        )
        .await?
        .map(Json)
        .ok_or(ApiError::NotFound)
}
