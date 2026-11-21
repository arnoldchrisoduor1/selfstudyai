use axum::extract::{Path, State};
use axum::http::StatusCode;
use axum::Json;
use serde::Deserialize;
use study_core::{AiProvider, NewAiProvider, NewSetting, UpdateAiProvider};

use crate::error::ApiError;
use crate::jobs::resolve_provider;
use crate::state::AppState;
use ai::{build_provider, ChatMessage};
use storage::{AiProviderRepository, SettingRepository, SourceRepository};

pub async fn list(State(state): State<AppState>) -> Result<Json<Vec<AiProvider>>, ApiError> {
    Ok(Json(state.store.list_providers().await?))
}

pub async fn get_one(
    State(state): State<AppState>,
    Path(id): Path<String>,
) -> Result<Json<AiProvider>, ApiError> {
    state
        .store
        .get_provider(&id)
        .await?
        .map(Json)
        .ok_or(ApiError::NotFound)
}

pub async fn create(
    State(state): State<AppState>,
    Json(body): Json<NewAiProvider>,
) -> Result<(StatusCode, Json<AiProvider>), ApiError> {
    let created = state.store.create_provider(body).await?;
    Ok((StatusCode::CREATED, Json(created)))
}

pub async fn update(
    State(state): State<AppState>,
    Path(id): Path<String>,
    Json(body): Json<UpdateAiProvider>,
) -> Result<Json<AiProvider>, ApiError> {
    let embedding_changed = body.embedding_model.is_some() || body.embedding_dimensions.is_some();
    let updated = state
        .store
        .update_provider(&id, body)
        .await?
        .ok_or(ApiError::NotFound)?;
    if embedding_changed {
        let _ = state.store.mark_all_needs_reembed().await?;
    }
    Ok(Json(updated))
}

pub async fn delete_one(
    State(state): State<AppState>,
    Path(id): Path<String>,
) -> Result<StatusCode, ApiError> {
    if !state.store.delete_provider(&id).await? {
        return Err(ApiError::NotFound);
    }
    Ok(StatusCode::NO_CONTENT)
}

#[derive(Debug, Deserialize)]
pub struct TestConnectionBody {
    pub provider_id: Option<String>,
}

#[derive(Debug, serde::Serialize)]
pub struct TestConnectionResponse {
    pub ok: bool,
    pub message: String,
}

pub async fn test_connection(
    State(state): State<AppState>,
    Json(body): Json<TestConnectionBody>,
) -> Result<Json<TestConnectionResponse>, ApiError> {
    let config = if let Some(id) = body.provider_id {
        let secret = state
            .store
            .get_provider_secret(&id)
            .await?
            .ok_or(ApiError::NotFound)?;
        let kind = match secret.kind.as_str() {
            "ollama" => ai::ProviderKind::Ollama,
            "openai_compatible" => ai::ProviderKind::OpenAiCompatible,
            _ => ai::ProviderKind::Mock,
        };
        ai::ProviderConfig {
            id: secret.id,
            name: secret.name,
            kind,
            base_url: secret.base_url,
            api_key: secret.api_key,
            chat_model: secret.chat_model,
            embedding_model: secret.embedding_model,
            embedding_dimensions: secret.embedding_dimensions.max(1) as usize,
        }
    } else {
        resolve_provider(&state.store)
            .await
            .map_err(|_| ApiError::Invalid("no AI provider configured"))?
            .0
    };

    let provider = build_provider(&config).map_err(|e| {
        tracing::warn!(error = %e, "provider test build failed");
        ApiError::Invalid("provider configuration invalid")
    })?;

    match provider
        .chat(&[ChatMessage {
            role: "user".into(),
            content: "ping".into(),
        }])
        .await
    {
        Ok(reply) if !reply.trim().is_empty() => Ok(Json(TestConnectionResponse {
            ok: true,
            message: "connection ok".into(),
        })),
        Ok(_) => Ok(Json(TestConnectionResponse {
            ok: false,
            message: "empty reply".into(),
        })),
        Err(err) => {
            tracing::warn!(error = %err, "provider test failed");
            Ok(Json(TestConnectionResponse {
                ok: false,
                message: "connection failed".into(),
            }))
        }
    }
}

#[derive(Debug, Deserialize)]
pub struct DefaultProviderBody {
    pub provider_id: String,
}

pub async fn set_default(
    State(state): State<AppState>,
    Json(body): Json<DefaultProviderBody>,
) -> Result<StatusCode, ApiError> {
    let provider = state
        .store
        .get_provider(&body.provider_id)
        .await?
        .ok_or(ApiError::NotFound)?;

    let settings = state.store.list_settings().await?;
    if let Some(existing) = settings.iter().find(|s| s.key == "default_ai_provider_id") {
        let _ = state
            .store
            .update_setting(
                &existing.id,
                NewSetting {
                    key: "default_ai_provider_id".into(),
                    value: provider.id.clone(),
                },
            )
            .await?;
    } else {
        let _ = state
            .store
            .create_setting(NewSetting {
                key: "default_ai_provider_id".into(),
                value: provider.id,
            })
            .await?;
    }
    Ok(StatusCode::NO_CONTENT)
}
