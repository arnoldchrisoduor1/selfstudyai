use axum::{
    middleware::from_fn_with_state,
    routing::{get, post},
    Router,
};
use sea_orm::{Database, DatabaseConnection};
use sea_orm_migration::prelude::*;
use shuttle_runtime::SecretStore;
use tower_http::cors::{Any, CorsLayer};

mod dto;
mod entities;
mod middleware;
mod migrations;
mod routes;
mod services;

use migrations::Migrator;

#[derive(Clone)]
pub struct AppState {
    pub db: DatabaseConnection,
    pub jwt_secret: String,
}

async fn hello_world() -> &'static str {
    "StudyBuddy API v1.0"
}

async fn health_check() -> &'static str {
    "OK"
}

#[shuttle_runtime::main]
async fn main(
    #[shuttle_runtime::Secrets] secrets: SecretStore,
) -> shuttle_axum::ShuttleAxum {

    // Get secrets
    let database_url = secrets
        .get("DATABASE_URL")
        .expect("DATABASE_URL must be set in Secrets.toml");
    
    let jwt_secret = secrets
        .get("JWT_SECRET")
        .expect("JWT_SECRET must be set in Secrets.toml");

    // Connect to database
    tracing::info!("Connecting to database...");
    let db: DatabaseConnection = Database::connect(&database_url)
        .await
        .expect("Failed to connect to database");
    
    tracing::info!("Database connected successfully!");

    // Run migrations
    tracing::info!("Running migrations...");
    Migrator::up(&db, None)
        .await
        .expect("Failed to run migrations");
    tracing::info!("Migrations completed successfully!");

    // Create app state
    let state = AppState {
        db,
        jwt_secret,
    };

    // CORS configuration
    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    // Protected routes (require authentication)
    let protected_routes = Router::new()
        .route("/api/documents", post(routes::document::upload_document))
        .route("/api/documents", get(routes::document::get_documents))
        .layer(from_fn_with_state(
            state.clone(),
            middleware::auth::auth_middleware,
        ));

    // Public routes
    let public_routes = Router::new()
        .route("/", get(hello_world))
        .route("/health", get(health_check))
        .route("/api/auth/register", post(routes::auth::register))
        .route("/api/auth/login", post(routes::auth::login));

    // Combine routes
    let router = Router::new()
        .merge(public_routes)
        .merge(protected_routes)
        .layer(cors)
        .with_state(state);

    tracing::info!("Server starting...");

    Ok(router.into())
}