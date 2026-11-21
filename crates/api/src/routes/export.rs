use axum::{extract::State, http::HeaderMap, response::IntoResponse, Json};
use storage::{LocalProfileRepository, SettingRepository, SubjectRepository};
use study_core::Subject;

use crate::error::ApiError;
use crate::auth_context::optional_user;
use crate::state::AppState;

pub async fn export_data(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> Result<impl IntoResponse, ApiError> {
    let user = optional_user(&state, &headers).await;
    let user_id = user.as_ref().map(|u| u.user_id.clone());
    let (subjects, settings, profiles) = storage::with_tenant_user(user_id, async {
        Ok::<_, ApiError>((
            state.store.list_subjects().await?,
            state.store.list_settings().await?,
            state.store.list_profiles().await?,
        ))
    })
    .await?;
    let subjects: Vec<Subject> = subjects;
    Ok(Json(serde_json::json!({
        "exported_at": state.store.clock().now_rfc3339(),
        "user_id": user.as_ref().map(|u| u.user_id.clone()),
        "subjects": subjects,
        "settings": settings,
        "profiles": profiles,
    })))
}