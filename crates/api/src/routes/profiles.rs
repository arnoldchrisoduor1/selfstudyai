use axum::extract::{Path, State};
use axum::http::StatusCode;
use axum::Json;
use storage::LocalProfileRepository;
use study_core::{LocalProfile, NewLocalProfile};

use crate::error::ApiError;
use crate::state::AppState;

pub async fn list(State(state): State<AppState>) -> Result<Json<Vec<LocalProfile>>, ApiError> {
    let rows = state.store.list_profiles().await?;
    Ok(Json(rows))
}

pub async fn get_one(
    State(state): State<AppState>,
    Path(id): Path<String>,
) -> Result<Json<LocalProfile>, ApiError> {
    state
        .store
        .get_profile(&id)
        .await?
        .map(Json)
        .ok_or(ApiError::NotFound)
}

pub async fn create(
    State(state): State<AppState>,
    Json(body): Json<NewLocalProfile>,
) -> Result<(StatusCode, Json<LocalProfile>), ApiError> {
    let created = state.store.create_profile(body).await?;
    Ok((StatusCode::CREATED, Json(created)))
}

pub async fn update(
    State(state): State<AppState>,
    Path(id): Path<String>,
    Json(body): Json<NewLocalProfile>,
) -> Result<Json<LocalProfile>, ApiError> {
    state
        .store
        .update_profile(&id, body)
        .await?
        .map(Json)
        .ok_or(ApiError::NotFound)
}

pub async fn delete_one(
    State(state): State<AppState>,
    Path(id): Path<String>,
) -> Result<StatusCode, ApiError> {
    if state.store.delete_profile(&id).await? {
        Ok(StatusCode::NO_CONTENT)
    } else {
        Err(ApiError::NotFound)
    }
}
