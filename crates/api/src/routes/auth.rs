use axum::{
    extract::State,
    http::{HeaderMap, StatusCode},
    response::IntoResponse,
    Json,
};
use axum_extra::extract::cookie::{Cookie, SameSite};
use chrono::{Duration, Utc};
use storage::{
    AuthRepository, TOKEN_KIND_RESET, TOKEN_KIND_VERIFY, SESSION_KIND_BEARER, SESSION_KIND_COOKIE,
};
use study_core::{
    AuthMe, PasswordResetConfirm, PasswordResetRequest, SignIn, SignUp, UserAccount, VerifyEmail,
};

use crate::auth_util::{hash_password, random_token, token_hash, verify_password};
use crate::error::ApiError;
use crate::auth_context::current_user;
use crate::middleware::auth::session_expiry_iso;
use crate::state::AppState;

const SESSION_COOKIE: &str = "study_session";

pub async fn sign_up(
    State(state): State<AppState>,
    Json(body): Json<SignUp>,
) -> Result<Json<UserAccount>, ApiError> {
    state.ratelimit.check("signup", &body.email, 5).await?;
    if state.store.find_user_by_email(&body.email).await?.is_some() {
        return Err(ApiError::Invalid("email already registered"));
    }
    let password_hash =
        hash_password(&body.password).map_err(|msg| ApiError::InvalidOwned(msg))?;
    let user = state.store.create_user(&body.email, &password_hash).await?;
    let token = random_token();
    let expires = (Utc::now() + Duration::hours(24)).to_rfc3339();
    state
        .store
        .create_email_token(&user.id, TOKEN_KIND_VERIFY, &token_hash(&token), &expires)
        .await?;
    state
        .email
        .send(
            &user.email,
            "Verify your Self Study account",
            &format!("Verification token: {token}"),
        )
        .await
        .map_err(|_| ApiError::Invalid("email send failed"))?;
    Ok(Json(user))
}

pub async fn sign_in(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(body): Json<SignIn>,
) -> Result<impl IntoResponse, ApiError> {
    state.ratelimit.check("login", &body.email, 20).await?;
    let Some((user, hash)) = state.store.find_user_by_email(&body.email).await? else {
        return Err(ApiError::Invalid("invalid credentials"));
    };
    if !verify_password(&body.password, &hash) {
        return Err(ApiError::Invalid("invalid credentials"));
    }
  let token = random_token();
    let is_desktop = headers
        .get("x-study-client")
        .and_then(|v| v.to_str().ok())
        == Some("desktop");
    let kind = if is_desktop {
        SESSION_KIND_BEARER
    } else {
        SESSION_KIND_COOKIE
    };
    let expires = session_expiry_iso(30);
    let session = state
        .store
        .create_session(
            &user.id,
            &token_hash(&token),
            kind,
            headers
                .get("user-agent")
                .and_then(|v| v.to_str().ok())
                .map(ToOwned::to_owned),
            headers
                .get("x-forwarded-for")
                .and_then(|v| v.to_str().ok())
                .map(ToOwned::to_owned),
            &expires,
        )
        .await?;
    if is_desktop {
        return Ok((
            StatusCode::OK,
            Json(serde_json::json!({
                "user": user,
                "bearer_token": token,
                "session": session,
            })),
        )
            .into_response());
    }
    let cookie = Cookie::build((SESSION_COOKIE, token))
        .http_only(true)
        .secure(state.secure_cookies)
        .same_site(SameSite::Lax)
        .path("/")
        .build();
    Ok((
        StatusCode::OK,
        [(axum::http::header::SET_COOKIE, cookie.to_string())],
        Json(serde_json::json!({ "user": user, "session": session })),
    )
        .into_response())
}

pub async fn me(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> Result<Json<AuthMe>, ApiError> {
    let user = current_user(&state, &headers).await?;
    let Some((account, _)) = state.store.find_user_with_hash(&user.user_id).await? else {
        return Err(ApiError::Invalid("user not found"));
    };
    let sessions = state.store.list_sessions(&user.user_id).await?;
    Ok(Json(AuthMe {
        user: account,
        sessions,
    }))
}

pub async fn verify_email(
    State(state): State<AppState>,
    Json(body): Json<VerifyEmail>,
) -> Result<StatusCode, ApiError> {
    let now = state.store.clock().now_rfc3339();
    let Some(user_id) = state
        .store
        .consume_email_token(TOKEN_KIND_VERIFY, &token_hash(&body.token), &now)
        .await?
    else {
        return Err(ApiError::Invalid("invalid or expired token"));
    };
    state.store.mark_email_verified(&user_id).await?;
    Ok(StatusCode::NO_CONTENT)
}

pub async fn request_password_reset(
    State(state): State<AppState>,
    Json(body): Json<PasswordResetRequest>,
) -> Result<StatusCode, ApiError> {
    state.ratelimit.check("reset", &body.email, 10).await?;
    if let Some((user, _)) = state.store.find_user_by_email(&body.email).await? {
        let token = random_token();
        let expires = (Utc::now() + Duration::hours(2)).to_rfc3339();
        state
            .store
            .create_email_token(&user.id, TOKEN_KIND_RESET, &token_hash(&token), &expires)
            .await?;
        let _ = state
            .email
            .send(
                &user.email,
                "Reset your Self Study password",
                &format!("Reset token: {token}"),
            )
            .await;
    }
    Ok(StatusCode::NO_CONTENT)
}

pub async fn confirm_password_reset(
    State(state): State<AppState>,
    Json(body): Json<PasswordResetConfirm>,
) -> Result<StatusCode, ApiError> {
    let now = state.store.clock().now_rfc3339();
    let Some(user_id) = state
        .store
        .consume_email_token(TOKEN_KIND_RESET, &token_hash(&body.token), &now)
        .await?
    else {
        return Err(ApiError::Invalid("invalid or expired token"));
    };
    let password_hash =
        hash_password(&body.new_password).map_err(|msg| ApiError::InvalidOwned(msg))?;
    state.store.update_password_hash(&user_id, &password_hash).await?;
    state.store.revoke_all_sessions(&user_id).await?;
    Ok(StatusCode::NO_CONTENT)
}

pub async fn logout(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> Result<impl IntoResponse, ApiError> {
    let user = current_user(&state, &headers).await?;
    state.store.revoke_session(&user.session_id).await?;
    let cookie = Cookie::build((SESSION_COOKIE, ""))
        .http_only(true)
        .secure(state.secure_cookies)
        .same_site(SameSite::Lax)
        .path("/")
        .removal()
        .build();
    Ok((
        StatusCode::NO_CONTENT,
        [(axum::http::header::SET_COOKIE, cookie.to_string())],
    ))
}

pub async fn logout_all(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> Result<StatusCode, ApiError> {
    let user = current_user(&state, &headers).await?;
    state.store.revoke_all_sessions(&user.user_id).await?;
    Ok(StatusCode::NO_CONTENT)
}

pub async fn delete_account(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> Result<StatusCode, ApiError> {
    let user = current_user(&state, &headers).await?;
    state.store.revoke_all_sessions(&user.user_id).await?;
    state.store.delete_user(&user.user_id).await?;
    Ok(StatusCode::NO_CONTENT)
}

pub async fn link_local_data(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(body): Json<study_core::LinkLocalDataRequest>,
) -> Result<Json<serde_json::Value>, ApiError> {
    let user = current_user(&state, &headers).await?;
    if !body.confirm {
        return Err(ApiError::Invalid("confirmation required"));
    }
    let rows = state.store.assign_local_rows_to_user(&user.user_id).await?;
    Ok(Json(serde_json::json!({ "rows_linked": rows })))
}