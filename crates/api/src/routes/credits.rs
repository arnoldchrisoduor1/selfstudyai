use axum::{extract::State, http::HeaderMap, Json};
use chrono::Utc;
use storage::CreditsRepository;
use study_core::{CreditKind, CreditsBalance, CreditsLedgerEntry, TopUpRequest};

use crate::auth_context::current_user;
use crate::error::ApiError;
use crate::state::AppState;

pub async fn balance(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> Result<Json<CreditsBalance>, ApiError> {
    let user = current_user(&state, &headers).await?;
    Ok(Json(state.store.balance(&user.user_id).await?))
}

pub async fn ledger(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> Result<Json<Vec<CreditsLedgerEntry>>, ApiError> {
    let user = current_user(&state, &headers).await?;
    Ok(Json(state.store.list_ledger(&user.user_id, 100).await?))
}

pub async fn topup(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(body): Json<TopUpRequest>,
) -> Result<Json<CreditsLedgerEntry>, ApiError> {
    let user = current_user(&state, &headers).await?;
    if body.amount_credits <= 0 {
        return Err(ApiError::Invalid("amount must be positive"));
    }
    let payment = state
        .payment
        .start_topup(&user.user_id, body.amount_credits, &body.idempotency_key)
        .await
        .map_err(|msg| ApiError::InvalidOwned(msg))?;
    let entry = state
        .store
        .append_entry(
            &user.user_id,
            payment.credits,
            CreditKind::Topup,
            Some(payment.reference),
        )
        .await?;
    Ok(Json(entry))
}

pub async fn admin_adjust(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(body): Json<TopUpRequest>,
) -> Result<Json<CreditsLedgerEntry>, ApiError> {
    let user = current_user(&state, &headers).await?;
    if std::env::var("ADMIN_USER_ID")
        .map(|id| id == user.user_id)
        .unwrap_or(false)
    {
        return topup(State(state), headers, Json(body)).await;
    }
    Err(ApiError::Invalid("admin only"))
}

pub async fn ensure_cloud_spend(
    state: &AppState,
    user_id: &str,
    estimate: i64,
) -> Result<String, ApiError> {
    let day_start = Utc::now().date_naive().and_hms_opt(0, 0, 0).unwrap().to_string();
    let spent = state.store.spend_today(user_id, &day_start).await?;
    if spent + estimate > state.credits_daily_cap {
        return Err(ApiError::Invalid("daily spend cap reached"));
    }
    state
        .store
        .reserve(user_id, estimate)
        .await
        .map_err(|e| match e {
            storage::StorageError::Invalid("insufficient credits") => {
                ApiError::Invalid("insufficient credits")
            }
            other => other.into(),
        })
}