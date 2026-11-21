use axum::extract::State;
use axum::Json;
use study_core::QuestionSettings;

use crate::error::ApiError;
use crate::services::{get_question_settings, update_question_settings};
use crate::state::AppState;

pub async fn get(
    State(state): State<AppState>,
) -> Result<Json<QuestionSettings>, ApiError> {
    Ok(Json(get_question_settings(&state.store).await?))
}

pub async fn update(
    State(state): State<AppState>,
    Json(body): Json<QuestionSettings>,
) -> Result<Json<QuestionSettings>, ApiError> {
    Ok(Json(update_question_settings(&state.store, body).await?))
}
