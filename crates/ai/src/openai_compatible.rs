use async_trait::async_trait;
use reqwest::header::{AUTHORIZATION, CONTENT_TYPE, HeaderMap, HeaderValue};
use serde::Deserialize;

use crate::error::AiError;
use crate::provider::Provider;
use crate::types::ChatMessage;

pub struct OpenAiCompatibleProvider {
    client: reqwest::Client,
    base_url: String,
    api_key: String,
    chat_model: String,
    embedding_model: String,
}

impl OpenAiCompatibleProvider {
    pub fn new(
        base_url: String,
        api_key: String,
        chat_model: String,
        embedding_model: String,
    ) -> Result<Self, AiError> {
        if base_url.trim().is_empty() {
            return Err(AiError::config("OpenAI-compatible provider requires base_url"));
        }
        if api_key.trim().is_empty() {
            return Err(AiError::config("OpenAI-compatible provider requires an API key"));
        }
        if chat_model.trim().is_empty() {
            return Err(AiError::config("OpenAI-compatible provider requires chat_model"));
        }
        if embedding_model.trim().is_empty() {
            return Err(AiError::config(
                "OpenAI-compatible provider requires embedding_model",
            ));
        }

        let base_url = base_url.trim_end_matches('/').to_string();
        Ok(Self {
            client: reqwest::Client::new(),
            base_url,
            api_key,
            chat_model,
            embedding_model,
        })
    }

    fn auth_headers(&self) -> Result<HeaderMap, AiError> {
        let mut headers = HeaderMap::new();
        headers.insert(CONTENT_TYPE, HeaderValue::from_static("application/json"));
        let value = format!("Bearer {}", self.api_key);
        headers.insert(
            AUTHORIZATION,
            HeaderValue::from_str(&value).map_err(|e| AiError::config(e.to_string()))?,
        );
        Ok(headers)
    }

    fn api_error(status: reqwest::StatusCode, body: &str, api_key: &str) -> AiError {
        let msg = format!("embeddings request failed ({status}): {body}");
        AiError::request(AiError::redact_message(msg, Some(api_key)))
    }
}

#[derive(Deserialize)]
struct EmbeddingsResponse {
    data: Vec<EmbeddingItem>,
}

#[derive(Deserialize)]
struct EmbeddingItem {
    embedding: Vec<f32>,
}

#[derive(Deserialize)]
struct ChatCompletionResponse {
    choices: Vec<ChatChoice>,
}

#[derive(Deserialize)]
struct ChatChoice {
    message: ChatChoiceMessage,
}

#[derive(Deserialize)]
struct ChatChoiceMessage {
    content: String,
}

#[async_trait]
impl Provider for OpenAiCompatibleProvider {
    async fn embed(&self, texts: &[String]) -> Result<Vec<Vec<f32>>, AiError> {
        let url = format!("{}/v1/embeddings", self.base_url);
        let headers = self.auth_headers()?;
        let body = serde_json::json!({
            "model": self.embedding_model,
            "input": texts,
        });

        let response = self
            .client
            .post(&url)
            .headers(headers)
            .json(&body)
            .send()
            .await
            .map_err(|e| {
                AiError::request(AiError::redact_message(
                    format!("embeddings request failed: {e}"),
                    Some(&self.api_key),
                ))
            })?;

        let status = response.status();
        let text = response.text().await.map_err(|e| {
            AiError::request(AiError::redact_message(
                format!("embeddings response read failed: {e}"),
                Some(&self.api_key),
            ))
        })?;

        if !status.is_success() {
            return Err(Self::api_error(status, &text, &self.api_key));
        }

        let parsed: EmbeddingsResponse = serde_json::from_str(&text).map_err(|e| {
            AiError::request(AiError::redact_message(
                format!("embeddings response parse failed: {e}"),
                Some(&self.api_key),
            ))
        })?;

        Ok(parsed.data.into_iter().map(|d| d.embedding).collect())
    }

    async fn chat(&self, messages: &[ChatMessage]) -> Result<String, AiError> {
        let url = format!("{}/v1/chat/completions", self.base_url);
        let headers = self.auth_headers()?;
        let body = serde_json::json!({
            "model": self.chat_model,
            "messages": messages,
        });

        let response = self
            .client
            .post(&url)
            .headers(headers)
            .json(&body)
            .send()
            .await
            .map_err(|e| {
                AiError::request(AiError::redact_message(
                    format!("chat request failed: {e}"),
                    Some(&self.api_key),
                ))
            })?;

        let status = response.status();
        let text = response.text().await.map_err(|e| {
            AiError::request(AiError::redact_message(
                format!("chat response read failed: {e}"),
                Some(&self.api_key),
            ))
        })?;

        if !status.is_success() {
            let msg = format!("chat request failed ({status}): {text}");
            return Err(AiError::request(AiError::redact_message(
                msg,
                Some(&self.api_key),
            )));
        }

        let parsed: ChatCompletionResponse = serde_json::from_str(&text).map_err(|e| {
            AiError::request(AiError::redact_message(
                format!("chat response parse failed: {e}"),
                Some(&self.api_key),
            ))
        })?;

        parsed
            .choices
            .into_iter()
            .next()
            .map(|c| c.message.content)
            .ok_or_else(|| AiError::request("chat response contained no choices"))
    }
}