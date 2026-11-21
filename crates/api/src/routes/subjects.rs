use axum::extract::{Path, State};
use axum::http::{HeaderMap, StatusCode};
use axum::Json;
use storage::SubjectRepository;
use study_core::{NewSubject, Subject};

use crate::error::ApiError;
use crate::state::AppState;
use crate::tenant_scope::with_data_tenant;

pub async fn list(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> Result<Json<Vec<Subject>>, ApiError> {
    with_data_tenant(&state, &headers, || async {
        let rows = state.store.list_subjects().await?;
        Ok(Json(rows))
    })
    .await
}

pub async fn get_one(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(id): Path<String>,
) -> Result<Json<Subject>, ApiError> {
    with_data_tenant(&state, &headers, || async {
        state
            .store
            .get_subject(&id)
            .await?
            .map(Json)
            .ok_or(ApiError::NotFound)
    })
    .await
}

pub async fn create(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(body): Json<NewSubject>,
) -> Result<(StatusCode, Json<Subject>), ApiError> {
    with_data_tenant(&state, &headers, || async {
        let created = state.store.create_subject(body).await?;
        Ok((StatusCode::CREATED, Json(created)))
    })
    .await
}

pub async fn update(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(id): Path<String>,
    Json(body): Json<NewSubject>,
) -> Result<Json<Subject>, ApiError> {
    with_data_tenant(&state, &headers, || async {
        state
            .store
            .update_subject(&id, body)
            .await?
            .map(Json)
            .ok_or(ApiError::NotFound)
    })
    .await
}

pub async fn delete_one(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(id): Path<String>,
) -> Result<StatusCode, ApiError> {
    with_data_tenant(&state, &headers, || async {
        if state.store.delete_subject(&id).await? {
            Ok(StatusCode::NO_CONTENT)
        } else {
            Err(ApiError::NotFound)
        }
    })
    .await
}
