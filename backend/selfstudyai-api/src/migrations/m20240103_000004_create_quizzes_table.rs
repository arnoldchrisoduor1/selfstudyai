use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .create_table(
                Table::create()
                    .table(Quiz::Table)
                    .if_not_exists()
                    .col(
                        ColumnDef::new(Quiz::Id)
                            .uuid()
                            .not_null()
                            .primary_key(),
                    )
                    .col(ColumnDef::new(Quiz::DocumentId).uuid().not_null())
                    .col(ColumnDef::new(Quiz::UserId).uuid().not_null())
                    .col(ColumnDef::new(Quiz::Title).string().not_null())
                    .col(ColumnDef::new(Quiz::Questions).json().not_null())
                    .col(ColumnDef::new(Quiz::TotalQuestions).integer().not_null())
                    .col(
                        ColumnDef::new(Quiz::CreatedAt)
                            .timestamp()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_quiz_document")
                            .from(Quiz::Table, Quiz::DocumentId)
                            .to(Document::Table, Document::Id)
                            .on_delete(ForeignKeyAction::Cascade),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_quiz_user")
                            .from(Quiz::Table, Quiz::UserId)
                            .to(User::Table, User::Id)
                            .on_delete(ForeignKeyAction::Cascade),
                    )
                    .to_owned(),
            )
            .await
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(Table::drop().table(Quiz::Table).to_owned())
            .await
    }
}

#[derive(DeriveIden)]
enum Quiz {
    Table,
    Id,
    DocumentId,
    UserId,
    Title,
    Questions,
    TotalQuestions,
    CreatedAt,
}

#[derive(DeriveIden)]
enum Document {
    Table,
    Id,
}

#[derive(DeriveIden)]
enum User {
    Table,
    Id,
}