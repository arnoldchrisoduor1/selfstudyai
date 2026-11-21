use axum::extract::{Path, State};
use axum::http::StatusCode;
use axum::Json;
use serde::Deserialize;
use study_core::{NewSetting, NewWebSearchProvider, UpdateWebSearchProvider, WebSearchProvider};

use crate::error::ApiError;
use crate::state::AppState;
use questions::{HttpWebSearchProvider, MockWebSearchProvider, WebSearchProvider as SearchTrait};
use storage::{SettingRepository, WebSearchProviderRepository};
use study_core::SETTING_WEB_SEARCH_PROVIDER;

pub async fn list(
    State(state): State<AppState>,
) -> Result<Json<Vec<WebSearchProvider>>, ApiError> {
    Ok(Json(state.store.list_web_search_providers().await?))
}

pub async fn get_one(
    State(state): State<AppState>,
    Path(id): Path<String>,
) -> Result<Json<WebSearchProvider>, ApiError> {
    state
        .store
        .get_web_search_provider(&id)
        .await?
        .map(Json)
        .ok_or(ApiError::NotFound)
}

pub async fn create(
    State(state): State<AppState>,
    Json(body): Json<NewWebSearchProvider>,
) -> Result<(StatusCode, Json<WebSearchProvider>), ApiError> {
    let created = state.store.create_web_search_provider(body).await?;
    Ok((StatusCode::CREATED, Json(created)))
}

pub async fn update(
    State(state): State<AppState>,
    Path(id): Path<String>,
    Json(body): Json<UpdateWebSearchProvider>,
) -> Result<Json<WebSearchProvider>, ApiError> {
    state
        .store
        .update_web_search_provider(&id, body)
        .await?
        .map(Json)
        .ok_or(ApiError::NotFound)
}

pub async fn delete_one(
    State(state): State<AppState>,
    Path(id): Path<String>,
) -> Result<StatusCode, ApiError> {
    if !state.store.delete_web_search_provider(&id).await? {
        return Err(ApiError::NotFound);
    }
    Ok(StatusCode::NO_CONTENT)
}

#[derive(Debug, Deserialize)]
pub struct TestBody {
    pub provider_id: Option<String>,
}

#[derive(Debug, serde::Serialize)]
pub struct TestResponse {
    pub ok: bool,
    pub message: String,
}

pub async fn test_connection(
    State(state): State<AppState>,
    Json(body): Json<TestBody>,
) -> Result<Json<TestResponse>, ApiError> {
    let id = body
        .provider_id
        .ok_or(ApiError::Invalid("provider_id required"))?;
    let secret = state
        .store
        .get_web_search_secret(&id)
        .await?
        .ok_or(ApiError::NotFound)?;
    let result = if secret.endpoint == "mock" || secret.endpoint.starts_with("mock://") {
        let mock = MockWebSearchProvider::new();
        mock.search("osmosis", 1).await
    } else {
        let http = HttpWebSearchProvider::new(secret.endpoint, secret.api_key)?;
        http.search("test", 1).await
    };
    match result {
        Ok(hits) => Ok(Json(TestResponse {
            ok: true,
            message: format!("{} hit(s)", hits.len()),
        })),
        Err(err) => Ok(Json(TestResponse {
            ok: false,
            message: err.to_string(),
        })),
    }
}

#[derive(Debug, Deserialize)]
pub struct SetDefaultBody {
    pub provider_id: String,
}

pub async fn set_default(
    State(state): State<AppState>,
    Json(body): Json<SetDefaultBody>,
) -> Result<StatusCode, ApiError> {
    let _ = state
        .store
        .get_web_search_provider(&body.provider_id)
        .await?
        .ok_or(ApiError::NotFound)?;
    if let Some(existing) = state
        .store
        .find_setting_by_key(SETTING_WEB_SEARCH_PROVIDER)
        .await?
    {
        let _ = state
            .store
            .update_setting(
                &existing.id,
                NewSetting {
                    key: SETTING_WEB_SEARCH_PROVIDER.into(),
                    value: body.provider_id,
                },
            )
            .await?;
    } else {
        let _ = state
            .store
            .create_setting(NewSetting {
                key: SETTING_WEB_SEARCH_PROVIDER.into(),
                value: body.provider_id,
            })
            .await?;
    }
    Ok(StatusCode::NO_CONTENT)
}
