use axum::extract::State;
use axum::Json;
use chrono::{DateTime, Duration, Utc};
use serde::Deserialize;
use study_core::Clock;

use crate::error::ApiError;
use crate::state::AppState;

#[derive(Debug, Deserialize)]
pub struct ClockBody {
    pub iso: String,
}

#[derive(Debug, Deserialize)]
pub struct AdvanceBody {
    pub seconds: Option<i64>,
    pub hours: Option<i64>,
    pub days: Option<i64>,
}

fn dev_allowed() -> bool {
    !std::env::var("APP_ENV")
        .unwrap_or_else(|_| "development".into())
        .eq_ignore_ascii_case("production")
}

pub async fn set_clock(
    State(state): State<AppState>,
    Json(body): Json<ClockBody>,
) -> Result<Json<serde_json::Value>, ApiError> {
    if !dev_allowed() {
        return Err(ApiError::Invalid("clock override disabled"));
    }
    let fake = state
        .fake_clock
        .as_ref()
        .ok_or(ApiError::Invalid("no fake clock; set STUDY_CLOCK_ISO or connect_with_clock"))?;
    let dt = DateTime::parse_from_rfc3339(body.iso.trim())
        .map(|d| d.with_timezone(&Utc))
        .map_err(|_| ApiError::Invalid("iso must be RFC3339"))?;
    fake.set(dt);
    Ok(Json(serde_json::json!({ "now": fake.now_rfc3339() })))
}

pub async fn advance_clock(
    State(state): State<AppState>,
    Json(body): Json<AdvanceBody>,
) -> Result<Json<serde_json::Value>, ApiError> {
    if !dev_allowed() {
        return Err(ApiError::Invalid("clock override disabled"));
    }
    let fake = state
        .fake_clock
        .as_ref()
        .ok_or(ApiError::Invalid("no fake clock"))?;
    let secs = body.seconds.unwrap_or(0)
        + body.hours.unwrap_or(0) * 3600
        + body.days.unwrap_or(0) * 86_400;
    if secs == 0 {
        return Err(ApiError::Invalid("advance amount required"));
    }
    fake.advance(Duration::seconds(secs));
    Ok(Json(serde_json::json!({ "now": fake.now_rfc3339() })))
}
