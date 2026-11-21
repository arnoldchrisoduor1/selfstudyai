use axum::http::{HeaderMap, header::AUTHORIZATION};
use chrono::Utc;
use storage::AuthRepository;
use storage::{SESSION_KIND_BEARER, SESSION_KIND_COOKIE};

use crate::auth_util::token_hash;
use crate::error::ApiError;
use crate::middleware::auth::AuthUser;
use crate::state::AppState;

pub async fn current_user(state: &AppState, headers: &HeaderMap) -> Result<AuthUser, ApiError> {
    if let Some(cookie) = headers.get("cookie").and_then(|value| value.to_str().ok()) {
        for part in cookie.split(';') {
            let part = part.trim();
            if let Some(token) = part.strip_prefix("study_session=") {
                if let Some(user) = validate_token(state, token, SESSION_KIND_COOKIE).await? {
                    return Ok(user);
                }
            }
        }
    }
    if let Some(value) = headers.get(AUTHORIZATION).and_then(|h| h.to_str().ok()) {
        let token = value.strip_prefix("Bearer ").unwrap_or(value).trim();
        if let Some(user) = validate_token(state, token, SESSION_KIND_BEARER).await? {
            return Ok(user);
        }
    }
    Err(ApiError::Unauthorized)
}

pub async fn optional_user(state: &AppState, headers: &HeaderMap) -> Option<AuthUser> {
    current_user(state, headers).await.ok()
}

async fn validate_token(
    state: &AppState,
    token: &str,
    kind: &str,
) -> Result<Option<AuthUser>, ApiError> {
    let hashed = token_hash(token);
    let Some(session) = state.store.find_session_by_token_hash(&hashed).await? else {
        return Ok(None);
    };
    if session.kind != kind || session.revoked_at.is_some() {
        return Ok(None);
    }
    let expires = chrono::DateTime::parse_from_rfc3339(&session.expires_at)
        .map_err(|_| ApiError::Invalid("invalid session expiry"))?;
    if expires < Utc::now() {
        return Ok(None);
    }
    Ok(Some(AuthUser {
        user_id: session.user_id,
        session_id: session.id,
    }))
}