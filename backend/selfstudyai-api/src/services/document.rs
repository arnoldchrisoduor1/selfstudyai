use anyhow::Result;
use chrono::Utc;
use sea_orm::{ActiveModelTrait, DatabaseConnection, EntityTrait, Set, QueryFilter, ColumnTrait};
use uuid::Uuid;

use crate::entities::{document, document_chunk};
use crate::services::pdf::PdfService;

pub struct DocumentService;

impl DocumentService {
    /// Create a new document record
    pub async fn create_document(
        db: &DatabaseConnection,
        user_id: Uuid,
        title: String,
        file_name: String,
        file_url: String,
        file_size: i32,
    ) -> Result<document::Model> {
        let document_id = Uuid::new_v4();
        let now = Utc::now().naive_utc();

        let new_document = document::ActiveModel {
            id: Set(document_id),
            user_id: Set(user_id),
            title: Set(title),
            file_name: Set(file_name),
            file_url: Set(file_url),
            file_size: Set(file_size),
            page_count: Set(None),
            processing_status: Set("pending".to_string()),
            extracted_text: Set(None),
            created_at: Set(now),
            updated_at: Set(now),
        };

        let document = new_document.insert(db).await?;
        Ok(document)
    }

    /// Process PDF: extract text and create chunks
    pub async fn process_pdf(
        db: &DatabaseConnection,
        document_id: Uuid,
        pdf_bytes: &[u8],
    ) -> Result<()> {
        // Extract text
        let text = PdfService::extract_text(pdf_bytes)?;
        let page_count = PdfService::get_page_count(pdf_bytes)?;

        // Update document with extracted text
        let doc = document::Entity::find_by_id(document_id)
            .one(db)
            .await?
            .ok_or_else(|| anyhow::anyhow!("Document not found"))?;

        let mut doc: document::ActiveModel = doc.into();
        doc.extracted_text = Set(Some(text.clone()));
        doc.page_count = Set(Some(page_count));
        doc.processing_status = Set("processing".to_string());
        doc.updated_at = Set(Utc::now().naive_utc());
        doc.update(db).await?;

        // Chunk text (500 words per chunk, 50 word overlap)
        let chunks = PdfService::chunk_text(&text, 500, 50);

        // Save chunks to database
        for (index, chunk_content) in chunks.iter().enumerate() {
            let token_count = PdfService::estimate_tokens(chunk_content);

            let new_chunk = document_chunk::ActiveModel {
                id: Set(Uuid::new_v4()),
                document_id: Set(document_id),
                chunk_index: Set(index as i32),
                content: Set(chunk_content.clone()),
                token_count: Set(Some(token_count)),
                created_at: Set(Utc::now().naive_utc()),
            };

            new_chunk.insert(db).await?;
        }

        // Mark as completed
        let doc = document::Entity::find_by_id(document_id)
            .one(db)
            .await?
            .ok_or_else(|| anyhow::anyhow!("Document not found"))?;

        let mut doc: document::ActiveModel = doc.into();
        doc.processing_status = Set("completed".to_string());
        doc.updated_at = Set(Utc::now().naive_utc());
        doc.update(db).await?;

        Ok(())
    }

    /// Get user's documents
    pub async fn get_user_documents(
        db: &DatabaseConnection,
        user_id: Uuid,
    ) -> Result<Vec<document::Model>> {
        let documents = document::Entity::find()
            .filter(document::Column::UserId.eq(user_id))
            .all(db)
            .await?;

        Ok(documents)
    }

    /// Get document by ID
    pub async fn get_document_by_id(
        db: &DatabaseConnection,
        document_id: Uuid,
        user_id: Uuid,
    ) -> Result<Option<document::Model>> {
        let document = document::Entity::find()
            .filter(document::Column::Id.eq(document_id))
            .filter(document::Column::UserId.eq(user_id))
            .one(db)
            .await?;

        Ok(document)
    }
}