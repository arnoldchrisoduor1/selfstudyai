use std::time::Duration;

use axum::body::Body;
use axum::http::{Request, StatusCode};
use http_body_util::BodyExt;
use serde_json::{json, Value};
use storage::{AiProviderRepository, NewAiProvider};
use tower::ServiceExt;

async fn app_with_files() -> (axum::Router, tempfile::TempDir) {
    let store = storage::connect("sqlite::memory:").await.expect("db");
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
        .await
        .expect("provider");
    let files = tempfile::tempdir().expect("tmpdir");
    let router = api::router(
        api::AppState::new(store, files.path().to_path_buf(), 10 * 1024 * 1024),
        &[],
    );
    (router, files)
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

async fn create_subject(app: &axum::Router) -> String {
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/subjects")
                .header("content-type", "application/json")
                .body(Body::from(r#"{"name":"Physics","description":null}"#))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::CREATED);
    json_body(response).await["id"].as_str().unwrap().to_owned()
}

fn multipart_body(subject_id: &str, file_name: &str, bytes: &[u8]) -> (String, Vec<u8>) {
    let boundary = "----boundary";
    let mut body = Vec::new();
    body.extend_from_slice(
        format!(
            "--{boundary}\r\nContent-Disposition: form-data; name=\"subject_id\"\r\n\r\n{subject_id}\r\n"
        )
        .as_bytes(),
    );
    body.extend_from_slice(
        format!(
            "--{boundary}\r\nContent-Disposition: form-data; name=\"file\"; filename=\"{file_name}\"\r\nContent-Type: text/plain\r\n\r\n"
        )
        .as_bytes(),
    );
    body.extend_from_slice(bytes);
    body.extend_from_slice(format!("\r\n--{boundary}--\r\n").as_bytes());
    (format!("multipart/form-data; boundary={boundary}"), body)
}

async fn wait_ready(app: &axum::Router, source_id: &str) -> Value {
    for _ in 0..40 {
        let response = app
            .clone()
            .oneshot(
                Request::builder()
                    .uri(format!("/sources/{source_id}"))
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();
        let body = json_body(response).await;
        if body["status"] == "ready" || body["status"] == "failed" {
            return body;
        }
        tokio::time::sleep(Duration::from_millis(100)).await;
    }
    panic!("source not ready in time");
}

#[tokio::test]
async fn upload_ready_search_pipeline() {
    let (app, _files) = app_with_files().await;
    let subject_id = create_subject(&app).await;
    let notes = b"# Gravity\n\nGravity pulls masses together with force.\n\n## Orbit\n\nOrbit is falling sideways forever around a planet.\n";
    let (content_type, body) = multipart_body(&subject_id, "gravity.md", notes);
    let uploaded = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/sources")
                .header("content-type", content_type)
                .body(Body::from(body))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(uploaded.status(), StatusCode::CREATED);
    let source = json_body(uploaded).await;
    let source_id = source["id"].as_str().unwrap();

    let ready = wait_ready(&app, source_id).await;
    assert_eq!(ready["status"], "ready", "{ready}");

    let search = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/search")
                .header("content-type", "application/json")
                .body(Body::from(
                    json!({ "query": "orbit falling", "subject_id": subject_id, "limit": 5 })
                        .to_string(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(search.status(), StatusCode::OK);
    let hits = json_body(search).await;
    assert!(hits.as_array().unwrap().len() >= 1, "{hits}");
}

#[tokio::test]
async fn duplicate_upload_conflicts() {
    let (app, _files) = app_with_files().await;
    let subject_id = create_subject(&app).await;
    let bytes = b"same notes body";
    let (content_type, body) = multipart_body(&subject_id, "a.txt", bytes);
    let first = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/sources")
                .header("content-type", content_type.clone())
                .body(Body::from(body.clone()))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(first.status(), StatusCode::CREATED);

    let second = app
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/sources")
                .header("content-type", content_type)
                .body(Body::from(body))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(second.status(), StatusCode::CONFLICT);
}

#[tokio::test]
async fn failed_parse_sets_failed_status() {
    let (app, _files) = app_with_files().await;
    let subject_id = create_subject(&app).await;
    let (content_type, body) = multipart_body(&subject_id, "broken.pdf", b"%PDF-1.4 not a real pdf");
    let uploaded = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/sources")
                .header("content-type", content_type)
                .body(Body::from(body))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(uploaded.status(), StatusCode::CREATED);
    let source_id = json_body(uploaded).await["id"].as_str().unwrap().to_owned();
    let ready = wait_ready(&app, &source_id).await;
    assert_eq!(ready["status"], "failed", "{ready}");
    assert!(ready["error"].as_str().unwrap().len() > 0);
}

#[tokio::test]
async fn embedding_model_change_flags_reembed() {
    let (app, _files) = app_with_files().await;
    let subject_id = create_subject(&app).await;
    let (content_type, body) = multipart_body(&subject_id, "notes.txt", b"Alpha beta gamma delta.");
    let uploaded = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/sources")
                .header("content-type", content_type)
                .body(Body::from(body))
                .unwrap(),
        )
        .await
        .unwrap();
    let source_id = json_body(uploaded).await["id"].as_str().unwrap().to_owned();
    let ready = wait_ready(&app, &source_id).await;
    assert_eq!(ready["status"], "ready");

    let providers = app
        .clone()
        .oneshot(
            Request::builder()
                .uri("/ai-providers")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    let list = json_body(providers).await;
    let provider_id = list[0]["id"].as_str().unwrap();

    let updated = app
        .clone()
        .oneshot(
            Request::builder()
                .method("PATCH")
                .uri(format!("/ai-providers/{provider_id}"))
                .header("content-type", "application/json")
                .body(Body::from(r#"{"embedding_model":"mock-embed-v2"}"#))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(updated.status(), StatusCode::OK);

    let source = app
        .oneshot(
            Request::builder()
                .uri(format!("/sources/{source_id}"))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    let body = json_body(source).await;
    assert_eq!(body["needs_reembed"], true);
}
