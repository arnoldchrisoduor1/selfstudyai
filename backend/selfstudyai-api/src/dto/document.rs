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