use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::Arc;

use learning::{FsrsScheduler, Scheduler};
use storage::Store;
use study_core::{Clock, FakeClock};
use tokio::sync::Mutex;

use crate::email::ConsoleSender;
use crate::payment::MockPaymentProvider;
use crate::rate_limit::RateLimiter;

#[derive(Clone)]
pub struct AppState {
    pub store: Store,
    pub clock: Arc<dyn Clock>,
    pub fake_clock: Option<Arc<FakeClock>>,
    pub scheduler: Arc<dyn Scheduler>,
    pub files_dir: PathBuf,
    pub max_upload_bytes: usize,
    pub default_provider_setting_key: Arc<str>,
    /// Serialize burst generation per session (React Strict Mode double-fetch).
    pub burst_locks: Arc<Mutex<HashMap<String, Arc<Mutex<()>>>>>,
    pub email: Arc<ConsoleSender>,
    pub payment: Arc<MockPaymentProvider>,
    pub ratelimit: RateLimiter,
    pub secure_cookies: bool,
    pub credits_daily_cap: i64,
    pub cloud_ai_enabled: bool,
}

impl AppState {
    pub fn new(store: Store, files_dir: PathBuf, max_upload_bytes: usize) -> Self {
        // Prefer shared FakeClock when store already carries one (non-prod connect).
        Self::with_scheduler(
            store,
            files_dir,
            max_upload_bytes,
            Arc::new(FsrsScheduler),
            None,
        )
    }

    pub fn with_scheduler(
        store: Store,
        files_dir: PathBuf,
        max_upload_bytes: usize,
        scheduler: Arc<dyn Scheduler>,
        fake_clock: Option<Arc<FakeClock>>,
    ) -> Self {
        let clock = fake_clock
            .as_ref()
            .map(|f| f.clone() as Arc<dyn Clock>)
            .unwrap_or_else(|| store.clock());
        let ratelimit = RateLimiter::new(store.clone());
        let secure = std::env::var("APP_ENV")
            .map(|v| v == "production")
            .unwrap_or(false);
        Self {
            store,
            clock,
            fake_clock,
            scheduler,
            files_dir,
            max_upload_bytes,
            default_provider_setting_key: Arc::from("default_ai_provider_id"),
            burst_locks: Arc::new(Mutex::new(HashMap::new())),
            email: Arc::new(ConsoleSender::new()),
            payment: Arc::new(MockPaymentProvider),
            ratelimit,
            secure_cookies: secure,
            credits_daily_cap: std::env::var("CREDITS_DAILY_CAP")
                .ok()
                .and_then(|v| v.parse().ok())
                .unwrap_or(500),
            cloud_ai_enabled: std::env::var("CLOUD_AI_API_KEY")
                .map(|v| !v.trim().is_empty())
                .unwrap_or(false),
        }
    }

    pub async fn session_burst_lock(&self, session_id: &str) -> Arc<Mutex<()>> {
        let mut map = self.burst_locks.lock().await;
        map.entry(session_id.to_owned())
            .or_insert_with(|| Arc::new(Mutex::new(())))
            .clone()
    }
}