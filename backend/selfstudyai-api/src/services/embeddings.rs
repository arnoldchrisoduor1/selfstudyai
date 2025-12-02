use std::sync::Arc;

use anyhow::{Context, Result};
use reqwest::Client;
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize)]
struct EmbeddingRequest {
    inputs: Vec<String>,
}

#[derive(Debug, Deserialize)]
struct EmbeddingResponse(Vec<Vec<f32>>);

#[derive(Clone)]
pub struct EmbeddingsService {
    client: Arc<Client>,
    api_key: String,
    model: String,
}

impl EmbeddingsService {
    pub fn new(api_key: String) -> Self {
        // create a reqwest client here
        let client = Client::new();

        Self {
            client: Arc::new(client),
            api_key,
            model: "sentence-transformers/all-MiniLM-L6-v2".to_string(),
        }
    }

    /// Generate embeddings for a list of texts using HuggingFace API
    pub async fn generate_embeddings(&self, texts: Vec<String>) -> Result<Vec<Vec<f32>>> {
        let url = format!(
            "https://router.huggingface.co/hf-inference/models/{}/pipeline/feature-extraction",
            self.model
        );

        let request_body = EmbeddingRequest { inputs: texts };

        let response = self
            .client
            .post(&url)
            .header("Authorization", format!("Bearer {}", self.api_key))
            .json(&request_body)
            .send()
            .await
            .context("Failed to send request to HuggingFace API")?;

        if !response.status().is_success() {
            let error_text = response.text().await.unwrap_or_default();
            anyhow::bail!("HuggingFace API error: {}", error_text);
        }

        let embeddings: Vec<Vec<f32>> = response
            .json()
            .await
            .context("Failed to parse HuggingFace API response")?;

        Ok(embeddings)
    }

    /// Generate embedding for a single text
    pub async fn generate_embedding(&self, text: String) -> Result<Vec<f32>> {
        let embeddings = self.generate_embeddings(vec![text]).await?;
        embeddings
            .into_iter()
            .next()
            .ok_or_else(|| anyhow::anyhow!("No embedding returned"))
    }
}
