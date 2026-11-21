use axum::extract::State;
use axum::Json;
use study_core::{SearchHit, SearchQuery};

use crate::error::ApiError;
use crate::jobs::resolve_provider;
use crate::state::AppState;
use ai::build_provider;
use storage::SearchRepository;

pub async fn search(
    State(state): State<AppState>,
    Json(body): Json<SearchQuery>,
) -> Result<Json<Vec<SearchHit>>, ApiError> {
    let query = body
        .normalized()
        .map_err(ApiError::Invalid)?;

    let (vector, model) = match resolve_provider(&state.store).await {
        Ok((config, provider_model)) => match build_provider(&config) {
            Ok(provider) => {
                match provider.embed(std::slice::from_ref(&query.query)).await {
                    Ok(mut vectors) => (vectors.pop(), Some(provider_model)),
                    Err(err) => {
                        tracing::warn!(error = %err, "search embed failed; keyword only");
                        (None, None)
                    }
                }
            }
            Err(err) => {
                tracing::warn!(error = %err, "search provider unavailable; keyword only");
                (None, None)
            }
        },
        Err(_) => (None, None),
    };

    let hits = state
        .store
        .hybrid_search(query, vector.as_deref(), model.as_deref())
        .await?;
    Ok(Json(hits))
}
