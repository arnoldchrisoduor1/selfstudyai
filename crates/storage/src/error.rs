use sea_orm::DbErr;
use thiserror::Error;

#[derive(Debug, Error)]
pub enum StorageError {
    #[error("{0}")]
    Invalid(&'static str),
    #[error("conflict")]
    Conflict,
    #[error("database directory create failed")]
    Directory(#[source] std::io::Error),
    #[error("database connection failed")]
    Connect(#[source] DbErr),
    #[error("database migration failed")]
    Migrate(#[source] DbErr),
    #[error("database query failed")]
    Query(#[source] DbErr),
}

pub(crate) fn map_query(err: DbErr) -> StorageError {
    let text = err.to_string();
    if text.contains("UNIQUE") || text.contains("unique") {
        StorageError::Conflict
    } else {
        StorageError::Query(err)
    }
}
