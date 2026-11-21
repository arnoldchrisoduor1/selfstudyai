use axum::extract::{Path, Query, State};
use axum::http::StatusCode;
use axum::Json;
use study_core::{NewIntegrityEvent, SubmitAnswer, TestConfig};

use crate::error::ApiError;
use crate::learning_services::{
    create_test, expire_test, get_test_detail, ingest_integrity_event, list_tests, start_test,
    submit_test, submit_test_answer, test_results, TestDetail,
};
use crate::routes::learning::SubjectQuery;
use crate::state::AppState;

pub async fn create(
    State(state): State<AppState>,
    Json(config): Json<TestConfig>,
) -> Result<(StatusCode, Json<study_core::FinalTest>), ApiError> {
    let test = create_test(&state, config).await?;
    Ok((StatusCode::CREATED, Json(test)))
}

pub async fn list(
    State(state): State<AppState>,
    Query(query): Query<SubjectQuery>,
) -> Result<Json<Vec<study_core::FinalTest>>, ApiError> {
    Ok(Json(list_tests(&state, query.subject_id.as_deref()).await?))
}

pub async fn get_one(
    State(state): State<AppState>,
    Path(id): Path<String>,
) -> Result<Json<TestDetail>, ApiError> {
    Ok(Json(get_test_detail(&state, &id).await?))
}

pub async fn start(
    State(state): State<AppState>,
    Path(id): Path<String>,
) -> Result<Json<study_core::FinalTest>, ApiError> {
    Ok(Json(start_test(&state, &id).await?))
}

pub async fn answer(
    State(state): State<AppState>,
    Path(id): Path<String>,
    Json(body): Json<SubmitAnswer>,
) -> Result<Json<crate::learning_services::AnswerWithLeakGuard>, ApiError> {
    Ok(Json(submit_test_answer(&state, &id, body).await?))
}

pub async fn submit(
    State(state): State<AppState>,
    Path(id): Path<String>,
) -> Result<Json<study_core::FinalTest>, ApiError> {
    Ok(Json(submit_test(&state, &id).await?))
}

pub async fn expire(
    State(state): State<AppState>,
    Path(id): Path<String>,
) -> Result<Json<study_core::FinalTest>, ApiError> {
    Ok(Json(expire_test(&state, &id).await?))
}

pub async fn integrity_events(
    State(state): State<AppState>,
    Path(id): Path<String>,
    Json(body): Json<NewIntegrityEvent>,
) -> Result<(StatusCode, Json<study_core::IntegrityEvent>), ApiError> {
    let event = ingest_integrity_event(&state, &id, body).await?;
    Ok((StatusCode::CREATED, Json(event)))
}

pub async fn results(
    State(state): State<AppState>,
    Path(id): Path<String>,
) -> Result<Json<study_core::TestResults>, ApiError> {
    Ok(Json(test_results(&state, &id).await?))
}