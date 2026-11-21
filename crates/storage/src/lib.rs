//! SeaORM persistence. SQLite is the default URL scheme. A `postgres://` URL uses the same migrations and repositories.

mod auth_repos;
mod content_repos;
mod credits_repos;
mod entities;
mod error;
mod learning_repos;
mod migrator;
mod question_repos;
mod repos;
mod sync_engine;
mod sync_meta;
mod tenant;
mod vector;

pub use content_repos::{
    AiProviderRepository, AiProviderSecret, ChunkRepository, NewChunkRow, NewTopicRow,
    SearchRepository, SourceRepository, TopicRepository,
};
pub use error::StorageError;
pub use learning_repos::{
    ActivityIncrement, CardStateRepository, DailyActivityRepository, FinalTestRepository,
    IntegrityEventRepository, LearningSettingsRepository, NewFinalTestRow, NewPointsLedgerRow,
    NewReviewLogRow, PointsLedgerRepository, ReviewLogRepository, TestQuestionRepository,
};
pub use question_repos::{
    AttemptRepository, NewAttemptRow, QuestionRepository, QuestionSettingsRepository,
    StudySessionRepository, UsageEventRepository, WebSearchProviderRepository, WebSearchSecret,
};
pub use auth_repos::{AuthRepository, SESSION_KIND_BEARER, SESSION_KIND_COOKIE, TOKEN_KIND_RESET, TOKEN_KIND_VERIFY};
pub use credits_repos::CreditsRepository;
pub use repos::{LocalProfileRepository, SettingRepository, SubjectRepository};
pub use sync_engine::SyncEngine;
pub use tenant::{tenant_user_id, with_tenant_user, user_id_condition};
pub use study_core::{
    AiProvider, Attempt, Chunk, Goal, LocalProfile, NewAiProvider, NewLocalProfile, NewQuestion,
    NewSetting, NewSource, NewSubject, NewStudySession, NewUsageEvent, NewWebSearchProvider,
    Question, QuestionFilter, QuestionPublic, QuestionSettings, SearchHit, SearchQuery,
    SessionQuestion, Setting, Source, StudySession, Subject, Topic, UpdateAiProvider,
    UpdateQuestion, UpdateTopic, UpdateWebSearchProvider, WebSearchProvider,
};
pub use vector::{
    cosine_similarity, decode_f32_le, encode_f32_le, reciprocal_rank_fusion, VectorHit,
    VectorIndex, VectorRecord,
};

use async_trait::async_trait;
use sea_orm::{
    ConnectOptions, ConnectionTrait, Database, DatabaseBackend, DatabaseConnection, Statement,
};
use sea_orm_migration::MigratorTrait;
use std::sync::Arc;
use study_core::Clock;

use crate::migrator::Migrator;

#[derive(Clone)]
pub struct Store {
    pub(crate) db: DatabaseConnection,
    backend_name: &'static str,
    pub(crate) clock: Arc<dyn Clock>,
}

impl Store {
    pub fn clock(&self) -> Arc<dyn Clock> {
        self.clock.clone()
    }

    pub(crate) fn now(&self) -> String {
        self.clock.now_rfc3339()
    }

    pub fn db(&self) -> &DatabaseConnection {
        &self.db
    }
}

pub async fn connect(url: &str) -> Result<Store, StorageError> {
    let app_env = std::env::var("APP_ENV").unwrap_or_else(|_| "development".into());
    let (clock, _) = study_core::build_clock_handle(&app_env);
    connect_with_clock(url, clock).await
}

pub async fn connect_with_clock(
    url: &str,
    clock: Arc<dyn Clock>,
) -> Result<Store, StorageError> {
    ensure_sqlite_parent(url)?;
    let backend_name = if url.starts_with("postgres://") || url.starts_with("postgresql://") {
        "postgres"
    } else {
        "sqlite"
    };
    let mut options = ConnectOptions::new(url.to_owned());
    let max = if url.contains("memory") { 1 } else { 5 };
    options.max_connections(max).sqlx_logging(false);
    let db = Database::connect(options)
        .await
        .map_err(StorageError::Connect)?;
    Migrator::up(&db, None)
        .await
        .map_err(StorageError::Migrate)?;
    Ok(Store {
        db,
        backend_name,
        clock,
    })
}

fn ensure_sqlite_parent(url: &str) -> Result<(), StorageError> {
    let Some(rest) = url.strip_prefix("sqlite://") else {
        return Ok(());
    };
    if rest.starts_with(":memory:") {
        return Ok(());
    }
    let path = std::path::Path::new(path_from_sqlite(rest));
    if let Some(parent) = path.parent() {
        if !parent.as_os_str().is_empty() {
            std::fs::create_dir_all(parent).map_err(StorageError::Directory)?;
        }
    }
    Ok(())
}

fn path_from_sqlite(rest: &str) -> &str {
    rest.split('?').next().unwrap_or(rest)
}

#[async_trait]
pub trait Repository: Send + Sync {
    fn backend(&self) -> &'static str;
    async fn ping(&self) -> Result<(), StorageError>;
    async fn table_names(&self) -> Result<Vec<String>, StorageError>;
}

#[async_trait]
impl Repository for Store {
    fn backend(&self) -> &'static str {
        self.backend_name
    }

    async fn ping(&self) -> Result<(), StorageError> {
        self.db.ping().await.map_err(StorageError::Query)?;
        Ok(())
    }

    async fn table_names(&self) -> Result<Vec<String>, StorageError> {
        let backend = self.db.get_database_backend();
        let sql = match backend {
            DatabaseBackend::Postgres => {
                "SELECT table_name AS name FROM information_schema.tables WHERE table_schema = 'public'"
            }
            _ => "SELECT name FROM sqlite_master WHERE type IN ('table', 'view')",
        };
        let rows = self
            .db
            .query_all(Statement::from_string(backend, sql.to_owned()))
            .await
            .map_err(StorageError::Query)?;
        let mut names = Vec::new();
        for row in rows {
            let name = row
                .try_get::<String>("", "name")
                .map_err(StorageError::Query)?;
            names.push(name);
        }
        Ok(names)
    }
}
