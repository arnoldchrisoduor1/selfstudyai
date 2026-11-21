use async_trait::async_trait;
use serde::{Deserialize, Serialize};

use crate::error::QuestionsError;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WebSearchHit {
    pub url: String,
    pub title: String,
    pub excerpt: String,
}

#[async_trait]
pub trait WebSearchProvider: Send + Sync {
    async fn search(&self, query: &str, limit: usize) -> Result<Vec<WebSearchHit>, QuestionsError>;
}

pub struct MockWebSearchProvider {
    hits: Vec<WebSearchHit>,
}

impl MockWebSearchProvider {
    pub fn new() -> Self {
        Self {
            hits: vec![WebSearchHit {
                url: "https://example.com/osmosis".into(),
                title: "Osmosis overview".into(),
                excerpt: "Osmosis is the movement of water across a semipermeable membrane.".into(),
            }],
        }
    }

    pub fn with_hits(hits: Vec<WebSearchHit>) -> Self {
        Self { hits }
    }
}

impl Default for MockWebSearchProvider {
    fn default() -> Self {
        Self::new()
    }
}

#[async_trait]
impl WebSearchProvider for MockWebSearchProvider {
    async fn search(&self, query: &str, limit: usize) -> Result<Vec<WebSearchHit>, QuestionsError> {
        let q = query.to_lowercase();
        let mut hits: Vec<_> = self
            .hits
            .iter()
            .filter(|h| {
                h.title.to_lowercase().contains(&q)
                    || h.excerpt.to_lowercase().contains(&q)
                    || q.split_whitespace().any(|w| h.excerpt.to_lowercase().contains(w))
            })
            .cloned()
            .collect();
        if hits.is_empty() {
            hits = self.hits.clone();
        }
        hits.truncate(limit.max(1));
        Ok(hits)
    }
}

/// Generic HTTP web search. Expects JSON `{ "results": [ { "url", "title", "excerpt" } ] }`.
pub struct HttpWebSearchProvider {
    endpoint: String,
    api_key: Option<String>,
    client: reqwest::Client,
}

impl HttpWebSearchProvider {
    pub fn new(endpoint: String, api_key: Option<String>) -> Result<Self, QuestionsError> {
        let endpoint = endpoint.trim().to_owned();
        if endpoint.is_empty() {
            return Err(QuestionsError::Invalid("endpoint required"));
        }
        let client = reqwest::Client::builder()
            .timeout(std::time::Duration::from_secs(15))
            .build()
            .map_err(|e| QuestionsError::WebSearch(e.to_string()))?;
        Ok(Self {
            endpoint,
            api_key,
            client,
        })
    }
}

#[derive(Debug, Deserialize)]
struct HttpSearchResponse {
    results: Vec<WebSearchHit>,
}

#[async_trait]
impl WebSearchProvider for HttpWebSearchProvider {
    async fn search(&self, query: &str, limit: usize) -> Result<Vec<WebSearchHit>, QuestionsError> {
        let mut req = self.client.get(&self.endpoint).query(&[
            ("q", query),
            ("limit", &limit.to_string()),
        ]);
        if let Some(key) = &self.api_key {
            req = req.bearer_auth(key);
        }
        let response = req
            .send()
            .await
            .map_err(|e| QuestionsError::WebSearch(e.to_string()))?;
        if !response.status().is_success() {
            return Err(QuestionsError::WebSearch(format!(
                "status {}",
                response.status()
            )));
        }
        let body: HttpSearchResponse = response
            .json()
            .await
            .map_err(|e| QuestionsError::WebSearch(e.to_string()))?;
        let mut results = body.results;
        results.truncate(limit.max(1));
        // Never store full pages — excerpts only (caller responsibility; we truncate here).
        for hit in &mut results {
            if hit.excerpt.chars().count() > 400 {
                hit.excerpt = hit.excerpt.chars().take(400).collect();
            }
        }
        Ok(results)
    }
}
