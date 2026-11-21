use axum::extract::{Path, State};
use axum::http::StatusCode;
use axum::Json;
use storage::SettingRepository;
use study_core::{NewSetting, Setting};

use crate::error::ApiError;
use crate::state::AppState;

pub async fn list(State(state): State<AppState>) -> Result<Json<Vec<Setting>>, ApiError> {
    let rows = state.store.list_settings().await?;
    Ok(Json(rows))
}

pub async fn get_one(
    State(state): State<AppState>,
    Path(id): Path<String>,
) -> Result<Json<Setting>, ApiError> {
    state
        .store
        .get_setting(&id)
        .await?
        .map(Json)
        .ok_or(ApiError::NotFound)
}

pub async fn create(
    State(state): State<AppState>,
    Json(body): Json<NewSetting>,
) -> Result<(StatusCode, Json<Setting>), ApiError> {
    let created = state.store.create_setting(body).await?;
    Ok((StatusCode::CREATED, Json(created)))
}

pub async fn update(
    State(state): State<AppState>,
    Path(id): Path<String>,
    Json(body): Json<NewSetting>,
) -> Result<Json<Setting>, ApiError> {
    state
        .store
        .update_setting(&id, body)
        .await?
        .map(Json)
        .ok_or(ApiError::NotFound)
}

pub async fn delete_one(
    State(state): State<AppState>,
    Path(id): Path<String>,
) -> Result<StatusCode, ApiError> {
    if state.store.delete_setting(&id).await? {
        Ok(StatusCode::NO_CONTENT)
    } else {
        Err(ApiError::NotFound)
    }
}
