use std::path::Path;

use ai::{build_provider, ProviderConfig, ProviderKind};
use storage::{
    AiProviderRepository, AiProviderSecret, ChunkRepository, NewChunkRow, NewTopicRow,
    SettingRepository, SourceRepository, Store, VectorIndex,
};

use crate::state::AppState;

pub fn spawn_ingest(state: AppState, source_id: String, bytes: Vec<u8>, file_name: String) {
    tokio::spawn(async move {
        if let Err(err) = run_ingest(state, &source_id, &bytes, &file_name).await {
            tracing::error!(source_id = %source_id, error = %err, "ingest job failed");
        }
    });
}

pub fn spawn_reembed(state: AppState, source_id: String) {
    tokio::spawn(async move {
        if let Err(err) = run_reembed(&state.store, &source_id).await {
            tracing::error!(source_id = %source_id, error = %err, "reembed job failed");
        }
    });
}

async fn run_ingest(
    state: AppState,
    source_id: &str,
    bytes: &[u8],
    file_name: &str,
) -> Result<(), String> {
    let store = &state.store;
    let _ = store
        .update_source_status(source_id, "processing", 5, None)
        .await
        .map_err(|e| e.to_string())?;

    if let Err(err) = persist_file(&state.files_dir, source_id, file_name, bytes).await {
        let _ = store
            .update_source_status(source_id, "failed", 0, Some(err.clone()))
            .await;
        return Err(err);
    }

    let _ = store
        .update_source_status(source_id, "processing", 20, None)
        .await
        .map_err(|e| e.to_string())?;

    let pipeline = match ingest::run_pipeline(bytes, file_name) {
        Ok(result) => result,
        Err(err) => {
            let message = err.to_string();
            let _ = store
                .update_source_status(source_id, "failed", 0, Some(message.clone()))
                .await;
            return Err(message);
        }
    };

    let _ = store
        .update_source_status(source_id, "processing", 50, None)
        .await
        .map_err(|e| e.to_string())?;

    let topics: Vec<NewTopicRow> = pipeline
        .topics
        .iter()
        .enumerate()
        .map(|(position, (title, parent, is_core))| NewTopicRow {
            title: title.clone(),
            parent_temp_index: *parent,
            position: position as i32,
            is_core: *is_core,
        })
        .collect();
    let chunks: Vec<NewChunkRow> = pipeline
        .chunks
        .iter()
        .map(|chunk| NewChunkRow {
            topic_temp_index: chunk.topic_index,
            position: chunk.position,
            text: chunk.text.clone(),
            token_count: chunk.token_count,
            page_ref: chunk.page_ref.clone(),
        })
        .collect();

    store
        .replace_source_content(source_id, &topics, &chunks)
        .await
        .map_err(|e| e.to_string())?;

    // Update title from pipeline when useful.
    let _ = pipeline.title;

    let _ = store
        .update_source_status(source_id, "processing", 75, None)
        .await
        .map_err(|e| e.to_string())?;

    if let Err(err) = embed_source(store, source_id).await {
        let _ = store
            .update_source_status(source_id, "failed", 0, Some(err.clone()))
            .await;
        return Err(err);
    }

    let _ = store
        .update_source_status(source_id, "ready", 100, None)
        .await
        .map_err(|e| e.to_string())?;
    let _ = store
        .set_needs_reembed(source_id, false)
        .await
        .map_err(|e| e.to_string())?;

    tracing::info!(source_id = %source_id, chunks = chunks.len(), "ingest complete");
    Ok(())
}

async fn run_reembed(store: &Store, source_id: &str) -> Result<(), String> {
    let _ = store
        .update_source_status(source_id, "processing", 10, None)
        .await
        .map_err(|e| e.to_string())?;
    embed_source(store, source_id).await?;
    let _ = store
        .update_source_status(source_id, "ready", 100, None)
        .await
        .map_err(|e| e.to_string())?;
    let _ = store
        .set_needs_reembed(source_id, false)
        .await
        .map_err(|e| e.to_string())?;
    Ok(())
}

async fn persist_file(
    files_dir: &Path,
    source_id: &str,
    file_name: &str,
    bytes: &[u8],
) -> Result<(), String> {
    let dir = files_dir.join(source_id);
    tokio::fs::create_dir_all(&dir)
        .await
        .map_err(|e| format!("could not create upload directory: {e}"))?;
    let path = dir.join(sanitize_file_name(file_name));
    tokio::fs::write(&path, bytes)
        .await
        .map_err(|e| format!("could not write upload: {e}"))?;
    Ok(())
}

fn sanitize_file_name(name: &str) -> String {
    let base = std::path::Path::new(name)
        .file_name()
        .and_then(|s| s.to_str())
        .unwrap_or("upload.bin");
    base.chars()
        .map(|c| if r#"<>:"/\|?*"#.contains(c) { '_' } else { c })
        .collect()
}

pub async fn resolve_provider(store: &Store) -> Result<(ProviderConfig, String), String> {
    let settings = store.list_settings().await.map_err(|e| e.to_string())?;
    let default_id = settings
        .iter()
        .find(|s| s.key == "default_ai_provider_id")
        .map(|s| s.value.clone());

    let secret = if let Some(id) = default_id {
        store
            .get_provider_secret(&id)
            .await
            .map_err(|e| e.to_string())?
            .ok_or_else(|| "default AI provider missing".to_string())?
    } else {
        // Prefer mock when present, else first provider.
        let providers = store.list_providers().await.map_err(|e| e.to_string())?;
        let chosen = providers
            .iter()
            .find(|p| p.kind == "mock")
            .or_else(|| providers.first())
            .ok_or_else(|| "no AI provider configured".to_string())?;
        store
            .get_provider_secret(&chosen.id)
            .await
            .map_err(|e| e.to_string())?
            .ok_or_else(|| "AI provider missing".to_string())?
    };

    Ok(secret_to_config(secret))
}

fn secret_to_config(secret: AiProviderSecret) -> (ProviderConfig, String) {
    let kind = match secret.kind.as_str() {
        "ollama" => ProviderKind::Ollama,
        "openai_compatible" => ProviderKind::OpenAiCompatible,
        _ => ProviderKind::Mock,
    };
    let provider_model = format!("{}:{}", secret.kind, secret.embedding_model);
    (
        ProviderConfig {
            id: secret.id,
            name: secret.name,
            kind,
            base_url: secret.base_url,
            api_key: secret.api_key,
            chat_model: secret.chat_model,
            embedding_model: secret.embedding_model,
            embedding_dimensions: secret.embedding_dimensions.max(1) as usize,
        },
        provider_model,
    )
}

async fn embed_source(store: &Store, source_id: &str) -> Result<(), String> {
    let (config, provider_model) = resolve_provider(store).await?;
    let provider = build_provider(&config).map_err(|e| e.to_string())?;
    let chunks = store
        .list_chunks_for_embed(source_id)
        .await
        .map_err(|e| e.to_string())?;
    if chunks.is_empty() {
        return Ok(());
    }
    const BATCH: usize = 32;
    for batch in chunks.chunks(BATCH) {
        let texts: Vec<String> = batch.iter().map(|c| c.text.clone()).collect();
        let vectors = provider.embed(&texts).await.map_err(|e| e.to_string())?;
        for (chunk, vector) in batch.iter().zip(vectors.into_iter()) {
            store
                .upsert(&chunk.id, &provider_model, &vector)
                .await
                .map_err(|e| e.to_string())?;
        }
    }
    Ok(())
}
