use async_trait::async_trait;
use sea_orm::{
    ActiveModelTrait, ColumnTrait, ConnectionTrait, EntityTrait, QueryFilter, QueryOrder, Set,
    Statement,
};
use study_core::{
    AiProvider, Chunk, NewAiProvider, NewSource, SearchHit, SearchQuery, Source, Topic,
    UpdateAiProvider, UpdateTopic,
};

use crate::entities::{ai_provider, chunk, source, topic};
use crate::error::{map_query, StorageError};
use crate::sync_meta::{bump_version, new_row_sync_fields};
use crate::tenant::{not_deleted, user_id_condition};
use crate::vector::{reciprocal_rank_fusion, VectorIndex};
use crate::Store;

fn new_id() -> String {
    uuid::Uuid::new_v4().to_string()
}

fn mask_key(key: &str) -> String {
    let trimmed = key.trim();
    if trimmed.is_empty() {
        return String::new();
    }
    let suffix: String = trimmed.chars().rev().take(4).collect::<String>().chars().rev().collect();
    format!("****{suffix}")
}

fn source_from(model: source::Model) -> Source {
    Source {
        id: model.id,
        subject_id: model.subject_id,
        title: model.title,
        kind: model.kind,
        file_name: model.file_name,
        content_hash: model.content_hash,
        status: model.status,
        error: model.error,
        progress: model.progress,
        needs_reembed: model.needs_reembed,
        created_at: model.created_at,
        updated_at: model.updated_at,
    }
}

fn topic_from(model: topic::Model) -> Topic {
    Topic {
        id: model.id,
        source_id: model.source_id,
        parent_id: model.parent_id,
        title: model.title,
        position: model.position,
        is_core: model.is_core,
        created_at: model.created_at,
        updated_at: model.updated_at,
    }
}

fn chunk_from(model: chunk::Model) -> Chunk {
    Chunk {
        id: model.id,
        source_id: model.source_id,
        topic_id: model.topic_id,
        position: model.position,
        text: model.text,
        token_count: model.token_count,
        page_ref: model.page_ref,
        created_at: model.created_at,
        updated_at: model.updated_at,
    }
}

fn provider_from(model: ai_provider::Model) -> AiProvider {
    let has_api_key = model
        .api_key
        .as_ref()
        .map(|k| !k.trim().is_empty())
        .unwrap_or(false);
    let api_key_hint = model
        .api_key
        .as_ref()
        .filter(|k| !k.trim().is_empty())
        .map(|k| mask_key(k));
    AiProvider {
        id: model.id,
        name: model.name,
        kind: model.kind,
        base_url: model.base_url,
        has_api_key,
        api_key_hint,
        chat_model: model.chat_model,
        embedding_model: model.embedding_model,
        embedding_dimensions: model.embedding_dimensions,
        created_at: model.created_at,
        updated_at: model.updated_at,
    }
}

#[derive(Debug, Clone)]
pub struct NewTopicRow {
    pub title: String,
    pub parent_temp_index: Option<usize>,
    pub position: i32,
    pub is_core: bool,
}

#[derive(Debug, Clone)]
pub struct NewChunkRow {
    pub topic_temp_index: usize,
    pub position: i32,
    pub text: String,
    pub token_count: i32,
    pub page_ref: Option<String>,
}

#[async_trait]
pub trait SourceRepository: Send + Sync {
    async fn list_sources(&self, subject_id: Option<&str>) -> Result<Vec<Source>, StorageError>;
    async fn get_source(&self, id: &str) -> Result<Option<Source>, StorageError>;
    async fn find_by_hash(
        &self,
        subject_id: &str,
        content_hash: &str,
    ) -> Result<Option<Source>, StorageError>;
    async fn create_source(&self, input: NewSource) -> Result<Source, StorageError>;
    async fn update_source_status(
        &self,
        id: &str,
        status: &str,
        progress: i32,
        error: Option<String>,
    ) -> Result<Option<Source>, StorageError>;
    async fn set_needs_reembed(&self, id: &str, needs: bool) -> Result<Option<Source>, StorageError>;
    async fn mark_all_needs_reembed(&self) -> Result<u64, StorageError>;
    async fn delete_source(&self, id: &str) -> Result<bool, StorageError>;
    async fn replace_source_content(
        &self,
        source_id: &str,
        topics: &[NewTopicRow],
        chunks: &[NewChunkRow],
    ) -> Result<(Vec<Topic>, Vec<Chunk>), StorageError>;
}

#[async_trait]
pub trait TopicRepository: Send + Sync {
    async fn list_topics(&self, source_id: &str) -> Result<Vec<Topic>, StorageError>;
    async fn get_topic(&self, id: &str) -> Result<Option<Topic>, StorageError>;
    async fn update_topic(
        &self,
        id: &str,
        input: UpdateTopic,
    ) -> Result<Option<Topic>, StorageError>;
}

#[async_trait]
pub trait ChunkRepository: Send + Sync {
    async fn list_chunks(
        &self,
        source_id: &str,
        topic_id: Option<&str>,
    ) -> Result<Vec<Chunk>, StorageError>;
    async fn get_chunk(&self, id: &str) -> Result<Option<Chunk>, StorageError>;
    async fn list_chunks_for_embed(&self, source_id: &str) -> Result<Vec<Chunk>, StorageError>;
}

#[derive(Debug, Clone)]
pub struct AiProviderSecret {
    pub id: String,
    pub name: String,
    pub kind: String,
    pub base_url: Option<String>,
    pub api_key: Option<String>,
    pub chat_model: String,
    pub embedding_model: String,
    pub embedding_dimensions: i32,
}

#[async_trait]
pub trait AiProviderRepository: Send + Sync {
    async fn list_providers(&self) -> Result<Vec<AiProvider>, StorageError>;
    async fn get_provider(&self, id: &str) -> Result<Option<AiProvider>, StorageError>;
    async fn get_provider_secret(
        &self,
        id: &str,
    ) -> Result<Option<AiProviderSecret>, StorageError>;
    async fn create_provider(&self, input: NewAiProvider) -> Result<AiProvider, StorageError>;
    async fn update_provider(
        &self,
        id: &str,
        input: UpdateAiProvider,
    ) -> Result<Option<AiProvider>, StorageError>;
    async fn delete_provider(&self, id: &str) -> Result<bool, StorageError>;
}

#[async_trait]
pub trait SearchRepository: Send + Sync {
    async fn hybrid_search(
        &self,
        query: SearchQuery,
        query_vector: Option<&[f32]>,
        provider_model: Option<&str>,
    ) -> Result<Vec<SearchHit>, StorageError>;
}

#[async_trait]
impl SourceRepository for Store {
    async fn list_sources(&self, subject_id: Option<&str>) -> Result<Vec<Source>, StorageError> {
        let mut q = source::Entity::find()
            .filter(user_id_condition(source::Column::UserId))
            .filter(not_deleted(source::Column::DeletedAt))
            .order_by_desc(source::Column::CreatedAt);
        if let Some(subject_id) = subject_id {
            q = q.filter(source::Column::SubjectId.eq(subject_id));
        }
        let rows = q.all(&self.db).await.map_err(map_query)?;
        Ok(rows.into_iter().map(source_from).collect())
    }

    async fn get_source(&self, id: &str) -> Result<Option<Source>, StorageError> {
        let row = source::Entity::find_by_id(id)
            .filter(user_id_condition(source::Column::UserId))
            .filter(not_deleted(source::Column::DeletedAt))
            .one(&self.db)
            .await
            .map_err(map_query)?;
        Ok(row.map(source_from))
    }

    async fn find_by_hash(
        &self,
        subject_id: &str,
        content_hash: &str,
    ) -> Result<Option<Source>, StorageError> {
        let row = source::Entity::find()
            .filter(source::Column::SubjectId.eq(subject_id))
            .filter(source::Column::ContentHash.eq(content_hash))
            .filter(user_id_condition(source::Column::UserId))
            .filter(not_deleted(source::Column::DeletedAt))
            .one(&self.db)
            .await
            .map_err(map_query)?;
        Ok(row.map(source_from))
    }

    async fn create_source(&self, input: NewSource) -> Result<Source, StorageError> {
        let input = input.normalized().map_err(StorageError::Invalid)?;
        if self
            .find_by_hash(&input.subject_id, &input.content_hash)
            .await?
            .is_some()
        {
            return Err(StorageError::Conflict);
        }
        let stamp = self.now();
        let (user_id, version, deleted_at) = new_row_sync_fields();
        let active = source::ActiveModel {
            id: Set(new_id()),
            subject_id: Set(input.subject_id),
            title: Set(input.title),
            kind: Set(input.kind),
            file_name: Set(input.file_name),
            content_hash: Set(input.content_hash),
            status: Set("pending".into()),
            error: Set(None),
            progress: Set(0),
            needs_reembed: Set(false),
            user_id,
            version,
            deleted_at,
            created_at: Set(stamp.clone()),
            updated_at: Set(stamp),
            ..Default::default()
        };
        let model = active.insert(&self.db).await.map_err(map_query)?;
        Ok(source_from(model))
    }

    async fn update_source_status(
        &self,
        id: &str,
        status: &str,
        progress: i32,
        error: Option<String>,
    ) -> Result<Option<Source>, StorageError> {
        let Some(existing) = source::Entity::find_by_id(id)
            .filter(user_id_condition(source::Column::UserId))
            .filter(not_deleted(source::Column::DeletedAt))
            .one(&self.db)
            .await
            .map_err(map_query)?
        else {
            return Ok(None);
        };
        let ver = existing.version;
        let mut active: source::ActiveModel = existing.into();
        active.status = Set(status.to_owned());
        active.progress = Set(progress.clamp(0, 100));
        active.error = Set(error);
        active.updated_at = Set(self.now());
        active.version = bump_version(ver);
        let model = active.update(&self.db).await.map_err(map_query)?;
        Ok(Some(source_from(model)))
    }

    async fn set_needs_reembed(
        &self,
        id: &str,
        needs: bool,
    ) -> Result<Option<Source>, StorageError> {
        let Some(existing) = source::Entity::find_by_id(id)
            .filter(user_id_condition(source::Column::UserId))
            .filter(not_deleted(source::Column::DeletedAt))
            .one(&self.db)
            .await
            .map_err(map_query)?
        else {
            return Ok(None);
        };
        let ver = existing.version;
        let mut active: source::ActiveModel = existing.into();
        active.needs_reembed = Set(needs);
        active.updated_at = Set(self.now());
        active.version = bump_version(ver);
        let model = active.update(&self.db).await.map_err(map_query)?;
        Ok(Some(source_from(model)))
    }

    async fn mark_all_needs_reembed(&self) -> Result<u64, StorageError> {
        let backend = self.db.get_database_backend();
        let result = self
            .db
            .execute(Statement::from_sql_and_values(
                backend,
                "UPDATE sources SET needs_reembed = 1, updated_at = ? WHERE status = 'ready'",
                [self.now().into()],
            ))
            .await
            .map_err(map_query)?;
        Ok(result.rows_affected())
    }

    async fn delete_source(&self, id: &str) -> Result<bool, StorageError> {
        let Some(existing) = source::Entity::find_by_id(id)
            .filter(user_id_condition(source::Column::UserId))
            .filter(not_deleted(source::Column::DeletedAt))
            .one(&self.db)
            .await
            .map_err(map_query)?
        else {
            return Ok(false);
        };
        let ver = existing.version;
        let mut active: source::ActiveModel = existing.into();
        let stamp = self.now();
        active.deleted_at = Set(Some(stamp.clone()));
        active.updated_at = Set(stamp);
        active.version = bump_version(ver);
        active.update(&self.db).await.map_err(map_query)?;
        Ok(true)
    }

    async fn replace_source_content(
        &self,
        source_id: &str,
        topics: &[NewTopicRow],
        chunks: &[NewChunkRow],
    ) -> Result<(Vec<Topic>, Vec<Chunk>), StorageError> {
        let backend = self.db.get_database_backend();
        self.db
            .execute(Statement::from_sql_and_values(
                backend,
                "DELETE FROM chunks_fts WHERE source_id = ?",
                [source_id.into()],
            ))
            .await
            .map_err(map_query)?;
        self.db
            .execute(Statement::from_sql_and_values(
                backend,
                "DELETE FROM chunk_embeddings WHERE chunk_id IN (SELECT id FROM chunks WHERE source_id = ?)",
                [source_id.into()],
            ))
            .await
            .map_err(map_query)?;
        chunk::Entity::delete_many()
            .filter(chunk::Column::SourceId.eq(source_id))
            .exec(&self.db)
            .await
            .map_err(map_query)?;
        topic::Entity::delete_many()
            .filter(topic::Column::SourceId.eq(source_id))
            .exec(&self.db)
            .await
            .map_err(map_query)?;

        let stamp = self.now();
        let mut topic_ids = Vec::with_capacity(topics.len());
        let mut saved_topics = Vec::with_capacity(topics.len());
        for (index, row) in topics.iter().enumerate() {
            let parent_id = row
                .parent_temp_index
                .and_then(|parent| topic_ids.get(parent).cloned());
            let id = new_id();
            let active = topic::ActiveModel {
                id: Set(id.clone()),
                source_id: Set(source_id.to_owned()),
                parent_id: Set(parent_id),
                title: Set(row.title.clone()),
                position: Set(row.position),
                is_core: Set(row.is_core),
                created_at: Set(stamp.clone()),
                updated_at: Set(stamp.clone()),
                ..Default::default()
            };
            let model = active.insert(&self.db).await.map_err(map_query)?;
            topic_ids.push(id);
            let _ = index;
            saved_topics.push(topic_from(model));
        }

        let mut saved_chunks = Vec::with_capacity(chunks.len());
        for row in chunks {
            let topic_id = topic_ids
                .get(row.topic_temp_index)
                .cloned()
                .ok_or(StorageError::Invalid("chunk topic index invalid"))?;
            let id = new_id();
            let active = chunk::ActiveModel {
                id: Set(id.clone()),
                source_id: Set(source_id.to_owned()),
                topic_id: Set(topic_id.clone()),
                position: Set(row.position),
                text: Set(row.text.clone()),
                token_count: Set(row.token_count),
                page_ref: Set(row.page_ref.clone()),
                created_at: Set(stamp.clone()),
                updated_at: Set(stamp.clone()),
                ..Default::default()
            };
            let model = active.insert(&self.db).await.map_err(map_query)?;
            self.db
                .execute(Statement::from_sql_and_values(
                    backend,
                    "INSERT INTO chunks_fts (chunk_id, source_id, topic_id, text) VALUES (?, ?, ?, ?)",
                    [
                        id.into(),
                        source_id.into(),
                        topic_id.into(),
                        row.text.clone().into(),
                    ],
                ))
                .await
                .map_err(map_query)?;
            saved_chunks.push(chunk_from(model));
        }

        Ok((saved_topics, saved_chunks))
    }
}

#[async_trait]
impl TopicRepository for Store {
    async fn list_topics(&self, source_id: &str) -> Result<Vec<Topic>, StorageError> {
        let rows = topic::Entity::find()
            .filter(topic::Column::SourceId.eq(source_id))
            .filter(user_id_condition(topic::Column::UserId))
            .filter(not_deleted(topic::Column::DeletedAt))
            .order_by_asc(topic::Column::Position)
            .all(&self.db)
            .await
            .map_err(map_query)?;
        Ok(rows.into_iter().map(topic_from).collect())
    }

    async fn get_topic(&self, id: &str) -> Result<Option<Topic>, StorageError> {
        let row = topic::Entity::find_by_id(id)
            .filter(user_id_condition(topic::Column::UserId))
            .filter(not_deleted(topic::Column::DeletedAt))
            .one(&self.db)
            .await
            .map_err(map_query)?;
        Ok(row.map(topic_from))
    }

    async fn update_topic(
        &self,
        id: &str,
        input: UpdateTopic,
    ) -> Result<Option<Topic>, StorageError> {
        let input = input.normalized().map_err(StorageError::Invalid)?;
        let Some(existing) = topic::Entity::find_by_id(id)
            .filter(user_id_condition(topic::Column::UserId))
            .filter(not_deleted(topic::Column::DeletedAt))
            .one(&self.db)
            .await
            .map_err(map_query)?
        else {
            return Ok(None);
        };
        let ver = existing.version;
        let mut active: topic::ActiveModel = existing.into();
        if let Some(title) = input.title {
            active.title = Set(title);
        }
        if let Some(position) = input.position {
            active.position = Set(position);
        }
        if let Some(is_core) = input.is_core {
            active.is_core = Set(is_core);
        }
        active.updated_at = Set(self.now());
        active.version = bump_version(ver);
        let model = active.update(&self.db).await.map_err(map_query)?;
        Ok(Some(topic_from(model)))
    }
}

#[async_trait]
impl ChunkRepository for Store {
    async fn list_chunks(
        &self,
        source_id: &str,
        topic_id: Option<&str>,
    ) -> Result<Vec<Chunk>, StorageError> {
        let mut q = chunk::Entity::find()
            .filter(chunk::Column::SourceId.eq(source_id))
            .order_by_asc(chunk::Column::Position);
        if let Some(topic_id) = topic_id {
            q = q.filter(chunk::Column::TopicId.eq(topic_id));
        }
        let rows = q.all(&self.db).await.map_err(map_query)?;
        Ok(rows.into_iter().map(chunk_from).collect())
    }

    async fn get_chunk(&self, id: &str) -> Result<Option<Chunk>, StorageError> {
        let row = chunk::Entity::find_by_id(id)
            .one(&self.db)
            .await
            .map_err(map_query)?;
        Ok(row.map(chunk_from))
    }

    async fn list_chunks_for_embed(&self, source_id: &str) -> Result<Vec<Chunk>, StorageError> {
        self.list_chunks(source_id, None).await
    }
}

#[async_trait]
impl AiProviderRepository for Store {
    async fn list_providers(&self) -> Result<Vec<AiProvider>, StorageError> {
        let rows = ai_provider::Entity::find()
            .filter(user_id_condition(ai_provider::Column::UserId))
            .filter(not_deleted(ai_provider::Column::DeletedAt))
            .order_by_asc(ai_provider::Column::Name)
            .all(&self.db)
            .await
            .map_err(map_query)?;
        Ok(rows.into_iter().map(provider_from).collect())
    }

    async fn get_provider(&self, id: &str) -> Result<Option<AiProvider>, StorageError> {
        let row = ai_provider::Entity::find_by_id(id)
            .filter(user_id_condition(ai_provider::Column::UserId))
            .filter(not_deleted(ai_provider::Column::DeletedAt))
            .one(&self.db)
            .await
            .map_err(map_query)?;
        Ok(row.map(provider_from))
    }

    async fn get_provider_secret(
        &self,
        id: &str,
    ) -> Result<Option<AiProviderSecret>, StorageError> {
        let row = ai_provider::Entity::find_by_id(id)
            .one(&self.db)
            .await
            .map_err(map_query)?;
        Ok(row.map(|model| AiProviderSecret {
            id: model.id,
            name: model.name,
            kind: model.kind,
            base_url: model.base_url,
            api_key: model.api_key,
            chat_model: model.chat_model,
            embedding_model: model.embedding_model,
            embedding_dimensions: model.embedding_dimensions,
        }))
    }

    async fn create_provider(&self, input: NewAiProvider) -> Result<AiProvider, StorageError> {
        let input = input.normalized().map_err(StorageError::Invalid)?;
        let stamp = self.now();
        let (user_id, version, deleted_at) = new_row_sync_fields();
        let active = ai_provider::ActiveModel {
            id: Set(new_id()),
            name: Set(input.name),
            kind: Set(input.kind),
            base_url: Set(input.base_url),
            api_key: Set(input.api_key),
            chat_model: Set(input.chat_model),
            embedding_model: Set(input.embedding_model),
            embedding_dimensions: Set(input.embedding_dimensions),
            user_id,
            version,
            deleted_at,
            created_at: Set(stamp.clone()),
            updated_at: Set(stamp),
            ..Default::default()
        };
        let model = active.insert(&self.db).await.map_err(map_query)?;
        Ok(provider_from(model))
    }

    async fn update_provider(
        &self,
        id: &str,
        input: UpdateAiProvider,
    ) -> Result<Option<AiProvider>, StorageError> {
        let Some(existing) = ai_provider::Entity::find_by_id(id)
            .filter(user_id_condition(ai_provider::Column::UserId))
            .filter(not_deleted(ai_provider::Column::DeletedAt))
            .one(&self.db)
            .await
            .map_err(map_query)?
        else {
            return Ok(None);
        };
        let ver = existing.version;
        let mut active: ai_provider::ActiveModel = existing.into();
        if let Some(name) = input.name {
            let name = name.trim().to_owned();
            if name.is_empty() {
                return Err(StorageError::Invalid("name required"));
            }
            active.name = Set(name);
        }
        if let Some(base_url) = input.base_url {
            let trimmed = base_url.trim().to_owned();
            active.base_url = Set(if trimmed.is_empty() {
                None
            } else {
                Some(trimmed)
            });
        }
        if input.clear_api_key == Some(true) {
            active.api_key = Set(None);
        } else if let Some(api_key) = input.api_key {
            let trimmed = api_key.trim().to_owned();
            if !trimmed.is_empty() {
                active.api_key = Set(Some(trimmed));
            }
        }
        if let Some(chat_model) = input.chat_model {
            let chat_model = chat_model.trim().to_owned();
            if chat_model.is_empty() {
                return Err(StorageError::Invalid("chat_model required"));
            }
            active.chat_model = Set(chat_model);
        }
        if let Some(embedding_model) = input.embedding_model {
            let embedding_model = embedding_model.trim().to_owned();
            if embedding_model.is_empty() {
                return Err(StorageError::Invalid("embedding_model required"));
            }
            active.embedding_model = Set(embedding_model);
        }
        if let Some(dims) = input.embedding_dimensions {
            if dims <= 0 {
                return Err(StorageError::Invalid(
                    "embedding_dimensions must be positive",
                ));
            }
            active.embedding_dimensions = Set(dims);
        }
        active.updated_at = Set(self.now());
        active.version = bump_version(ver);
        let model = active.update(&self.db).await.map_err(map_query)?;
        Ok(Some(provider_from(model)))
    }

    async fn delete_provider(&self, id: &str) -> Result<bool, StorageError> {
        let Some(existing) = ai_provider::Entity::find_by_id(id)
            .filter(user_id_condition(ai_provider::Column::UserId))
            .filter(not_deleted(ai_provider::Column::DeletedAt))
            .one(&self.db)
            .await
            .map_err(map_query)?
        else {
            return Ok(false);
        };
        let ver = existing.version;
        let mut active: ai_provider::ActiveModel = existing.into();
        let stamp = self.now();
        active.deleted_at = Set(Some(stamp.clone()));
        active.updated_at = Set(stamp);
        active.version = bump_version(ver);
        active.update(&self.db).await.map_err(map_query)?;
        Ok(true)
    }
}

#[async_trait]
impl SearchRepository for Store {
    async fn hybrid_search(
        &self,
        query: SearchQuery,
        query_vector: Option<&[f32]>,
        provider_model: Option<&str>,
    ) -> Result<Vec<SearchHit>, StorageError> {
        let query = query.normalized().map_err(StorageError::Invalid)?;
        let limit = query.limit.unwrap_or(10) as usize;

        let mut source_filter: Option<Vec<String>> = None;
        if let Some(subject_id) = query.subject_id.as_deref() {
            let sources = self.list_sources(Some(subject_id)).await?;
            source_filter = Some(sources.into_iter().map(|s| s.id).collect());
        }
        if let Some(source_id) = query.source_id.as_deref() {
            source_filter = Some(vec![source_id.to_owned()]);
        }

        let mut vector_ranks = Vec::new();
        if let (Some(vector), Some(model)) = (query_vector, provider_model) {
            let hits = self
                .search(
                    vector,
                    model,
                    limit.saturating_mul(3).max(10),
                    source_filter.as_deref(),
                )
                .await?;
            vector_ranks = hits
                .into_iter()
                .map(|hit| (hit.chunk_id, hit.score))
                .collect();
        }

        let keyword_ranks = self
            .keyword_search(
                &query.query,
                limit.saturating_mul(3).max(10),
                query.source_id.as_deref(),
                query.topic_id.as_deref(),
            )
            .await?;

        let merged = if vector_ranks.is_empty() {
            keyword_ranks
        } else if keyword_ranks.is_empty() {
            vector_ranks
        } else {
            reciprocal_rank_fusion(&vector_ranks, &keyword_ranks, limit)
        };

        let mut hits = Vec::new();
        for (chunk_id, score) in merged {
            let Some(chunk) = self.get_chunk(&chunk_id).await? else {
                continue;
            };
            if let Some(topic_id) = query.topic_id.as_deref() {
                if chunk.topic_id != topic_id {
                    continue;
                }
            }
            if let Some(ref sources) = source_filter {
                if !sources.iter().any(|id| id == &chunk.source_id) {
                    continue;
                }
            }
            let source = self
                .get_source(&chunk.source_id)
                .await?
                .ok_or(StorageError::Invalid("source missing for chunk"))?;
            let topic = self
                .get_topic(&chunk.topic_id)
                .await?
                .ok_or(StorageError::Invalid("topic missing for chunk"))?;
            hits.push(SearchHit {
                chunk_id: chunk.id,
                source_id: source.id,
                source_title: source.title,
                topic_id: topic.id,
                topic_title: topic.title,
                page_ref: chunk.page_ref,
                text: chunk.text,
                score,
            });
            if hits.len() >= limit {
                break;
            }
        }
        Ok(hits)
    }
}
