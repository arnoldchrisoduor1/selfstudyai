//! Time abstraction for scheduling, streaks, and timers.
//! Business logic must never call wall-clock APIs directly.

use chrono::{DateTime, Duration, Utc};
use std::sync::{Arc, Mutex};

/// Instant source used by all time-dependent domain logic.
pub trait Clock: Send + Sync {
    fn now_utc(&self) -> DateTime<Utc>;

    fn now_rfc3339(&self) -> String {
        self.now_utc().format("%Y-%m-%dT%H:%M:%SZ").to_string()
    }
}

/// Production clock.
#[derive(Debug, Default, Clone, Copy)]
pub struct SystemClock;

impl Clock for SystemClock {
    fn now_utc(&self) -> DateTime<Utc> {
        Utc::now()
    }
}

/// Mutable clock for tests and non-production overrides.
#[derive(Debug)]
pub struct FakeClock {
    inner: Mutex<DateTime<Utc>>,
}

impl FakeClock {
    pub fn new(now: DateTime<Utc>) -> Self {
        Self {
            inner: Mutex::new(now),
        }
    }

    pub fn set(&self, now: DateTime<Utc>) {
        *self.inner.lock().expect("fake clock lock") = now;
    }

    pub fn advance(&self, duration: Duration) {
        let mut guard = self.inner.lock().expect("fake clock lock");
        *guard += duration;
    }
}

impl Clock for FakeClock {
    fn now_utc(&self) -> DateTime<Utc> {
        *self.inner.lock().expect("fake clock lock")
    }
}

/// Parse optional `STUDY_CLOCK_ISO` into a UTC instant.
pub fn parse_clock_iso(raw: &str) -> Option<DateTime<Utc>> {
    let trimmed = raw.trim();
    if trimmed.is_empty() {
        return None;
    }
    if let Ok(dt) = DateTime::parse_from_rfc3339(trimmed) {
        return Some(dt.with_timezone(&Utc));
    }
    if let Ok(naive) = chrono::NaiveDateTime::parse_from_str(trimmed, "%Y-%m-%dT%H:%M:%SZ") {
        return Some(DateTime::<Utc>::from_naive_utc_and_offset(naive, Utc));
    }
    None
}

/// Env: `STUDY_CLOCK_ISO` (RFC3339 / `%Y-%m-%dT%H:%M:%SZ`).
/// Hard-disabled when `app_env == "production"`.
/// Non-production without ISO still returns SystemClock; use `build_clock_handle` for mutable override.
pub fn build_clock(app_env: &str) -> Arc<dyn Clock> {
    build_clock_handle(app_env).0
}

/// Same as `build_clock`, but also returns `FakeClock` when overrides are allowed.
/// Non-production always uses a `FakeClock` (seeded from `STUDY_CLOCK_ISO` or wall now)
/// so `/dev/clock` can advance time in e2e.
pub fn build_clock_handle(app_env: &str) -> (Arc<dyn Clock>, Option<Arc<FakeClock>>) {
    if app_env.eq_ignore_ascii_case("production") {
        return (Arc::new(SystemClock), None);
    }
    let start = std::env::var("STUDY_CLOCK_ISO")
        .ok()
        .as_deref()
        .and_then(parse_clock_iso)
        .unwrap_or_else(Utc::now);
    let fake = Arc::new(FakeClock::new(start));
    (fake.clone() as Arc<dyn Clock>, Some(fake))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn fake_clock_advances() {
        let start = DateTime::parse_from_rfc3339("2026-01-01T00:00:00Z")
            .unwrap()
            .with_timezone(&Utc);
        let clock = FakeClock::new(start);
        clock.advance(Duration::hours(25));
        assert_eq!(
            clock.now_rfc3339(),
            "2026-01-02T01:00:00Z"
        );
    }

    #[test]
    fn production_ignores_env_override() {
        std::env::set_var("STUDY_CLOCK_ISO", "2020-01-01T00:00:00Z");
        let clock = build_clock("production");
        assert_ne!(clock.now_rfc3339(), "2020-01-01T00:00:00Z");
        std::env::remove_var("STUDY_CLOCK_ISO");
    }
}
