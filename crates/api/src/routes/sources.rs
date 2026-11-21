use axum::extract::{Multipart, Path, Query, State};
use axum::http::{HeaderMap, StatusCode};
use axum::Json;
use serde::Deserialize;
use study_core::{NewSource, Source};

use crate::error::ApiError;
use crate::jobs::{spawn_ingest, spawn_reembed};
use crate::state::AppState;
use crate::tenant_scope::with_data_tenant;
use storage::{SourceRepository, SubjectRepository};

#[derive(Debug, Deserialize)]
pub struct ListQuery {
    pub subject_id: Option<String>,
}

pub async fn list(
    State(state): State<AppState>,
    headers: HeaderMap,
    Query(query): Query<ListQuery>,
) -> Result<Json<Vec<Source>>, ApiError> {
    with_data_tenant(&state, &headers, || async {
        let rows = state
            .store
            .list_sources(query.subject_id.as_deref())
            .await?;
        Ok(Json(rows))
    })
    .await
}

pub async fn get_one(
    State(state): State<AppState>,
    Path(id): Path<String>,
) -> Result<Json<Source>, ApiError> {
    state
        .store
        .get_source(&id)
        .await?
        .map(Json)
        .ok_or(ApiError::NotFound)
}

pub async fn upload(
    State(state): State<AppState>,
    headers: HeaderMap,
    mut multipart: Multipart,
) -> Result<(StatusCode, Json<Source>), ApiError> {
    with_data_tenant(&state, &headers, || async {
    let mut subject_id = None;
    let mut title = None;
    let mut kind = None;
    let mut file_name = None;
    let mut bytes = None;

    while let Some(field) = multipart
        .next_field()
        .await
        .map_err(|_| ApiError::Invalid("multipart invalid"))?
    {
        let name = field.name().unwrap_or("").to_owned();
        match name.as_str() {
            "subject_id" => {
                subject_id = Some(
                    field
                        .text()
                        .await
                        .map_err(|_| ApiError::Invalid("subject_id invalid"))?,
                );
            }
            "title" => {
                title = Some(
                    field
                        .text()
                        .await
                        .map_err(|_| ApiError::Invalid("title invalid"))?,
                );
            }
            "kind" => {
                kind = Some(
                    field
                        .text()
                        .await
                        .map_err(|_| ApiError::Invalid("kind invalid"))?,
                );
            }
            "file" => {
                file_name = field
                    .file_name()
                    .map(ToOwned::to_owned)
                    .or_else(|| Some("upload.bin".into()));
                let data = field
                    .bytes()
                    .await
                    .map_err(|_| ApiError::Invalid("file invalid"))?;
                if data.len() > state.max_upload_bytes {
                    return Err(ApiError::Invalid("file exceeds max upload size"));
                }
                bytes = Some(data.to_vec());
            }
            _ => {
                let _ = field.bytes().await;
            }
        }
    }

    let subject_id = subject_id.ok_or(ApiError::Invalid("subject_id required"))?;
    let file_name = file_name.ok_or(ApiError::Invalid("file required"))?;
    let bytes = bytes.ok_or(ApiError::Invalid("file required"))?;
    let kind = kind.unwrap_or_else(|| infer_kind(&file_name));
    let title = title
        .filter(|t| !t.trim().is_empty())
        .unwrap_or_else(|| title_from_file(&file_name));

    if state.store.get_subject(&subject_id).await?.is_none() {
        return Err(ApiError::Invalid("subject_id not found"));
    }

    let content_hash = ingest::content_hash(&bytes);
    let source = state
        .store
        .create_source(NewSource {
            subject_id,
            title,
            kind,
            file_name: file_name.clone(),
            content_hash,
        })
        .await?;

    spawn_ingest(state.clone(), source.id.clone(), bytes, file_name);
    Ok((StatusCode::CREATED, Json(source)))
    })
    .await
}

pub async fn delete_one(
    State(state): State<AppState>,
    Path(id): Path<String>,
) -> Result<StatusCode, ApiError> {
    let deleted = state.store.delete_source(&id).await?;
    if !deleted {
        return Err(ApiError::NotFound);
    }
    let dir = state.files_dir.join(&id);
    let _ = tokio::fs::remove_dir_all(dir).await;
    Ok(StatusCode::NO_CONTENT)
}

pub async fn reembed(
    State(state): State<AppState>,
    Path(id): Path<String>,
) -> Result<Json<Source>, ApiError> {
    let source = state
        .store
        .get_source(&id)
        .await?
        .ok_or(ApiError::NotFound)?;
    spawn_reembed(state, id);
    Ok(Json(source))
}

fn infer_kind(file_name: &str) -> String {
    let lower = file_name.to_ascii_lowercase();
    if lower.ends_with(".pdf") || lower.ends_with(".epub") {
        "book".into()
    } else {
        "notes".into()
    }
}

fn title_from_file(file_name: &str) -> String {
    std::path::Path::new(file_name)
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or(file_name)
        .to_owned()
}
