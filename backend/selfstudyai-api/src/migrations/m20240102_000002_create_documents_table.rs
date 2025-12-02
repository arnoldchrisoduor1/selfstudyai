use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .create_table(
                Table::create()
                    .table(Document::Table)
                    .if_not_exists()
                    .col(
                        ColumnDef::new(Document::Id)
                            .uuid()
                            .not_null()
                            .primary_key(),
                    )
                    .col(ColumnDef::new(Document::UserId).uuid().not_null())
                    .col(ColumnDef::new(Document::Title).string().not_null())
                    .col(ColumnDef::new(Document::FileName).string().not_null())
                    .col(ColumnDef::new(Document::FileUrl).string().not_null())
                    .col(ColumnDef::new(Document::FileSize).integer().not_null())
                    .col(ColumnDef::new(Document::PageCount).integer())
                    .col(ColumnDef::new(Document::ProcessingStatus).string().not_null())
                    .col(ColumnDef::new(Document::ExtractedText).text())
                    .col(
                        ColumnDef::new(Document::CreatedAt)
                            .timestamp()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .col(
                        ColumnDef::new(Document::UpdatedAt)
                            .timestamp()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_document_user")
                            .from(Document::Table, Document::UserId)
                            .to(User::Table, User::Id)
                            .on_delete(ForeignKeyAction::Cascade),
                    )
                    .to_owned(),
            )
            .await
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(Table::drop().table(Document::Table).to_owned())
            .await
    }
}

#[derive(DeriveIden)]
enum Document {
    Table,
    Id,
    UserId,
    Title,
    FileName,
    FileUrl,
    FileSize,
    PageCount,
    ProcessingStatus,
    ExtractedText,
    CreatedAt,
    UpdatedAt,
}

#[derive(DeriveIden)]
enum User {
    Table,
    Id,
}