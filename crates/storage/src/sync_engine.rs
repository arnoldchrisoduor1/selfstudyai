use async_trait::async_trait;
use sea_orm::{ConnectionTrait, DatabaseBackend, Statement};
use serde_json::{Map, Value};
use study_core::{SyncPullResponse, SyncPushRequest, SyncPushResponse, SyncRecord};

use crate::error::{map_query, StorageError};
use crate::Store;

/// Editable domain rows merge by last-write-wins using monotonic `version`.
const EDITABLE_SYNC_TABLES: &[&str] = &[
    "subjects",
    "goals",
    "sources",
    "chunks",
    "settings",
    "topics",
    "questions",
];

/// Append-only events: first id wins; duplicates are idempotent accepts.
const APPEND_ONLY_SYNC_TABLES: &[&str] = &["attempts", "review_logs", "points_ledger"];

const SYNC_TABLES: &[&str] = &[
    "subjects",
    "goals",
    "sources",
    "chunks",
    "settings",
    "topics",
    "questions",
    "attempts",
    "review_logs",
    "points_ledger",
];

// `card_states` are intentionally excluded: FSRS state is recomputed from review_logs,
// not treated as authoritative sync payload (see `recompute_card_states`).

fn table_has_updated_at(table: &str) -> bool {
    !matches!(
        table,
        "questions" | "attempts" | "review_logs" | "points_ledger"
    )
}

fn pull_sql(table: &str, limit: u32) -> String {
    if table_has_updated_at(table) {
        format!(
            "SELECT * FROM {table} WHERE user_id = ?1 AND (updated_at > ?2 OR created_at > ?2) ORDER BY COALESCE(updated_at, created_at) LIMIT {limit}"
        )
    } else {
        format!(
            "SELECT * FROM {table} WHERE user_id = ?1 AND created_at > ?2 ORDER BY created_at LIMIT {limit}"
        )
    }
}

fn sync_table_kind(table: &str) -> Option<&'static str> {
    if EDITABLE_SYNC_TABLES.contains(&table) {
        Some("editable")
    } else if APPEND_ONLY_SYNC_TABLES.contains(&table) {
        Some("append")
    } else if SYNC_TABLES.contains(&table) {
        Some("unknown")
    } else {
        None
    }
}

fn row_to_sync_record(table: &str, row: &sea_orm::QueryResult) -> Result<SyncRecord, StorageError> {
    let id: String = row.try_get("", "id").map_err(map_query)?;
    let user_id: Option<String> = row.try_get("", "user_id").ok();
    let version: i64 = row.try_get("", "version").unwrap_or(1);
    let updated_at: String = row
        .try_get("", "updated_at")
        .or_else(|_| row.try_get("", "created_at"))
        .map_err(map_query)?;
    let deleted_at: Option<String> = row.try_get("", "deleted_at").ok();
    let mut payload = Map::new();
    for key in [
        "name",
        "description",
        "subject_id",
        "title",
        "kind",
        "value",
        "setting_key",
        "stem",
        "score",
        "amount",
        "reason",
    ] {
        if let Ok(val) = row.try_get::<String>("", key) {
            payload.insert(key.to_owned(), Value::String(val));
        }
    }
    Ok(SyncRecord {
        table: table.to_owned(),
        id,
        user_id,
        version,
        updated_at: updated_at.clone(),
        deleted_at,
        payload: Value::Object(payload),
    })
}

#[async_trait]
pub trait SyncEngine: Send + Sync {
    async fn pull(
        &self,
        user_id: &str,
        cursor: Option<&str>,
        limit: u32,
    ) -> Result<SyncPullResponse, StorageError>;
    async fn push(&self, user_id: &str, req: SyncPushRequest) -> Result<SyncPushResponse, StorageError>;
    async fn recompute_card_states(&self, user_id: &str) -> Result<u32, StorageError>;
}

#[async_trait]
impl SyncEngine for Store {
    async fn pull(
        &self,
        user_id: &str,
        cursor: Option<&str>,
        limit: u32,
    ) -> Result<SyncPullResponse, StorageError> {
        let since = cursor.unwrap_or("");
        let mut records = Vec::new();
        let backend = self.db.get_database_backend();
        let limit = limit.clamp(1, 500);
        for table in SYNC_TABLES {
            let sql = pull_sql(table, limit);
            let rows = self
                .db
                .query_all(Statement::from_sql_and_values(
                    backend,
                    &sql,
                    [user_id.into(), since.into()],
                ))
                .await
                .map_err(map_query)?;
            for row in rows {
                records.push(row_to_sync_record(table, &row)?);
            }
        }
        let has_more = records.len() >= limit as usize;
        let next_cursor = records
            .iter()
            .map(|r| r.updated_at.as_str())
            .max()
            .map(ToOwned::to_owned);
        Ok(SyncPullResponse {
            records,
            next_cursor,
            has_more,
        })
    }

    async fn push(&self, user_id: &str, req: SyncPushRequest) -> Result<SyncPushResponse, StorageError> {
        let mut accepted = 0u32;
        let mut conflicts = 0u32;
        let mut errors = Vec::new();
        let backend = self.db.get_database_backend();
        for record in req.records {
            let Some(kind) = sync_table_kind(&record.table) else {
                errors.push(format!("unsupported table {}", record.table));
                continue;
            };
            let existing = self
                .db
                .query_one(Statement::from_sql_and_values(
                    backend,
                    &format!("SELECT version, user_id FROM {} WHERE id = ?1", record.table),
                    [record.id.clone().into()],
                ))
                .await
                .map_err(map_query)?;
            match existing {
                None => {
                    let sql = if table_has_updated_at(&record.table) {
                        match backend {
                            DatabaseBackend::Postgres => format!(
                                "INSERT INTO {} (id, user_id, version, updated_at, deleted_at, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?4)",
                                record.table
                            ),
                            _ => format!(
                                "INSERT OR IGNORE INTO {} (id, user_id, version, updated_at, deleted_at, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?4)",
                                record.table
                            ),
                        }
                    } else {
                        match backend {
                            DatabaseBackend::Postgres => format!(
                                "INSERT INTO {} (id, user_id, version, deleted_at, created_at) VALUES (?1, ?2, ?3, ?4, ?5)",
                                record.table
                            ),
                            _ => format!(
                                "INSERT OR IGNORE INTO {} (id, user_id, version, deleted_at, created_at) VALUES (?1, ?2, ?3, ?4, ?5)",
                                record.table
                            ),
                        }
                    };
                    if table_has_updated_at(&record.table) {
                        self.db
                            .execute(Statement::from_sql_and_values(
                                backend,
                                &sql,
                                [
                                    record.id.into(),
                                    user_id.into(),
                                    record.version.into(),
                                    record.updated_at.into(),
                                    record.deleted_at.into(),
                                ],
                            ))
                            .await
                            .map_err(map_query)?;
                    } else {
                        self.db
                            .execute(Statement::from_sql_and_values(
                                backend,
                                &sql,
                                [
                                    record.id.into(),
                                    user_id.into(),
                                    record.version.into(),
                                    record.deleted_at.into(),
                                    record.updated_at.into(),
                                ],
                            ))
                            .await
                            .map_err(map_query)?;
                    }
                    accepted += 1;
                }
                Some(row) => {
                    let server_version: i64 = row.try_get("", "version").unwrap_or(1);
                    let owner: Option<String> = row.try_get("", "user_id").ok();
                    if owner.as_deref() != Some(user_id) {
                        errors.push(format!("isolation violation on {}", record.id));
                        continue;
                    }
                    if kind == "append" {
                        // Append-only: row already exists — accept without mutation.
                        accepted += 1;
                        continue;
                    }
                    if record.version < server_version {
                        conflicts += 1;
                        continue;
                    }
                    let merged_version = record.version.max(server_version) + 1;
                    let sql = if table_has_updated_at(&record.table) {
                        format!(
                            "UPDATE {} SET version = ?1, updated_at = ?2, deleted_at = ?3 WHERE id = ?4 AND user_id = ?5",
                            record.table
                        )
                    } else {
                        format!(
                            "UPDATE {} SET version = ?1, deleted_at = ?2 WHERE id = ?3 AND user_id = ?4",
                            record.table
                        )
                    };
                    let values: Vec<sea_orm::Value> = if table_has_updated_at(&record.table) {
                        vec![
                            merged_version.into(),
                            record.updated_at.into(),
                            record.deleted_at.into(),
                            record.id.into(),
                            user_id.into(),
                        ]
                    } else {
                        vec![
                            merged_version.into(),
                            record.deleted_at.into(),
                            record.id.into(),
                            user_id.into(),
                        ]
                    };
                    self.db
                        .execute(Statement::from_sql_and_values(backend, &sql, values))
                        .await
                        .map_err(map_query)?;
                    accepted += 1;
                }
            }
        }
        Ok(SyncPushResponse {
            accepted,
            conflicts,
            errors,
        })
    }

    async fn recompute_card_states(&self, _user_id: &str) -> Result<u32, StorageError> {
        // Card states derive from merged review_logs; full replay uses learning backfill in api.
        // Limitation: per-user replay filter not applied yet.
        Ok(0)
    }
}