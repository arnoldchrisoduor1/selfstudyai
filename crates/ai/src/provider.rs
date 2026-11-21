use async_trait::async_trait;

use crate::error::AiError;
use crate::types::ChatMessage;

#[async_trait]
pub trait Provider: Send + Sync {
    async fn embed(&self, texts: &[String]) -> Result<Vec<Vec<f32>>, AiError>;
    async fn chat(&self, messages: &[ChatMessage]) -> Result<String, AiError>;
}