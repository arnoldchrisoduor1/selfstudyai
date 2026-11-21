use axum::extract::{Path, State};
use axum::http::HeaderMap;
use axum::http::StatusCode;
use axum::Json;
use serde::Deserialize;
use study_core::{NewStudySession, OverrideGrade, SubmitAnswer};

use crate::auth_context::optional_user;
use crate::error::ApiError;
use crate::learning_services::override_attempt_learning;
use crate::services::{
    create_or_resume_session, fetch_burst, submit_answer, AnswerResponse, BurstResponse,
};
use crate::state::AppState;
use storage::StudySessionRepository;

#[derive(Debug, Deserialize)]
pub struct CreateSessionBody {
    pub subject_id: String,
    pub scope: study_core::SessionScope,
    pub grounding_mode: String,
    pub burst_size: Option<u32>,
    pub mode: Option<String>,
    pub resume_session_id: Option<String>,
}

pub async fn create(
    State(state): State<AppState>,
    Json(body): Json<CreateSessionBody>,
) -> Result<(StatusCode, Json<study_core::StudySession>), ApiError> {
    let input = NewStudySession {
        subject_id: body.subject_id,
        scope: body.scope,
        grounding_mode: body.grounding_mode,
        burst_size: body.burst_size,
        mode: body.mode,
    };
    let session = create_or_resume_session(&state, input, body.resume_session_id).await?;
    Ok((StatusCode::CREATED, Json(session)))
}

pub async fn get_one(
    State(state): State<AppState>,
    Path(id): Path<String>,
) -> Result<Json<study_core::StudySession>, ApiError> {
    state
        .store
        .get_session(&id)
        .await?
        .map(Json)
        .ok_or(ApiError::NotFound)
}

pub async fn end(
    State(state): State<AppState>,
    Path(id): Path<String>,
) -> Result<Json<study_core::StudySession>, ApiError> {
    state
        .store
        .end_session(&id)
        .await?
        .map(Json)
        .ok_or(ApiError::NotFound)
}

pub async fn next_burst(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(id): Path<String>,
) -> Result<Json<BurstResponse>, ApiError> {
    let cloud_user = optional_user(&state, &headers).await;
    Ok(Json(
        fetch_burst(&state, &id, cloud_user.as_ref()).await?,
    ))
}

pub async fn answer(
    State(state): State<AppState>,
    Path(id): Path<String>,
    Json(body): Json<SubmitAnswer>,
) -> Result<Json<AnswerResponse>, ApiError> {
    let body = body.normalized().map_err(ApiError::Invalid)?;
    Ok(Json(
        submit_answer(
            &state,
            &id,
            &body.question_id,
            body.answer_text,
            body.selected_option,
            body.time_taken_ms,
        )
        .await?,
    ))
}

pub async fn override_grade(
    State(state): State<AppState>,
    Path((session_id, attempt_id)): Path<(String, String)>,
    Json(body): Json<OverrideGrade>,
) -> Result<Json<study_core::Attempt>, ApiError> {
    let _session = state
        .store
        .get_session(&session_id)
        .await?
        .ok_or(ApiError::NotFound)?;
    let body = body.normalized().map_err(ApiError::Invalid)?;
    let score = body.score.unwrap_or(0.0);
    Ok(Json(
        override_attempt_learning(&state, &attempt_id, &body.verdict, score).await?,
    ))
}

pub async fn list_open(
    State(state): State<AppState>,
    axum::extract::Query(query): axum::extract::Query<SubjectQuery>,
) -> Result<Json<Vec<study_core::StudySession>>, ApiError> {
    let subject_id = query
        .subject_id
        .ok_or(ApiError::Invalid("subject_id required"))?;
    Ok(Json(state.store.list_open_sessions(&subject_id).await?))
}

#[derive(Debug, Deserialize)]
pub struct SubjectQuery {
    pub subject_id: Option<String>,
}
