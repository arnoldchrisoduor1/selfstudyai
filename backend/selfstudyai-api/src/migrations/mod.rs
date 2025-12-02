use sea_orm_migration::prelude::*;

pub mod m20240101_000001_create_users_table;
pub mod m20240102_000002_create_documents_table;
pub mod m20240102_000003_create_document_chunks_table;

pub struct Migrator;

#[async_trait::async_trait]
impl MigratorTrait for Migrator {
    fn migrations() -> Vec<Box<dyn MigrationTrait>> {
        vec![
            Box::new(m20240101_000001_create_users_table::Migration),
            Box::new(m20240102_000002_create_documents_table::Migration),
            Box::new(m20240102_000003_create_document_chunks_table::Migration),
        ]
    }
}