use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .create_table(
                Table::create()
                    .table(QuizAttempt::Table)
                    .if_not_exists()
                    .col(
                        ColumnDef::new(QuizAttempt::Id)
                            .uuid()
                            .not_null()
                            .primary_key(),
                    )
                    .col(ColumnDef::new(QuizAttempt::QuizId).uuid().not_null())
                    .col(ColumnDef::new(QuizAttempt::UserId).uuid().not_null())
                    .col(ColumnDef::new(QuizAttempt::Answers).json().not_null())
                    .col(ColumnDef::new(QuizAttempt::Score).integer().not_null())
                    .col(ColumnDef::new(QuizAttempt::TotalQuestions).integer().not_null())
                    .col(
                        ColumnDef::new(QuizAttempt::CompletedAt)
                            .timestamp()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_attempt_quiz")
                            .from(QuizAttempt::Table, QuizAttempt::QuizId)
                            .to(Quiz::Table, Quiz::Id)
                            .on_delete(ForeignKeyAction::Cascade),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_attempt_user")
                            .from(QuizAttempt::Table, QuizAttempt::UserId)
                            .to(User::Table, User::Id)
                            .on_delete(ForeignKeyAction::Cascade),
                    )
                    .to_owned(),
            )
            .await
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(Table::drop().table(QuizAttempt::Table).to_owned())
            .await
    }
}

#[derive(DeriveIden)]
enum QuizAttempt {
    Table,
    Id,
    QuizId,
    UserId,
    Answers,
    Score,
    TotalQuestions,
    CompletedAt,
}

#[derive(DeriveIden)]
enum Quiz {
    Table,
    Id,
}

#[derive(DeriveIden)]
enum User {
    Table,
    Id,
}