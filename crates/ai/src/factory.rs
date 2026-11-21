use std::sync::Arc;

use crate::error::AiError;
use crate::mock::MockProvider;
use crate::ollama::OllamaProvider;
use crate::openai_compatible::OpenAiCompatibleProvider;
use crate::provider::Provider;
use crate::types::{ProviderConfig, ProviderKind};

pub fn build_provider(config: &ProviderConfig) -> Result<Arc<dyn Provider>, AiError> {
    match config.kind {
        ProviderKind::Mock => {
            let dims = if config.embedding_dimensions == 0 {
                32
            } else {
                config.embedding_dimensions
            };
            let provider = MockProvider::new(dims)?;
            Ok(Arc::new(provider))
        }
        ProviderKind::Ollama => {
            let provider = OllamaProvider::new(
                config.base_url.clone(),
                config.chat_model.clone(),
                config.embedding_model.clone(),
            )?;
            Ok(Arc::new(provider))
        }
        ProviderKind::OpenAiCompatible => {
            let base_url = config
                .base_url
                .clone()
                .filter(|u| !u.trim().is_empty())
                .ok_or_else(|| AiError::config("OpenAI-compatible provider requires base_url"))?;

            let api_key = config.api_key.as_deref().unwrap_or("");
            if api_key.trim().is_empty() {
                return Err(AiError::config(
                    "OpenAI-compatible provider requires an API key",
                ));
            }

            // Validate models before constructing so misconfiguration errors are clear.
            if config.chat_model.trim().is_empty() {
                return Err(AiError::config(
                    "OpenAI-compatible provider requires chat_model",
                ));
            }
            if config.embedding_model.trim().is_empty() {
                return Err(AiError::config(
                    "OpenAI-compatible provider requires embedding_model",
                ));
            }

            let provider = OpenAiCompatibleProvider::new(
                base_url,
                api_key.to_string(),
                config.chat_model.clone(),
                config.embedding_model.clone(),
            )?;
            Ok(Arc::new(provider))
        }
    }
}