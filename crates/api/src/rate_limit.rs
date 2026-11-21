use sea_orm::{ConnectionTrait, Statement};
use storage::Store;

use crate::error::ApiError;

#[derive(Clone)]
pub struct RateLimiter {
    store: Store,
}

impl RateLimiter {
    pub fn new(store: Store) -> Self {
        Self { store }
    }

    pub async fn check(&self, scope: &str, key: &str, limit: i32) -> Result<(), ApiError> {
        let bucket = format!("{scope}:{key}");
        let now = self.store.clock().now_rfc3339();
        let window_start = now.chars().take(16).collect::<String>();
        let backend = self.store.db().get_database_backend();
        self.store
            .db()
            .execute(Statement::from_sql_and_values(
                backend,
                "INSERT INTO rate_limit_buckets (bucket_key, count, window_start) VALUES (?1, 1, ?2) ON CONFLICT(bucket_key) DO UPDATE SET count = count + 1, window_start = excluded.window_start",
                [bucket.clone().into(), window_start.into()],
            ))
            .await
            .map_err(|e| ApiError::Storage(storage::StorageError::Query(e)))?;
        let row = self
            .store
            .db()
            .query_one(Statement::from_sql_and_values(
                backend,
                "SELECT count FROM rate_limit_buckets WHERE bucket_key = ?1",
                [bucket.into()],
            ))
            .await
            .map_err(|e| ApiError::Storage(storage::StorageError::Query(e)))?;
        let count: i32 = row
            .and_then(|r| r.try_get("", "count").ok())
            .unwrap_or(0);
        if count > limit {
            return Err(ApiError::Invalid("rate limit exceeded"));
        }
        Ok(())
    }
}