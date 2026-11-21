use axum::extract::{Path, Query, State};
use axum::Json;
use serde::Deserialize;
use study_core::{Topic, UpdateTopic};

use crate::error::ApiError;
use crate::state::AppState;
use storage::{ChunkRepository, SourceRepository, TopicRepository};

#[derive(Debug, Deserialize)]
pub struct TopicListQuery {
    pub source_id: String,
}

pub async fn list(
    State(state): State<AppState>,
    Query(query): Query<TopicListQuery>,
) -> Result<Json<Vec<Topic>>, ApiError> {
    if state.store.get_source(&query.source_id).await?.is_none() {
        return Err(ApiError::NotFound);
    }
    let rows = state.store.list_topics(&query.source_id).await?;
    Ok(Json(rows))
}

pub async fn update(
    State(state): State<AppState>,
    Path(id): Path<String>,
    Json(body): Json<UpdateTopic>,
) -> Result<Json<Topic>, ApiError> {
    state
        .store
        .update_topic(&id, body)
        .await?
        .map(Json)
        .ok_or(ApiError::NotFound)
}

#[derive(Debug, Deserialize)]
pub struct ChunkListQuery {
    pub source_id: String,
    pub topic_id: Option<String>,
}

pub async fn list_chunks(
    State(state): State<AppState>,
    Query(query): Query<ChunkListQuery>,
) -> Result<Json<Vec<study_core::Chunk>>, ApiError> {
    if state.store.get_source(&query.source_id).await?.is_none() {
        return Err(ApiError::NotFound);
    }
    let rows = state
        .store
        .list_chunks(&query.source_id, query.topic_id.as_deref())
        .await?;
    Ok(Json(rows))
}
