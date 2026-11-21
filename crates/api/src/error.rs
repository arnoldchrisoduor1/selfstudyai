use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};
use axum::Json;
use serde_json::json;
use storage::StorageError;

#[derive(Debug)]
pub enum ApiError {
    NotFound,
    Unauthorized,
    Invalid(&'static str),
    InvalidOwned(String),
    Conflict,
    Storage(StorageError),
    Upstream(String),
}

impl From<StorageError> for ApiError {
    fn from(err: StorageError) -> Self {
        match err {
            StorageError::Invalid(message) => Self::Invalid(message),
            StorageError::Conflict => Self::Conflict,
            other => Self::Storage(other),
        }
    }
}

impl From<questions::QuestionsError> for ApiError {
    fn from(err: questions::QuestionsError) -> Self {
        match err {
            questions::QuestionsError::Invalid(message) => Self::Invalid(message),
            questions::QuestionsError::Validation(message) => Self::InvalidOwned(message),
            other => Self::Upstream(other.to_string()),
        }
    }
}

impl IntoResponse for ApiError {
    fn into_response(self) -> Response {
        let (status, body) = match self {
            Self::NotFound => (StatusCode::NOT_FOUND, json!({ "error": "not_found" })),
            Self::Unauthorized => (StatusCode::UNAUTHORIZED, json!({ "error": "unauthorized" })),
            Self::Invalid(message) => (
                StatusCode::BAD_REQUEST,
                json!({ "error": "invalid", "message": message }),
            ),
            Self::InvalidOwned(message) => (
                StatusCode::BAD_REQUEST,
                json!({ "error": "invalid", "message": message }),
            ),
            Self::Conflict => (StatusCode::CONFLICT, json!({ "error": "conflict" })),
            Self::Storage(err) => {
                tracing::error!(error = %err, "request failed");
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    json!({ "error": "storage_error" }),
                )
            }
            Self::Upstream(message) => {
                tracing::error!(error = %message, "upstream failed");
                (
                    StatusCode::BAD_GATEWAY,
                    json!({ "error": "upstream_error", "message": message }),
                )
            }
        };
        (status, Json(body)).into_response()
    }
}
