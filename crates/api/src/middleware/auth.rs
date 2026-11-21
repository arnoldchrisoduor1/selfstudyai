use axum::{
    extract::{Request, State},
    http::{header::AUTHORIZATION, StatusCode},
    middleware::Next,
    response::Response,
};
use chrono::{Duration, Utc};
use storage::AuthRepository;
use storage::{SESSION_KIND_BEARER, SESSION_KIND_COOKIE};

use crate::auth_util::token_hash;
use crate::state::AppState;

#[derive(Clone, Debug)]
pub struct AuthUser {
    pub user_id: String,
    pub session_id: String,
}

pub async fn optional_auth(
    State(state): State<AppState>,
    mut req: Request,
    next: Next,
) -> Response {
    if let Some(user) = resolve_user(&state, &req).await {
        req.extensions_mut().insert(AuthUser {
            user_id: user.0,
            session_id: user.1,
        });
    }
    next.run(req).await
}

pub async fn require_auth(req: Request, next: Next) -> Result<Response, StatusCode> {
    if req.extensions().get::<AuthUser>().is_none() {
        return Err(StatusCode::UNAUTHORIZED);
    }
    Ok(next.run(req).await)
}

async fn resolve_user(state: &AppState, req: &Request) -> Option<(String, String)> {
    if let Some(cookie) = req
        .headers()
        .get("cookie")
        .and_then(|value| value.to_str().ok())
    {
        for part in cookie.split(';') {
            let part = part.trim();
            if let Some(token) = part.strip_prefix("study_session=") {
                if let Some(session) = validate_token(state, token, SESSION_KIND_COOKIE).await {
                    return Some(session);
                }
            }
        }
    }
    if let Some(value) = req.headers().get(AUTHORIZATION).and_then(|h| h.to_str().ok()) {
        let token = value.strip_prefix("Bearer ").unwrap_or(value).trim();
        if let Some(session) = validate_token(state, token, SESSION_KIND_BEARER).await {
            return Some(session);
        }
    }
    None
}

async fn validate_token(state: &AppState, token: &str, kind: &str) -> Option<(String, String)> {
    let hashed = token_hash(token);
    let session = state
        .store
        .find_session_by_token_hash(&hashed)
        .await
        .ok()??;
    if session.kind != kind {
        return None;
    }
    if session.revoked_at.is_some() {
        return None;
    }
    let expires = chrono::DateTime::parse_from_rfc3339(&session.expires_at).ok()?;
    if expires < Utc::now() {
        return None;
    }
    Some((session.user_id, session.id))
}

pub fn session_expiry_iso(days: i64) -> String {
    (Utc::now() + Duration::days(days)).to_rfc3339()
}