use std::time::Instant;

use axum::extract::Request;
use axum::middleware::Next;
use axum::response::Response;

use crate::middleware::request_id::RequestId;

pub async fn log_request(req: Request, next: Next) -> Response {
    let start = Instant::now();
    let method = req.method().clone();
    let path = req.uri().path().to_owned();
    let request_id = req
        .extensions()
        .get::<RequestId>()
        .map(|id| id.0.clone())
        .unwrap_or_else(|| "-".to_owned());
    let is_health = path == "/healthz";

    let res = next.run(req).await;
    let status = res.status().as_u16();
    let latency_ms = u64::try_from(start.elapsed().as_millis()).unwrap_or(u64::MAX);

    if is_health {
        tracing::debug!(
            %request_id,
            %method,
            %path,
            status,
            latency_ms,
            "request completed"
        );
    } else if status >= 500 {
        tracing::error!(
            %request_id,
            %method,
            %path,
            status,
            latency_ms,
            "request completed"
        );
    } else if status >= 400 {
        tracing::warn!(
            %request_id,
            %method,
            %path,
            status,
            latency_ms,
            "request completed"
        );
    } else {
        tracing::info!(
            %request_id,
            %method,
            %path,
            status,
            latency_ms,
            "request completed"
        );
    }

    res
}
