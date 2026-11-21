//! Model providers: OpenAI-compatible HTTP, Ollama, and deterministic mock.

mod cloud;
mod error;
mod factory;
mod mask;
mod mock;
mod ollama;
mod openai_compatible;
mod provider;
mod types;

pub use cloud::CloudProvider;
pub use error::AiError;
pub use factory::build_provider;
pub use mask::mask_api_key;
pub use mock::MockProvider;
pub use ollama::OllamaProvider;
pub use openai_compatible::OpenAiCompatibleProvider;
pub use provider::Provider;
pub use types::{ChatMessage, ProviderConfig, ProviderKind};

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn mask_api_key_shows_last_four() {
        assert_eq!(mask_api_key("secret-key-xyzz"), "****xyzz");
    }

    #[tokio::test]
    async fn mock_provider_via_factory() {
        let config = ProviderConfig {
            id: "mock-1".to_string(),
            name: "Mock".to_string(),
            kind: ProviderKind::Mock,
            base_url: None,
            api_key: None,
            chat_model: "mock-chat".to_string(),
            embedding_model: "mock-embed".to_string(),
            embedding_dimensions: 32,
        };
        let provider = build_provider(&config).unwrap();
        let emb = provider.embed(&["test".to_string()]).await.unwrap();
        assert_eq!(emb[0].len(), 32);
    }

    #[test]
    fn construction_error_never_contains_raw_api_key() {
        let secret = "super-secret-api-key-12345";
        let config = ProviderConfig {
            id: "openai-1".to_string(),
            name: "OpenAI".to_string(),
            kind: ProviderKind::OpenAiCompatible,
            base_url: None,
            api_key: Some(secret.to_string()),
            chat_model: "gpt-4".to_string(),
            embedding_model: "text-embedding-3-small".to_string(),
            embedding_dimensions: 1536,
        };

        let err = match build_provider(&config) {
            Err(e) => e,
            Ok(_) => panic!("expected construction to fail"),
        };
        let displayed = err.to_string();
        assert!(!displayed.contains(secret));
    }

    #[test]
    fn openai_compatible_new_rejects_empty_chat_model_with_key() {
        let secret = "another-secret-key-abcdef";
        let err = match OpenAiCompatibleProvider::new(
            "https://api.example.com".to_string(),
            secret.to_string(),
            String::new(),
            "embed-model".to_string(),
        ) {
            Err(e) => e,
            Ok(_) => panic!("expected construction to fail"),
        };
        assert!(!err.to_string().contains(secret));
    }

    #[test]
    fn ai_error_debug_has_no_raw_key_when_redacted() {
        let secret = "raw-key-material-9999";
        let msg = format!("request failed using key {secret}");
        let redacted = AiError::redact_message(msg, Some(secret));
        let err = AiError::request(redacted);
        let debug = format!("{err:?}");
        assert!(!debug.contains(secret));
        assert!(!err.to_string().contains(secret));
    }
}