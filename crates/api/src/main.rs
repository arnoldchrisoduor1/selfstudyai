use std::sync::Arc;

use api::config::Config;
use api::{log_dependencies, router, AppState};
use learning::FsrsScheduler;
use storage::{AiProviderRepository, NewAiProvider, Repository};
use study_core::build_clock_handle;
use tracing_subscriber::layer::SubscriberExt;
use tracing_subscriber::util::SubscriberInitExt;
use tracing_subscriber::EnvFilter;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    dotenvy::dotenv().ok();

    let config = Config::from_env()?;
    init_tracing(&config.app_env);
    config.log_summary();

    tokio::fs::create_dir_all(&config.files_dir).await?;

    let (clock, fake_clock) = build_clock_handle(&config.app_env);
    let store = storage::connect_with_clock(&config.database_url, clock).await?;
    store.ping().await?;
    ensure_mock_provider(&store).await?;

    let state = AppState::with_scheduler(
        store,
        config.files_dir.clone(),
        config.max_upload_bytes,
        Arc::new(FsrsScheduler),
        fake_clock,
    );
    log_dependencies(&state);

    let bind = config.bind;
    let app = router(state, &config.cors_origins);
    let listener = tokio::net::TcpListener::bind(bind).await?;
    tracing::info!(%bind, "api listening");

    axum::serve(listener, app)
        .with_graceful_shutdown(shutdown_signal())
        .await?;

    Ok(())
}

async fn ensure_mock_provider(store: &storage::Store) -> Result<(), storage::StorageError> {
    let providers = store.list_providers().await?;
    if providers.iter().any(|p| p.kind == "mock") {
        return Ok(());
    }
    let _ = store
        .create_provider(NewAiProvider {
            name: "Mock".into(),
            kind: "mock".into(),
            base_url: None,
            api_key: None,
            chat_model: "mock-chat".into(),
            embedding_model: "mock-embed".into(),
            embedding_dimensions: 32,
        })
        .await?;
    tracing::info!("seeded mock AI provider");
    Ok(())
}

fn init_tracing(app_env: &str) {
    let filter = EnvFilter::try_from_default_env().unwrap_or_else(|_| EnvFilter::new("info"));

    if app_env == "production" {
        tracing_subscriber::registry()
            .with(filter)
            .with(tracing_subscriber::fmt::layer().json())
            .init();
    } else {
        tracing_subscriber::registry()
            .with(filter)
            .with(tracing_subscriber::fmt::layer().pretty())
            .init();
    }
}

async fn shutdown_signal() {
    let ctrl_c = async {
        tokio::signal::ctrl_c()
            .await
            .expect("failed to install Ctrl+C handler");
    };

    #[cfg(unix)]
    let terminate = async {
        tokio::signal::unix::signal(tokio::signal::unix::SignalKind::terminate())
            .expect("failed to install signal handler")
            .recv()
            .await;
    };

    #[cfg(not(unix))]
    let terminate = std::future::pending::<()>();

    tokio::select! {
        _ = ctrl_c => {},
        _ = terminate => {},
    }

    tracing::info!("shutdown signal received");
}
