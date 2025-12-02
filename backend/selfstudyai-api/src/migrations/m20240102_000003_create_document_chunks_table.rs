use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .create_table(
                Table::create()
                    .table(DocumentChunk::Table)
                    .if_not_exists()
                    .col(
                        ColumnDef::new(DocumentChunk::Id)
                            .uuid()
                            .not_null()
                            .primary_key(),
                    )
                    .col(ColumnDef::new(DocumentChunk::DocumentId).uuid().not_null())
                    .col(ColumnDef::new(DocumentChunk::ChunkIndex).integer().not_null())
                    .col(ColumnDef::new(DocumentChunk::Content).text().not_null())
                    .col(ColumnDef::new(DocumentChunk::TokenCount).integer())
                    .col(
                        ColumnDef::new(DocumentChunk::CreatedAt)
                            .timestamp()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_chunk_document")
                            .from(DocumentChunk::Table, DocumentChunk::DocumentId)
                            .to(Document::Table, Document::Id)
                            .on_delete(ForeignKeyAction::Cascade),
                    )
                    .to_owned(),
            )
            .await?;

        // Create index for faster queries
        manager
            .create_index(
                Index::create()
                    .name("idx_chunk_document_id")
                    .table(DocumentChunk::Table)
                    .col(DocumentChunk::DocumentId)
                    .to_owned(),
            )
            .await
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(Table::drop().table(DocumentChunk::Table).to_owned())
            .await
    }
}

#[derive(DeriveIden)]
enum DocumentChunk {
    Table,
    Id,
    DocumentId,
    ChunkIndex,
    Content,
    TokenCount,
    CreatedAt,
}

#[derive(DeriveIden)]
enum Document {
    Table,
    Id,
}