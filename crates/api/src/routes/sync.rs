use axum::{extract::State, http::HeaderMap, Json};
use storage::SyncEngine;
use study_core::{SyncPullRequest, SyncPullResponse, SyncPushRequest, SyncPushResponse, SyncState, SyncStatus};

use crate::auth_context::{current_user, optional_user};
use crate::error::ApiError;
use crate::state::AppState;

pub async fn status(State(state): State<AppState>, headers: HeaderMap) -> Json<SyncStatus> {
    let online = optional_user(&state, &headers).await.is_some();
    Json(SyncStatus {
        state: if online {
            SyncState::Synced
        } else {
            SyncState::Offline
        },
        last_sync_at: None,
        message: if online {
            None
        } else {
            Some("sign in to sync".into())
        },
    })
}

pub async fn pull(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(body): Json<SyncPullRequest>,
) -> Result<Json<SyncPullResponse>, ApiError> {
    let user = current_user(&state, &headers).await?;
    let resp = state
        .store
        .pull(
            &user.user_id,
            body.cursor.as_deref(),
            body.limit.unwrap_or(100),
        )
        .await?;
    Ok(Json(resp))
}

pub async fn push(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(body): Json<SyncPushRequest>,
) -> Result<Json<SyncPushResponse>, ApiError> {
    let user = current_user(&state, &headers).await?;
    let resp = state.store.push(&user.user_id, body).await?;
    state.store.recompute_card_states(&user.user_id).await?;
    Ok(Json(resp))
}