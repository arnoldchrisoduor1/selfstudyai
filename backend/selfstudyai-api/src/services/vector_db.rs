use anyhow::{Context, Result};
use qdrant_client::qdrant::{
    CreateCollection, DeletePoints, PointStruct, SearchPoints, UpsertPoints, VectorParams,
    VectorsConfig, WithPayloadSelector, value::Kind as QValueKind, Value as QValue, 
    ListValue as QListValue, Struct as QStruct, Filter, Condition, FieldCondition,
};
use qdrant_client::Qdrant;
use serde_json::Value as JsonValue;
use serde_json::json;
use std::collections::HashMap;
use uuid::Uuid;

#[derive(Clone)]
pub struct VectorDbService {
    client: Qdrant,
    collection_name: String,
}

impl VectorDbService {
    /// Create a new VectorDbService instance
    pub async fn new(url: String, api_key: String) -> Result<Self> {
        let client = Qdrant::from_url(&url)
            .api_key(api_key)
            .build()
            .context("Failed to create Qdrant client")?;

        let collection_name = "documents".to_string();

        Ok(Self {
            client,
            collection_name,
        })
    }

    /// Initialize the collection (create if doesn't exist)
    pub async fn initialize_collection(&self) -> Result<()> {
        // Check if collection exists
        let collections = self
            .client
            .list_collections()
            .await
            .context("Failed to list collections")?;

        let collection_exists = collections
            .collections
            .iter()
            .any(|c| c.name == self.collection_name);

        if !collection_exists {
            tracing::info!("Creating Qdrant collection: {}", self.collection_name);

            // Create collection with 384 dimensions (for all-MiniLM-L6-v2)
            self.client
                .create_collection(CreateCollection {
                    collection_name: self.collection_name.clone(),
                    vectors_config: Some(VectorsConfig {
                        config: Some(qdrant_client::qdrant::vectors_config::Config::Params(
                            VectorParams {
                                size: 384,
                                distance: qdrant_client::qdrant::Distance::Cosine.into(),
                                ..Default::default()
                            },
                        )),
                    }),
                    ..Default::default()
                })
                .await
                .context("Failed to create collection")?;

            tracing::info!("Collection created successfully");
        } else {
            tracing::info!("Collection already exists: {}", self.collection_name);
        }

        Ok(())
    }

    /// Helper: convert serde_json::Value -> qdrant_client::qdrant::Value
    fn json_to_qvalue(j: &JsonValue) -> QValue {
        match j {
            JsonValue::Null => QValue {
                kind: Some(QValueKind::NullValue(0)),
            },
            JsonValue::Bool(b) => QValue {
                kind: Some(QValueKind::BoolValue(*b)),
            },
            JsonValue::Number(n) => {
                if let Some(i) = n.as_i64() {
                    QValue {
                        kind: Some(QValueKind::IntegerValue(i)),
                    }
                } else if let Some(f) = n.as_f64() {
                    QValue {
                        kind: Some(QValueKind::DoubleValue(f)),
                    }
                } else {
                    // fallback to string representation
                    QValue {
                        kind: Some(QValueKind::StringValue(n.to_string())),
                    }
                }
            }
            JsonValue::String(s) => QValue {
                kind: Some(QValueKind::StringValue(s.clone())),
            },
            JsonValue::Array(arr) => {
                let values = arr.iter().map(|v| Self::json_to_qvalue(v)).collect();
                QValue {
                    kind: Some(QValueKind::ListValue(QListValue { values })),
                }
            }
            JsonValue::Object(map) => {
                let fields: HashMap<String, QValue> = map
                    .iter()
                    .map(|(k, v)| (k.clone(), Self::json_to_qvalue(v)))
                    .collect();
                QValue {
                    kind: Some(QValueKind::StructValue(QStruct { fields })),
                }
            }
        }
    }

    /// Store document chunks with embeddings
    pub async fn store_chunks(
        &self,
        document_id: Uuid,
        chunks: Vec<(Uuid, String, Vec<f32>)>, // (chunk_id, content, embedding)
    ) -> Result<()> {
        // build points vec
        let mut points: Vec<PointStruct> = Vec::with_capacity(chunks.len());

        for (chunk_id, content, embedding) in chunks.into_iter() {
            // build serde payload first
            let payload_json = json!({
                "document_id": document_id.to_string(),
                "chunk_id": chunk_id.to_string(),
                "content": content,
            });

            // convert to HashMap<String, QValue>
            let payload_map: HashMap<String, QValue> = match payload_json.as_object() {
                Some(map) => map
                    .iter()
                    .map(|(k, v)| (k.clone(), Self::json_to_qvalue(v)))
                    .collect(),
                None => HashMap::new(),
            };

            // Use PointStruct::new - it handles the PointId conversion properly
            let point = PointStruct::new(
                chunk_id.to_string(),
                embedding,
                payload_map,
            );

            points.push(point);
        }

        // Build UpsertPoints request
        let upsert = UpsertPoints {
            collection_name: self.collection_name.clone(),
            points,
            ..Default::default()
        };

        // call upsert
        self.client
            .upsert_points(upsert)
            .await
            .context("Failed to upsert points to Qdrant")?;

        Ok(())
    }

    /// Search for similar chunks
    pub async fn search(
        &self,
        query_embedding: Vec<f32>,
        limit: u64,
        document_id: Option<Uuid>,
    ) -> Result<Vec<SearchResult>> {
        let mut search_points = SearchPoints {
            collection_name: self.collection_name.clone(),
            vector: query_embedding,
            limit,
            with_payload: Some(WithPayloadSelector {
                selector_options: Some(qdrant_client::qdrant::with_payload_selector::SelectorOptions::Enable(true)),
            }),
            ..Default::default()
        };

        // Filter by document_id if provided
        if let Some(doc_id) = document_id {
            search_points.filter = Some(Filter {
                must: vec![Condition {
                    condition_one_of: Some(
                        qdrant_client::qdrant::condition::ConditionOneOf::Field(
                            FieldCondition {
                                key: "document_id".to_string(),
                                r#match: Some(qdrant_client::qdrant::Match {
                                    match_value: Some(
                                        qdrant_client::qdrant::r#match::MatchValue::Keyword(
                                            doc_id.to_string(),
                                        )
                                    ),
                                }),
                                ..Default::default()
                            },
                        ),
                    ),
                }],
                ..Default::default()
            });
        }

        let search_result = self
            .client
            .search_points(search_points)
            .await
            .context("Failed to search Qdrant")?;

        let results = search_result
            .result
            .into_iter()
            .map(|point| {
                // point.payload is already HashMap<String, Value>
                let payload_map = point.payload;

                // helper to extract string fields safely
                let get_str = |m: &HashMap<String, QValue>, key: &str| -> String {
                    m.get(key)
                        .and_then(|v| match &v.kind {
                            Some(QValueKind::StringValue(s)) => Some(s.clone()),
                            Some(QValueKind::IntegerValue(i)) => Some(i.to_string()),
                            Some(QValueKind::DoubleValue(f)) => Some(f.to_string()),
                            Some(QValueKind::BoolValue(b)) => Some(b.to_string()),
                            _ => None,
                        })
                        .unwrap_or_default()
                };

                SearchResult {
                    chunk_id: get_str(&payload_map, "chunk_id"),
                    document_id: get_str(&payload_map, "document_id"),
                    content: get_str(&payload_map, "content"),
                    score: point.score,
                }
            })
            .collect();

        Ok(results)
    }

    /// Delete all chunks for a document
    pub async fn delete_document_chunks(&self, document_id: Uuid) -> Result<()> {
        // Build filter
        let filter = Filter {
            must: vec![Condition {
                condition_one_of: Some(
                    qdrant_client::qdrant::condition::ConditionOneOf::Field(
                        FieldCondition {
                            key: "document_id".to_string(),
                            r#match: Some(qdrant_client::qdrant::Match {
                                match_value: Some(
                                    qdrant_client::qdrant::r#match::MatchValue::Keyword(
                                        document_id.to_string()
                                    ),
                                ),
                            }),
                            ..Default::default()
                        },
                    ),
                ),
            }],
            ..Default::default()
        };

        // In the newer API, DeletePoints uses points selector instead of filter
        let delete_req = DeletePoints {
            collection_name: self.collection_name.clone(),
            points: Some(qdrant_client::qdrant::PointsSelector {
                points_selector_one_of: Some(
                    qdrant_client::qdrant::points_selector::PointsSelectorOneOf::Filter(filter)
                ),
            }),
            ..Default::default()
        };

        self.client
            .delete_points(delete_req)
            .await
            .context("Failed to delete points from Qdrant")?;

        Ok(())
    }
}

#[derive(Debug, Clone)]
pub struct SearchResult {
    pub chunk_id: String,
    pub document_id: String,
    pub content: String,
    pub score: f32,
}