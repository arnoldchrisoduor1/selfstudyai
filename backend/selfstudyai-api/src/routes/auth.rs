use axum::{
    extract::State,
    http::StatusCode,
    Json,
    response::IntoResponse,
};
use validator::Validate;

use crate::dto::auth::{AuthResponse, ErrorResponse, LoginRequest, RegisterRequest};
use crate::services::auth::AuthService;
use crate::AppState;

pub async fn register(
    State(state): State<AppState>,
    Json(payload): Json<RegisterRequest>,
) -> impl IntoResponse {
    // Validate input
    if let Err(errors) = payload.validate() {
        return (
            StatusCode::BAD_REQUEST,
            Json(ErrorResponse {
                error: format!("Validation error: {}", errors),
            }),
        )
            .into_response();
    }

    // Register user
    match AuthService::register(&state.db, payload, &state.jwt_secret).await {
        Ok(response) => (StatusCode::CREATED, Json(response)).into_response(),
        Err(e) => (
            StatusCode::BAD_REQUEST,
            Json(ErrorResponse { error: e }),
        )
            .into_response(),
    }
}

pub async fn login(
    State(state): State<AppState>,
    Json(payload): Json<LoginRequest>,
) -> impl IntoResponse {
    // Validate input
    if let Err(errors) = payload.validate() {
        return (
            StatusCode::BAD_REQUEST,
            Json(ErrorResponse {
                error: format!("Validation error: {}", errors),
            }),
        )
            .into_response();
    }

    // Login user
    match AuthService::login(&state.db, payload, &state.jwt_secret).await {
        Ok(response) => (StatusCode::OK, Json(response)).into_response(),
        Err(e) => (
            StatusCode::UNAUTHORIZED,
            Json(ErrorResponse { error: e }),
        )
            .into_response(),
    }
}