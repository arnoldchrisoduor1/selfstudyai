use axum::extract::State;
use axum::Json;
use serde::Serialize;
use storage::Repository;

use crate::state::AppState;

#[derive(Serialize)]
pub struct HealthResponse {
    pub status: &'static str,
}

pub async fn health(State(state): State<AppState>) -> Json<HealthResponse> {
    tracing::debug!(backend = state.store.backend(), "health check");
    Json(HealthResponse { status: "ok" })
}
