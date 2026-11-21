//! Brute-force cosine similarity. Swap for sqlite-vec / pgvector later.

use async_trait::async_trait;
use sea_orm::{ConnectionTrait, DatabaseBackend, Statement};

use crate::error::{map_query, StorageError};
use crate::Store;

#[derive(Debug, Clone)]
pub struct VectorRecord {
    pub chunk_id: String,
    pub provider_model: String,
    pub vector: Vec<f32>,
}

#[derive(Debug, Clone)]
pub struct VectorHit {
    pub chunk_id: String,
    pub score: f32,
}

#[async_trait]
pub trait VectorIndex: Send + Sync {
    async fn upsert(
        &self,
        chunk_id: &str,
        provider_model: &str,
        vector: &[f32],
    ) -> Result<(), StorageError>;

    async fn search(
        &self,
        query: &[f32],
        provider_model: &str,
        limit: usize,
        source_ids: Option<&[String]>,
    ) -> Result<Vec<VectorHit>, StorageError>;
}

pub fn encode_f32_le(values: &[f32]) -> Vec<u8> {
    let mut out = Vec::with_capacity(values.len() * 4);
    for value in values {
        out.extend_from_slice(&value.to_le_bytes());
    }
    out
}

pub fn decode_f32_le(bytes: &[u8]) -> Result<Vec<f32>, StorageError> {
    if !bytes.len().is_multiple_of(4) {
        return Err(StorageError::Invalid("vector blob length invalid"));
    }
    let mut out = Vec::with_capacity(bytes.len() / 4);
    for chunk in bytes.chunks_exact(4) {
        let arr = [chunk[0], chunk[1], chunk[2], chunk[3]];
        out.push(f32::from_le_bytes(arr));
    }
    Ok(out)
}

pub fn cosine_similarity(a: &[f32], b: &[f32]) -> f32 {
    if a.is_empty() || a.len() != b.len() {
        return 0.0;
    }
    let mut dot = 0.0f32;
    let mut norm_a = 0.0f32;
    let mut norm_b = 0.0f32;
    for (left, right) in a.iter().zip(b.iter()) {
        dot += left * right;
        norm_a += left * left;
        norm_b += right * right;
    }
    let denom = norm_a.sqrt() * norm_b.sqrt();
    if denom == 0.0 {
        0.0
    } else {
        dot / denom
    }
}

/// Reciprocal rank fusion over two ranked id lists.
pub fn reciprocal_rank_fusion(
    vector_ranks: &[(String, f32)],
    keyword_ranks: &[(String, f32)],
    limit: usize,
) -> Vec<(String, f32)> {
    const K: f32 = 60.0;
    use std::collections::HashMap;
    let mut scores: HashMap<String, f32> = HashMap::new();
    for (rank, (id, _)) in vector_ranks.iter().enumerate() {
        *scores.entry(id.clone()).or_default() += 1.0 / (K + rank as f32 + 1.0);
    }
    for (rank, (id, _)) in keyword_ranks.iter().enumerate() {
        *scores.entry(id.clone()).or_default() += 1.0 / (K + rank as f32 + 1.0);
    }
    let mut merged: Vec<(String, f32)> = scores.into_iter().collect();
    merged.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap_or(std::cmp::Ordering::Equal));
    merged.truncate(limit);
    merged
}

#[async_trait]
impl VectorIndex for Store {
    async fn upsert(
        &self,
        chunk_id: &str,
        provider_model: &str,
        vector: &[f32],
    ) -> Result<(), StorageError> {
        let stamp = chrono::Utc::now().format("%Y-%m-%dT%H:%M:%SZ").to_string();
        let id = uuid::Uuid::new_v4().to_string();
        let blob = encode_f32_le(vector);
        let dims = vector.len() as i32;
        let backend = self.db.get_database_backend();
        // delete existing then insert (portable)
        let delete = Statement::from_sql_and_values(
            backend,
            "DELETE FROM chunk_embeddings WHERE chunk_id = ? AND provider_model = ?",
            [chunk_id.into(), provider_model.into()],
        );
        self.db.execute(delete).await.map_err(map_query)?;
        let insert = Statement::from_sql_and_values(
            backend,
            "INSERT INTO chunk_embeddings (id, chunk_id, provider_model, dimensions, vector, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
            [
                id.into(),
                chunk_id.into(),
                provider_model.into(),
                dims.into(),
                blob.into(),
                stamp.clone().into(),
                stamp.into(),
            ],
        );
        self.db.execute(insert).await.map_err(map_query)?;
        Ok(())
    }

    async fn search(
        &self,
        query: &[f32],
        provider_model: &str,
        limit: usize,
        source_ids: Option<&[String]>,
    ) -> Result<Vec<VectorHit>, StorageError> {
        let backend = self.db.get_database_backend();
        let sql = "SELECT e.chunk_id, e.vector, c.source_id
             FROM chunk_embeddings e
             JOIN chunks c ON c.id = e.chunk_id
             WHERE e.provider_model = ?";
        let rows = self
            .db
            .query_all(Statement::from_sql_and_values(
                backend,
                sql,
                [provider_model.into()],
            ))
            .await
            .map_err(map_query)?;

        let allowed: Option<std::collections::HashSet<&str>> =
            source_ids.map(|ids| ids.iter().map(String::as_str).collect());

        let mut hits = Vec::new();
        for row in rows {
            let chunk_id: String = row.try_get("", "chunk_id").map_err(map_query)?;
            if let Some(ref set) = allowed {
                let source_id: String = row.try_get("", "source_id").map_err(map_query)?;
                if !set.contains(source_id.as_str()) {
                    continue;
                }
            }
            let blob: Vec<u8> = row.try_get("", "vector").map_err(map_query)?;
            let vector = decode_f32_le(&blob)?;
            let score = cosine_similarity(query, &vector);
            hits.push(VectorHit { chunk_id, score });
        }
        hits.sort_by(|a, b| {
            b.score
                .partial_cmp(&a.score)
                .unwrap_or(std::cmp::Ordering::Equal)
        });
        hits.truncate(limit);
        Ok(hits)
    }
}

impl Store {
    pub async fn keyword_search(
        &self,
        query: &str,
        limit: usize,
        source_id: Option<&str>,
        topic_id: Option<&str>,
    ) -> Result<Vec<(String, f32)>, StorageError> {
        let backend = self.db.get_database_backend();
        if backend != DatabaseBackend::Sqlite {
            return Ok(Vec::new());
        }
        let mut sql = String::from(
            "SELECT chunk_id, bm25(chunks_fts) AS rank FROM chunks_fts WHERE chunks_fts MATCH ?",
        );
        let mut values: Vec<sea_orm::Value> = vec![query.into()];
        if let Some(source_id) = source_id {
            sql.push_str(" AND source_id = ?");
            values.push(source_id.into());
        }
        if let Some(topic_id) = topic_id {
            sql.push_str(" AND topic_id = ?");
            values.push(topic_id.into());
        }
        sql.push_str(" ORDER BY rank LIMIT ?");
        values.push((limit as i32).into());

        let rows = self
            .db
            .query_all(Statement::from_sql_and_values(backend, &sql, values))
            .await
            .map_err(map_query)?;
        let mut out = Vec::new();
        for row in rows {
            let chunk_id: String = row.try_get("", "chunk_id").map_err(map_query)?;
            let rank: f64 = row.try_get("", "rank").unwrap_or(0.0);
            // bm25: lower is better → invert for ranking lists
            out.push((chunk_id, -rank as f32));
        }
        Ok(out)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn cosine_identical_is_one() {
        let v = vec![1.0, 0.0, 0.0];
        assert!((cosine_similarity(&v, &v) - 1.0).abs() < 1e-5);
    }

    #[test]
    fn rrf_prefers_shared_hits() {
        let vector = vec![("a".into(), 1.0), ("b".into(), 0.5)];
        let keyword = vec![("b".into(), 1.0), ("c".into(), 0.5)];
        let merged = reciprocal_rank_fusion(&vector, &keyword, 3);
        assert_eq!(merged[0].0, "b");
    }

    #[test]
    fn encode_decode_round_trip() {
        let original = vec![0.5f32, -1.25, 3.0];
        let bytes = encode_f32_le(&original);
        let decoded = decode_f32_le(&bytes).unwrap();
        assert_eq!(decoded, original);
    }
}
