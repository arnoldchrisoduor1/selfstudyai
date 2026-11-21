use std::net::SocketAddr;
use std::path::PathBuf;

use anyhow::Context;

#[derive(Debug, Clone)]
pub struct Config {
    pub app_env: String,
    pub bind: SocketAddr,
    pub database_url: String,
    pub cors_origins: Vec<String>,
    pub files_dir: PathBuf,
    pub max_upload_bytes: usize,
}

impl Config {
    pub fn from_env() -> anyhow::Result<Self> {
        let app_env = std::env::var("APP_ENV").unwrap_or_else(|_| "development".to_owned());
        let host = std::env::var("API_HOST").unwrap_or_else(|_| "127.0.0.1".to_owned());
        let port = std::env::var("API_PORT")
            .unwrap_or_else(|_| "18080".to_owned())
            .parse::<u16>()
            .context("API_PORT is not a valid port")?;
        let database_url = std::env::var("DATABASE_URL")
            .unwrap_or_else(|_| "sqlite://data/selfstudy.db?mode=rwc".to_owned());
        let cors_origins = std::env::var("CORS_ORIGINS").unwrap_or_else(|_| {
            "http://localhost:3000,http://127.0.0.1:3000,http://localhost:3001,http://127.0.0.1:3001,http://localhost:3010,http://127.0.0.1:3010,http://tauri.localhost,https://tauri.localhost"
                .to_owned()
        });
        let cors_origins = cors_origins
            .split(',')
            .map(str::trim)
            .filter(|origin| !origin.is_empty())
            .map(ToOwned::to_owned)
            .collect();
        let files_dir = std::env::var("FILES_DIR")
            .map(PathBuf::from)
            .unwrap_or_else(|_| PathBuf::from("data/files"));
        let max_upload_bytes = std::env::var("MAX_UPLOAD_BYTES")
            .unwrap_or_else(|_| (50 * 1024 * 1024).to_string())
            .parse::<usize>()
            .context("MAX_UPLOAD_BYTES is not a valid size")?;

        let bind = format!("{host}:{port}")
            .parse()
            .with_context(|| format!("invalid API bind {host}:{port}"))?;

        Ok(Self {
            app_env,
            bind,
            database_url,
            cors_origins,
            files_dir,
            max_upload_bytes,
        })
    }

    pub fn log_summary(&self) {
        tracing::info!(
            app_env = %self.app_env,
            bind = %self.bind,
            max_upload_bytes = self.max_upload_bytes,
            "api configured"
        );
    }
}
