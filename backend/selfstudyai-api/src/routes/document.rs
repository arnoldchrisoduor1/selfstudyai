use axum::{
    extract::{Extension, State},
    http::StatusCode,
    Json,
    response::IntoResponse,
};
use uuid::Uuid;

use crate::dto::auth::ErrorResponse;
use crate::dto::document::{
    DocumentListResponse, DocumentResponse, SearchRequest, SearchResponse, SearchResultItem,
    UploadDocumentRequest,
};
use crate::services::document::DocumentService;
use crate::AppState;

pub async fn upload_document(
    State(state): State<AppState>,
    Extension(user_id): Extension<Uuid>,
    Json(payload): Json<UploadDocumentRequest>,
) -> impl IntoResponse {
    // Create document record
    match DocumentService::create_document(
        &state.db,
        user_id,
        payload.title,
        payload.file_name,
        payload.file_url.clone(),
        payload.file_size,
    )
    .await
    {
        Ok(document) => {
            // Spawn background task to process PDF
            let db = state.db.clone();
            let embeddings_service = state.embeddings_service.clone();
            let vector_db = state.vector_db.clone();
            let document_id = document.id;
            let file_url = payload.file_url.clone();

            tokio::spawn(async move {
                // Download PDF from Vercel Blob
                if let Ok(response) = reqwest::get(&file_url).await {
                    if let Ok(pdf_bytes) = response.bytes().await {
                        // Process PDF
                        if let Err(e) = DocumentService::process_pdf(
                            &db,
                            &embeddings_service,
                            &vector_db,
                            document_id,
                            &pdf_bytes,
                        )
                        .await
                        {
                            tracing::error!("Failed to process PDF: {}", e);
                        }
                    }
                }
            });

            let response = DocumentResponse {
                id: document.id.to_string(),
                title: document.title,
                file_name: document.file_name,
                file_url: document.file_url,
                file_size: document.file_size,
                page_count: document.page_count,
                processing_status: document.processing_status,
                created_at: document.created_at.to_string(),
            };

            (StatusCode::CREATED, Json(response)).into_response()
        }
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ErrorResponse {
                error: format!("Failed to create document: {}", e),
            }),
        )
            .into_response(),
    }
}

pub async fn get_documents(
    State(state): State<AppState>,
    Extension(user_id): Extension<Uuid>,
) -> impl IntoResponse {
    match DocumentService::get_user_documents(&state.db, user_id).await {
        Ok(documents) => {
            let response = DocumentListResponse {
                documents: documents
                    .into_iter()
                    .map(|doc| DocumentResponse {
                        id: doc.id.to_string(),
                        title: doc.title,
                        file_name: doc.file_name,
                        file_url: doc.file_url,
                        file_size: doc.file_size,
                        page_count: doc.page_count,
                        processing_status: doc.processing_status,
                        created_at: doc.created_at.to_string(),
                    })
                    .collect(),
            };

            (StatusCode::OK, Json(response)).into_response()
        }
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ErrorResponse {
                error: format!("Failed to fetch documents: {}", e),
            }),
        )
            .into_response(),
    }
}

pub async fn search_documents(
    State(state): State<AppState>,
    Extension(_user_id): Extension<Uuid>,
    Json(payload): Json<SearchRequest>,
) -> impl IntoResponse {
    // Generate embedding for query
    let query_embedding = match state
        .embeddings_service
        .generate_embedding(payload.query.clone())
        .await
    {
        Ok(emb) => emb,
        Err(e) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ErrorResponse {
                    error: format!("Failed to generate query embedding: {}", e),
                }),
            )
                .into_response();
        }
    };

    // Parse document_id if provided
    let document_id = if let Some(doc_id_str) = payload.document_id {
        match Uuid::parse_str(&doc_id_str) {
            Ok(id) => Some(id),
            Err(_) => {
                return (
                    StatusCode::BAD_REQUEST,
                    Json(ErrorResponse {
                        error: "Invalid document_id format".to_string(),
                    }),
                )
                    .into_response();
            }
        }
    } else {
        None
    };

    // Search in vector database
    match state
        .vector_db
        .search(query_embedding, payload.limit, document_id)
        .await
    {
        Ok(results) => {
            let response = SearchResponse {
                results: results
                    .into_iter()
                    .map(|r| SearchResultItem {
                        document_id: r.document_id,
                        chunk_id: r.chunk_id,
                        content: r.content,
                        score: r.score,
                    })
                    .collect(),
            };

            (StatusCode::OK, Json(response)).into_response()
        }
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ErrorResponse {
                error: format!("Search failed: {}", e),
            }),
        )
            .into_response(),
    }
}