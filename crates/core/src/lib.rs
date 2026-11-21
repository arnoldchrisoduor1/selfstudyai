//! Domain types for self-study-ai.
//!
//! No I/O. No dependency on any other workspace crate.
//! The Cargo package is named `core`. The lib is `study_core` because a
//! crate named `core` collides with Rust's standard `core` crate.

mod auth;
mod clock;
mod credits;
mod id;
mod learning;
mod question;
mod sync;

pub use auth::*;
pub use clock::*;
pub use credits::*;
pub use id::new_id;
pub use learning::*;
pub use question::*;
pub use sync::*;

use serde::{Deserialize, Serialize};

fn trimmed(value: String) -> String {
    value.trim().to_owned()
}

fn optional_text(value: Option<String>) -> Option<String> {
    value.and_then(|text| {
        let trimmed = text.trim().to_owned();
        if trimmed.is_empty() {
            None
        } else {
            Some(trimmed)
        }
    })
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct LocalProfile {
    pub id: String,
    pub display_name: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct NewLocalProfile {
    pub display_name: String,
}

impl NewLocalProfile {
    pub fn normalized(self) -> Result<Self, &'static str> {
        let display_name = trimmed(self.display_name);
        if display_name.is_empty() {
            return Err("display_name required");
        }
        Ok(Self { display_name })
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct Subject {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct NewSubject {
    pub name: String,
    pub description: Option<String>,
}

impl NewSubject {
    pub fn normalized(self) -> Result<Self, &'static str> {
        let name = trimmed(self.name);
        if name.is_empty() {
            return Err("name required");
        }
        Ok(Self {
            name,
            description: optional_text(self.description),
        })
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct Setting {
    pub id: String,
    pub key: String,
    pub value: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct NewSetting {
    pub key: String,
    pub value: String,
}

impl NewSetting {
    pub fn normalized(self) -> Result<Self, &'static str> {
        let key = trimmed(self.key);
        if key.is_empty() {
            return Err("key required");
        }
        Ok(Self {
            key,
            value: self.value,
        })
    }
}

/// Schema-only records. Repositories land when those features do.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct Goal {
    pub id: String,
    pub subject_id: String,
    pub title: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum SourceKind {
    Notes,
    Book,
}

impl SourceKind {
    pub fn as_str(self) -> &'static str {
        match self {
            Self::Notes => "notes",
            Self::Book => "book",
        }
    }

    pub fn parse(value: &str) -> Result<Self, &'static str> {
        match value {
            "notes" => Ok(Self::Notes),
            "book" => Ok(Self::Book),
            _ => Err("kind must be notes or book"),
        }
    }
}

impl std::fmt::Display for SourceKind {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.write_str(self.as_str())
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum SourceStatus {
    Pending,
    Processing,
    Ready,
    Failed,
}

impl SourceStatus {
    pub fn as_str(self) -> &'static str {
        match self {
            Self::Pending => "pending",
            Self::Processing => "processing",
            Self::Ready => "ready",
            Self::Failed => "failed",
        }
    }

    pub fn parse(value: &str) -> Result<Self, &'static str> {
        match value {
            "pending" => Ok(Self::Pending),
            "processing" => Ok(Self::Processing),
            "ready" => Ok(Self::Ready),
            "failed" => Ok(Self::Failed),
            _ => Err("invalid source status"),
        }
    }
}

impl std::fmt::Display for SourceStatus {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.write_str(self.as_str())
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct Source {
    pub id: String,
    pub subject_id: String,
    pub title: String,
    pub kind: String,
    pub file_name: String,
    pub content_hash: String,
    pub status: String,
    pub error: Option<String>,
    pub progress: i32,
    pub needs_reembed: bool,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct NewSource {
    pub subject_id: String,
    pub title: String,
    pub kind: String,
    pub file_name: String,
    pub content_hash: String,
}

impl NewSource {
    pub fn normalized(self) -> Result<Self, &'static str> {
        let subject_id = trimmed(self.subject_id);
        let title = trimmed(self.title);
        let file_name = trimmed(self.file_name);
        let content_hash = trimmed(self.content_hash);
        if subject_id.is_empty() {
            return Err("subject_id required");
        }
        if title.is_empty() {
            return Err("title required");
        }
        if file_name.is_empty() {
            return Err("file_name required");
        }
        if content_hash.is_empty() {
            return Err("content_hash required");
        }
        let kind = SourceKind::parse(self.kind.trim())?.as_str().to_owned();
        Ok(Self {
            subject_id,
            title,
            kind,
            file_name,
            content_hash,
        })
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct Topic {
    pub id: String,
    pub source_id: String,
    pub parent_id: Option<String>,
    pub title: String,
    pub position: i32,
    pub is_core: bool,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct UpdateTopic {
    pub title: Option<String>,
    pub position: Option<i32>,
    pub is_core: Option<bool>,
}

impl UpdateTopic {
    pub fn normalized(self) -> Result<Self, &'static str> {
        let title = match self.title {
            Some(value) => {
                let trimmed = trimmed(value);
                if trimmed.is_empty() {
                    return Err("title required");
                }
                Some(trimmed)
            }
            None => None,
        };
        Ok(Self {
            title,
            position: self.position,
            is_core: self.is_core,
        })
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct Chunk {
    pub id: String,
    pub source_id: String,
    pub topic_id: String,
    pub position: i32,
    pub text: String,
    pub token_count: i32,
    pub page_ref: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct ChunkEmbedding {
    pub id: String,
    pub chunk_id: String,
    pub provider_model: String,
    pub dimensions: i32,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum AiProviderKind {
    OpenAiCompatible,
    Ollama,
    Mock,
}

impl AiProviderKind {
    pub fn as_str(self) -> &'static str {
        match self {
            Self::OpenAiCompatible => "openai_compatible",
            Self::Ollama => "ollama",
            Self::Mock => "mock",
        }
    }

    pub fn parse(value: &str) -> Result<Self, &'static str> {
        match value {
            "openai_compatible" => Ok(Self::OpenAiCompatible),
            "ollama" => Ok(Self::Ollama),
            "mock" => Ok(Self::Mock),
            _ => Err("kind must be openai_compatible, ollama, or mock"),
        }
    }
}

impl std::fmt::Display for AiProviderKind {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.write_str(self.as_str())
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct AiProvider {
    pub id: String,
    pub name: String,
    pub kind: String,
    pub base_url: Option<String>,
    pub has_api_key: bool,
    pub api_key_hint: Option<String>,
    pub chat_model: String,
    pub embedding_model: String,
    pub embedding_dimensions: i32,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct NewAiProvider {
    pub name: String,
    pub kind: String,
    pub base_url: Option<String>,
    pub api_key: Option<String>,
    pub chat_model: String,
    pub embedding_model: String,
    pub embedding_dimensions: i32,
}

impl NewAiProvider {
    pub fn normalized(self) -> Result<Self, &'static str> {
        let name = trimmed(self.name);
        let chat_model = trimmed(self.chat_model);
        let embedding_model = trimmed(self.embedding_model);
        if name.is_empty() {
            return Err("name required");
        }
        if chat_model.is_empty() {
            return Err("chat_model required");
        }
        if embedding_model.is_empty() {
            return Err("embedding_model required");
        }
        if self.embedding_dimensions <= 0 {
            return Err("embedding_dimensions must be positive");
        }
        let kind = AiProviderKind::parse(self.kind.trim())?.as_str().to_owned();
        Ok(Self {
            name,
            kind,
            base_url: optional_text(self.base_url),
            api_key: optional_text(self.api_key),
            chat_model,
            embedding_model,
            embedding_dimensions: self.embedding_dimensions,
        })
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct UpdateAiProvider {
    pub name: Option<String>,
    pub base_url: Option<String>,
    pub api_key: Option<String>,
    pub clear_api_key: Option<bool>,
    pub chat_model: Option<String>,
    pub embedding_model: Option<String>,
    pub embedding_dimensions: Option<i32>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct SearchQuery {
    pub query: String,
    pub subject_id: Option<String>,
    pub source_id: Option<String>,
    pub topic_id: Option<String>,
    pub limit: Option<i32>,
}

impl SearchQuery {
    pub fn normalized(self) -> Result<Self, &'static str> {
        let query = trimmed(self.query);
        if query.is_empty() {
            return Err("query required");
        }
        let limit = self.limit.unwrap_or(10).clamp(1, 50);
        Ok(Self {
            query,
            subject_id: optional_text(self.subject_id),
            source_id: optional_text(self.source_id),
            topic_id: optional_text(self.topic_id),
            limit: Some(limit),
        })
    }
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct SearchHit {
    pub chunk_id: String,
    pub source_id: String,
    pub source_title: String,
    pub topic_id: String,
    pub topic_title: String,
    pub page_ref: Option<String>,
    pub text: String,
    pub score: f32,
}
