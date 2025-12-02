use anyhow::{Context, Result};
use reqwest::{Client, StatusCode};
use serde::{Deserialize, Serialize};

// --- DTOs for HuggingFace API ---

// Request payload structure for the Inference API
#[derive(Serialize)]
pub struct EmbeddingRequest {
    // The text to be embedded
    pub inputs: String,
}

// Response structure from the Inference API
#[derive(Debug, Deserialize)]
pub struct EmbeddingResponse(pub Vec<Vec<f32>>);

pub struct EmbeddingService {
    client: Client,
    api_url: String,
    api_key: String,
}

impl EmbeddingService {
    // The embedding model you chose: sentence-transformers/all-MiniLM-L6-v2
    const MODEL_ID: &'static str = "sentence-transformers/all-MiniLM-L6-v2";

    pub fn new(api_key: String) -> Self {
        let api_url = format!(
            "https://api-inference.huggingface.co/models/{}",
            Self::MODEL_ID
        );
        EmbeddingService {
            client: Client::new(),
            api_url,
            api_key,
        }
    }

    /// Generates an embedding vector for a given text input.
    pub async fn get_embedding(&self, text: &str) -> Result<Vec<f32>> {
        let payload = EmbeddingRequest {
            inputs: text.to_string(),
        };

        // Call the HuggingFace API
        let response = self
            .client
            .post(&self.api_url)
            .header("Authorization", format!("Bearer {}", self.api_key))
            .json(&payload)
            .send()
            .await
            .context("Failed to send request to HuggingFace API")?;

        let status = response.status();

        if status == StatusCode::OK {
            // Success: Parse the JSON response
            let EmbeddingResponse(vectors) = response.json::<EmbeddingResponse>().await?;

            // The API returns a list of vectors (one per input, but we only send one)
            vectors.into_iter().next().context("API returned no vector")
        } else {
            // Error handling
            let error_text = response.text().await.unwrap_or_default();
            anyhow::bail!(
                "HuggingFace API failed with status: {}. Response: {}",
                status,
                error_text
            )
        }
    }
}