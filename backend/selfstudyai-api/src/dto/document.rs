use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize)]
pub struct UploadDocumentRequest {
    pub title: String,
    pub file_url: String, // Vercel Blob URL
    pub file_name: String,
    pub file_size: i32,
}

#[derive(Debug, Serialize)]
pub struct DocumentResponse {
    pub id: String,
    pub title: String,
    pub file_name: String,
    pub file_url: String,
    pub file_size: i32,
    pub page_count: Option<i32>,
    pub processing_status: String,
    pub created_at: String,
}

#[derive(Debug, Serialize)]
pub struct DocumentListResponse {
    pub documents: Vec<DocumentResponse>,
}

#[derive(Debug, Deserialize)]
pub struct SearchRequest {
    pub query: String,
    pub document_id: Option<String>, // Optional: search within specific document
    #[serde(default = "default_limit")]
    pub limit: u64,
}

fn default_limit() -> u64 {
    5
}

#[derive(Debug, Serialize)]
pub struct SearchResponse {
    pub results: Vec<SearchResultItem>,
}

#[derive(Debug, Serialize)]
pub struct SearchResultItem {
    pub document_id: String,
    pub chunk_id: String,
    pub content: String,
    pub score: f32,
}