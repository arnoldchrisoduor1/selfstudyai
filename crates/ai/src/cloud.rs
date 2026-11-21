use std::sync::Arc;

use crate::error::AiError;
use crate::openai_compatible::OpenAiCompatibleProvider;
use crate::provider::Provider;

/// Platform-hosted AI; API key comes from `CLOUD_AI_API_KEY` only (never client or DB).
pub struct CloudProvider;

impl CloudProvider {
    pub fn from_env() -> Result<Arc<dyn Provider>, AiError> {
        let api_key = std::env::var("CLOUD_AI_API_KEY").map_err(|_| {
            AiError::config("CLOUD_AI_API_KEY is not configured")
        })?;
        if api_key.trim().is_empty() {
            return Err(AiError::config("CLOUD_AI_API_KEY is not configured"));
        }
        let base_url = std::env::var("CLOUD_AI_BASE_URL")
            .unwrap_or_else(|_| "https://api.openai.com/v1".to_string());
        let chat_model = std::env::var("CLOUD_AI_CHAT_MODEL")
            .unwrap_or_else(|_| "gpt-4o-mini".to_string());
        let embedding_model = std::env::var("CLOUD_AI_EMBEDDING_MODEL")
            .unwrap_or_else(|_| "text-embedding-3-small".to_string());
        let provider = OpenAiCompatibleProvider::new(
            base_url,
            api_key,
            chat_model,
            embedding_model,
        )?;
        Ok(Arc::new(provider))
    }
}