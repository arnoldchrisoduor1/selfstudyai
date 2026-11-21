pub mod config;
mod auth_context;
mod auth_util;
mod email;
mod error;
mod jobs;
mod middleware;
mod payment;
mod rate_limit;
mod routes;
pub mod learning_services;
pub mod services;
mod state;
mod tenant_scope;

use axum::middleware::from_fn;
use axum::Router;
use http::header::{ACCEPT, AUTHORIZATION, CONTENT_TYPE, COOKIE};
use http::{HeaderValue, Method};
use storage::Repository;
use tower_http::cors::CorsLayer;

pub use email::ConsoleSender;
pub use state::AppState;

use crate::middleware::access_log::log_request;
use crate::middleware::request_id::attach_request_id;

pub fn router(state: AppState, cors_origins: &[String]) -> Router {
    let mut app = routes::routes().with_state(state.clone());
    app = app.layer(from_fn(log_request));
    app = app.layer(from_fn(attach_request_id));
    if let Some(cors) = cors_layer(cors_origins) {
        app = app.layer(cors);
    }
    app
}

fn cors_layer(origins: &[String]) -> Option<CorsLayer> {
    let mut parsed = Vec::new();
    for origin in origins {
        match origin.parse::<HeaderValue>() {
            Ok(value) => parsed.push(value),
            Err(_) => tracing::warn!(origin, "cors origin skipped"),
        }
    }
    if parsed.is_empty() {
        return None;
    }
    Some(
        CorsLayer::new()
            .allow_origin(parsed)
            .allow_credentials(true)
            .allow_methods([
                Method::GET,
                Method::POST,
                Method::PATCH,
                Method::DELETE,
                Method::OPTIONS,
            ])
            .allow_headers([CONTENT_TYPE, ACCEPT, AUTHORIZATION, COOKIE]),
    )
}

pub fn log_dependencies(state: &AppState) {
    tracing::info!(
        domain = "study_core",
        backend = state.store.backend(),
        ingest = ingest::IngestPipeline::status(),
        "dependencies ready"
    );
}
