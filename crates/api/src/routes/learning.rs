use axum::extract::{Query, State};
use axum::http::StatusCode;
use axum::Json;
use serde::Deserialize;
use study_core::LearningSettingsPatch;

use crate::error::ApiError;
use crate::learning_services::{
    backfill, build_dashboard, due_queue, get_resolved_settings, list_daily_activity,
    patch_learning_settings, points_ledger, streak_info,
};
use crate::state::AppState;

#[derive(Debug, Deserialize)]
pub struct SubjectQuery {
    pub subject_id: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct ActivityQuery {
    pub from: Option<String>,
    pub to: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct LedgerQuery {
    pub limit: Option<u32>,
}

pub async fn get_settings(
    State(state): State<AppState>,
    Query(query): Query<SubjectQuery>,
) -> Result<Json<study_core::ResolvedLearningSettings>, ApiError> {
    Ok(Json(
        get_resolved_settings(&state, query.subject_id.as_deref()).await?,
    ))
}

pub async fn patch_settings(
    State(state): State<AppState>,
    Query(query): Query<SubjectQuery>,
    Json(patch): Json<LearningSettingsPatch>,
) -> Result<Json<study_core::ResolvedLearningSettings>, ApiError> {
    Ok(Json(
        patch_learning_settings(&state, query.subject_id.as_deref(), patch).await?,
    ))
}

pub async fn get_due_queue(
    State(state): State<AppState>,
    Query(query): Query<SubjectQuery>,
) -> Result<Json<Vec<study_core::DueQueueItem>>, ApiError> {
    Ok(Json(due_queue(&state, query.subject_id.as_deref()).await?))
}

pub async fn dashboard(
    State(state): State<AppState>,
) -> Result<Json<study_core::Dashboard>, ApiError> {
    Ok(Json(build_dashboard(&state).await?))
}

pub async fn ledger(
    State(state): State<AppState>,
    Query(query): Query<LedgerQuery>,
) -> Result<Json<Vec<study_core::PointsLedgerEntry>>, ApiError> {
    let limit = query.limit.unwrap_or(50).min(500);
    Ok(Json(points_ledger(&state, limit).await?))
}

pub async fn streak(
    State(state): State<AppState>,
) -> Result<Json<study_core::StreakInfo>, ApiError> {
    Ok(Json(streak_info(&state).await?))
}

pub async fn daily_activity(
    State(state): State<AppState>,
    Query(query): Query<ActivityQuery>,
) -> Result<Json<Vec<study_core::DailyActivity>>, ApiError> {
    Ok(Json(
        list_daily_activity(&state, query.from.as_deref(), query.to.as_deref()).await?,
    ))
}

pub async fn run_backfill(
    State(state): State<AppState>,
) -> Result<(StatusCode, Json<serde_json::Value>), ApiError> {
    let created = backfill(&state).await?;
    Ok((
        StatusCode::OK,
        Json(serde_json::json!({ "card_states_created": created })),
    ))
}