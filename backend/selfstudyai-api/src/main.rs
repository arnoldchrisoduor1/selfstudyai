use axum::{routing::get, Router};
use sea_orm::{Database, DatabaseConnection};
use sea_orm_migration::prelude::*;
use shuttle_runtime::SecretStore;

mod migrations;
use migrations::Migrator;

async fn hello_world() -> &'static str {
    "Hello, world!"
}

async fn health_check() -> &'static str {
    "API is healthy!"
}

#[shuttle_runtime::main]
async fn main(
    #[shuttle_runtime::Secrets] secrets: SecretStore,
) -> shuttle_axum::ShuttleAxum {

    // Get database URL from secrets
    let database_url = secrets
        .get("DATABASE_URL")
        .expect("DATABASE_URL must be set in Secrets.toml");

    // Connecting to database
    tracing::info!("Connecting to database...");
    let db: DatabaseConnection = Database::connect(&database_url)
        .await
        .expect("Failed to connect to database");
    
    tracing::info!("Database connected successfully!");

    // running migrations.
    tracing::info!("Running migrations...");
    Migrator::up(&db, None)
        .await
        .expect("Failed to run migrations");
    tracing::info!("Migrations completed successfully!");

    // Creating router
    let router = Router::new()
        .route("/", get(hello_world))
        .route("/health", get(health_check));

    Ok(router.into())
}