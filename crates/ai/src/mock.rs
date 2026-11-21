use async_trait::async_trait;
use sha2::{Digest, Sha256};

use crate::error::AiError;
use crate::provider::Provider;
use crate::types::ChatMessage;

pub struct MockProvider {
    embedding_dimensions: usize,
}

impl MockProvider {
    pub fn new(embedding_dimensions: usize) -> Result<Self, AiError> {
        if embedding_dimensions == 0 {
            return Err(AiError::config("embedding_dimensions must be greater than zero"));
        }
        Ok(Self {
            embedding_dimensions,
        })
    }

    fn embed_one(text: &str, dimensions: usize) -> Vec<f32> {
        let hash = Sha256::digest(text.as_bytes());
        let mut out = Vec::with_capacity(dimensions);
        for i in 0..dimensions {
            let byte = hash[i % hash.len()];
            // Map byte to (-1, 1) deterministically.
            let value = (byte as f32 / 127.5) - 1.0;
            out.push(value);
        }
        out
    }

    fn extract_chunk_ids(content: &str) -> Vec<String> {
        let mut ids = Vec::new();
        let mut rest = content;
        while let Some(idx) = rest.find("chunk_id=") {
            let after = &rest[idx + "chunk_id=".len()..];
            let end = after
                .find(|c: char| c.is_whitespace() || c == '\n')
                .unwrap_or(after.len());
            let id = after[..end].trim().to_owned();
            if !id.is_empty() {
                ids.push(id);
            }
            rest = &after[end..];
        }
        if ids.is_empty() {
            ids.push("mock-chunk".into());
        }
        ids
    }

    fn extract_url(content: &str) -> (String, String) {
        if let Some(idx) = content.find("url=") {
            let after = &content[idx + 4..];
            let end = after.find('\n').unwrap_or(after.len());
            let url = after[..end].trim().to_owned();
            let excerpt = after
                .get(end..)
                .unwrap_or("")
                .lines()
                .map(str::trim)
                .find(|l| !l.is_empty() && !l.starts_with("<<<"))
                .unwrap_or("Mock online excerpt about the topic.")
                .chars()
                .take(200)
                .collect();
            return (url, excerpt);
        }
        (
            "https://example.com/mock".into(),
            "Mock online excerpt about the topic.".into(),
        )
    }

    fn count_requested(content: &str) -> usize {
        content
            .lines()
            .find_map(|line| {
                line.strip_prefix("Count:")
                    .and_then(|v| v.trim().parse().ok())
            })
            .unwrap_or(4)
            .clamp(1, 20)
    }

    fn generate_questions_json(messages: &[ChatMessage]) -> String {
        let joined = messages
            .iter()
            .map(|m| m.content.as_str())
            .collect::<Vec<_>>()
            .join("\n");
        let count = Self::count_requested(&joined);
        let online = joined.contains("Grounding mode: online");
        let chunk_ids = Self::extract_chunk_ids(&joined);
        let (url, excerpt) = Self::extract_url(&joined);
        let levels = ["recall", "understand", "apply", "analyze"];
        let mut questions = Vec::new();
        for i in 0..count {
            let level = levels[i % levels.len()];
            let stem = format!(
                "Mock question {} ({level}): unique-topic-{} — what is the key idea?",
                i + 1,
                i * 17 + 3
            );
            if i % 2 == 0 {
                if online {
                    questions.push(serde_json::json!({
                        "kind": "mcq",
                        "cognitive_level": level,
                        "stem": stem,
                        "options": ["Option A", "Option B", "Option C", "Option D"],
                        "correct_option": "Option A",
                        "explanation": "Mock explanation",
                        "citations": { "url": url, "excerpt": excerpt }
                    }));
                } else {
                    let chunk_id = &chunk_ids[i % chunk_ids.len()];
                    questions.push(serde_json::json!({
                        "kind": "mcq",
                        "cognitive_level": level,
                        "stem": stem,
                        "options": ["Option A", "Option B", "Option C", "Option D"],
                        "correct_option": "Option A",
                        "explanation": "Mock explanation",
                        "citations": { "chunk_ids": [chunk_id] }
                    }));
                }
            } else if online {
                questions.push(serde_json::json!({
                    "kind": "written",
                    "cognitive_level": level,
                    "stem": stem,
                    "model_answer": "Mock model answer covering key points.",
                    "explanation": "Mock explanation",
                    "citations": { "url": url, "excerpt": excerpt }
                }));
            } else {
                let chunk_id = &chunk_ids[i % chunk_ids.len()];
                questions.push(serde_json::json!({
                    "kind": "written",
                    "cognitive_level": level,
                    "stem": stem,
                    "model_answer": "Mock model answer covering key points.",
                    "explanation": "Mock explanation",
                    "citations": { "chunk_ids": [chunk_id] }
                }));
            }
        }
        serde_json::json!({ "questions": questions }).to_string()
    }

    fn grade_json(messages: &[ChatMessage]) -> String {
        let learner = messages
            .iter()
            .rev()
            .find_map(|m| {
                m.content
                    .split("Learner answer:")
                    .nth(1)
                    .map(|s| s.trim().to_lowercase())
            })
            .unwrap_or_default();
        let (score, verdict, corrections, additions, confidence) =
            if learner.contains("perfect") || learner.contains("key points") {
                (
                    1.0,
                    "correct",
                    Vec::<&str>::new(),
                    Vec::<&str>::new(),
                    0.9,
                )
            } else if learner.contains("partial") {
                (
                    0.5,
                    "partial",
                    vec!["Incomplete reasoning"],
                    vec!["Add the definition"],
                    0.7,
                )
            } else {
                (
                    0.2,
                    "incorrect",
                    vec!["Missed the core idea"],
                    vec!["Include the main mechanism"],
                    0.85,
                )
            };
        serde_json::json!({
            "score": score,
            "verdict": verdict,
            "corrections": corrections,
            "additions": additions,
            "missing_points": additions,
            "confidence": confidence
        })
        .to_string()
    }
}

#[async_trait]
impl Provider for MockProvider {
    async fn embed(&self, texts: &[String]) -> Result<Vec<Vec<f32>>, AiError> {
        Ok(texts
            .iter()
            .map(|t| Self::embed_one(t, self.embedding_dimensions))
            .collect())
    }

    async fn chat(&self, messages: &[ChatMessage]) -> Result<String, AiError> {
        let joined = messages
            .iter()
            .map(|m| m.content.as_str())
            .collect::<Vec<_>>()
            .join("\n");
        if joined.contains("TASK: generate_questions") {
            return Ok(Self::generate_questions_json(messages));
        }
        if joined.contains("TASK: grade_answer") {
            return Ok(Self::grade_json(messages));
        }
        let last = messages
            .last()
            .map(|m| m.content.as_str())
            .unwrap_or("(no messages)");
        Ok(format!("Mock reply to: {last}"))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn embed_is_deterministic() {
        let p = MockProvider::new(32).unwrap();
        let texts = vec!["hello".to_string()];
        let a = p.embed(&texts).await.unwrap();
        let b = p.embed(&texts).await.unwrap();
        assert_eq!(a, b);
        assert_eq!(a[0].len(), 32);
    }

    #[tokio::test]
    async fn different_texts_differ() {
        let p = MockProvider::new(32).unwrap();
        let a = p.embed(&["alpha".to_string()]).await.unwrap();
        let b = p.embed(&["beta".to_string()]).await.unwrap();
        assert_ne!(a[0], b[0]);
    }

    #[tokio::test]
    async fn chat_returns_non_empty() {
        let p = MockProvider::new(32).unwrap();
        let reply = p
            .chat(&[ChatMessage {
                role: "user".to_string(),
                content: "Hi".to_string(),
            }])
            .await
            .unwrap();
        assert!(!reply.is_empty());
    }

    #[tokio::test]
    async fn chat_returns_generation_json() {
        let p = MockProvider::new(32).unwrap();
        let reply = p
            .chat(&[
                ChatMessage {
                    role: "system".into(),
                    content: "TASK: generate_questions".into(),
                },
                ChatMessage {
                    role: "user".into(),
                    content: "Grounding mode: notes\nCount: 2\nchunk_id=c1\n".into(),
                },
            ])
            .await
            .unwrap();
        assert!(reply.contains("questions"));
        assert!(reply.contains("chunk_ids"));
    }
}
