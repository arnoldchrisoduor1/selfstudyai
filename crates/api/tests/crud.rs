use axum::body::Body;
use axum::http::{Request, StatusCode};
use http_body_util::BodyExt;
use serde_json::{json, Value};
use tower::ServiceExt;

async fn app() -> axum::Router {
    let store = storage::connect("sqlite::memory:").await.expect("db");
    let files = tempfile::tempdir().expect("tmpdir");
    api::router(
        api::AppState::new(store, files.keep(), 10 * 1024 * 1024),
        &[],
    )
}

async fn json_body(response: axum::response::Response) -> Value {
    let bytes = response
        .into_body()
        .collect()
        .await
        .expect("body")
        .to_bytes();
    serde_json::from_slice(&bytes).unwrap_or(Value::Null)
}

#[tokio::test]
async fn healthz_ok() {
    let response = app()
        .await
        .oneshot(
            Request::builder()
                .uri("/healthz")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::OK);
    let body = json_body(response).await;
    assert_eq!(body["status"], "ok");
}

#[tokio::test]
async fn subject_create_and_fetch() {
    let app = app().await;
    let created = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/subjects")
                .header("content-type", "application/json")
                .body(Body::from(r#"{"name":"Algebra","description":"numbers"}"#))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(created.status(), StatusCode::CREATED);
    let body = json_body(created).await;
    let id = body["id"].as_str().expect("id");

    let fetched = app
        .oneshot(
            Request::builder()
                .uri(format!("/subjects/{id}"))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(fetched.status(), StatusCode::OK);
    let fetched_body = json_body(fetched).await;
    assert_eq!(fetched_body["name"], "Algebra");
}

#[tokio::test]
async fn blank_subject_is_rejected() {
    let response = app()
        .await
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/subjects")
                .header("content-type", "application/json")
                .body(Body::from(
                    json!({"name":"  ","description":null}).to_string(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::BAD_REQUEST);
}

#[tokio::test]
async fn missing_setting_is_not_found() {
    let response = app()
        .await
        .oneshot(
            Request::builder()
                .uri("/settings/missing")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::NOT_FOUND);
}
