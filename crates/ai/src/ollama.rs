use async_trait::async_trait;
use reqwest::header::{CONTENT_TYPE, HeaderMap, HeaderValue};
use serde::{Deserialize, Serialize};

use crate::error::AiError;
use crate::provider::Provider;
use crate::types::ChatMessage;

const DEFAULT_OLLAMA_BASE: &str = "http://localhost:11434";

pub struct OllamaProvider {
    client: reqwest::Client,
    base_url: String,
    chat_model: String,
    embedding_model: String,
}

impl OllamaProvider {
    pub fn new(
        base_url: Option<String>,
        chat_model: String,
        embedding_model: String,
    ) -> Result<Self, AiError> {
        if chat_model.trim().is_empty() {
            return Err(AiError::config("Ollama provider requires chat_model"));
        }
        if embedding_model.trim().is_empty() {
            return Err(AiError::config("Ollama provider requires embedding_model"));
        }

        let base_url = base_url
            .filter(|u| !u.trim().is_empty())
            .unwrap_or_else(|| DEFAULT_OLLAMA_BASE.to_string());
        let base_url = base_url.trim_end_matches('/').to_string();

        Ok(Self {
            client: reqwest::Client::new(),
            base_url,
            chat_model,
            embedding_model,
        })
    }

    fn json_headers() -> HeaderMap {
        let mut headers = HeaderMap::new();
        headers.insert(CONTENT_TYPE, HeaderValue::from_static("application/json"));
        headers
    }
}

#[derive(Deserialize)]
struct OllamaEmbeddingResponse {
    embedding: Vec<f32>,
}

#[derive(Serialize)]
struct OllamaChatRequest<'a> {
    model: &'a str,
    messages: &'a [ChatMessage],
    stream: bool,
}

#[derive(Deserialize)]
struct OllamaChatResponse {
    message: OllamaChatMessage,
}

#[derive(Deserialize)]
struct OllamaChatMessage {
    content: String,
}

#[async_trait]
impl Provider for OllamaProvider {
    async fn embed(&self, texts: &[String]) -> Result<Vec<Vec<f32>>, AiError> {
        let url = format!("{}/api/embeddings", self.base_url);
        let mut vectors = Vec::with_capacity(texts.len());

        for text in texts {
            let body = serde_json::json!({
                "model": self.embedding_model,
                "prompt": text,
            });

            let response = self
                .client
                .post(&url)
                .headers(Self::json_headers())
                .json(&body)
                .send()
                .await
                .map_err(|e| AiError::request(format!("Ollama embeddings request failed: {e}")))?;

            let status = response.status();
            let raw = response
                .text()
                .await
                .map_err(|e| AiError::request(format!("Ollama embeddings response read failed: {e}")))?;

            if !status.is_success() {
                return Err(AiError::request(format!(
                    "Ollama embeddings request failed ({status}): {raw}"
                )));
            }

            let parsed: OllamaEmbeddingResponse = serde_json::from_str(&raw).map_err(|e| {
                AiError::request(format!("Ollama embeddings response parse failed: {e}"))
            })?;
            vectors.push(parsed.embedding);
        }

        Ok(vectors)
    }

    async fn chat(&self, messages: &[ChatMessage]) -> Result<String, AiError> {
        let url = format!("{}/api/chat", self.base_url);
        let body = OllamaChatRequest {
            model: &self.chat_model,
            messages,
            stream: false,
        };

        let response = self
            .client
            .post(&url)
            .headers(Self::json_headers())
            .json(&body)
            .send()
            .await
            .map_err(|e| AiError::request(format!("Ollama chat request failed: {e}")))?;

        let status = response.status();
        let raw = response
            .text()
            .await
            .map_err(|e| AiError::request(format!("Ollama chat response read failed: {e}")))?;

        if !status.is_success() {
            return Err(AiError::request(format!(
                "Ollama chat request failed ({status}): {raw}"
            )));
        }

        let parsed: OllamaChatResponse = serde_json::from_str(&raw)
            .map_err(|e| AiError::request(format!("Ollama chat response parse failed: {e}")))?;

        Ok(parsed.message.content)
    }
}