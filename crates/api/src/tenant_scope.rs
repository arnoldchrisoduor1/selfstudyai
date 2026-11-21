use axum::http::HeaderMap;
use storage::with_tenant_user;

use crate::auth_context::optional_user;
use crate::error::ApiError;
use crate::state::AppState;

/// Run store access with tenant task-local set from optional session (local-only when absent).
pub async fn with_data_tenant<T, F, Fut>(
    state: &AppState,
    headers: &HeaderMap,
    f: F,
) -> Result<T, ApiError>
where
    F: FnOnce() -> Fut,
    Fut: std::future::Future<Output = Result<T, ApiError>>,
{
    let user_id = optional_user(state, headers).await.map(|u| u.user_id);
    with_tenant_user(user_id, f()).await
}