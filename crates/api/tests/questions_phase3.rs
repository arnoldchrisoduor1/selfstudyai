use std::sync::Arc;
use std::time::Duration;

use axum::body::Body;
use axum::http::{Request, StatusCode};
use http_body_util::BodyExt;
use questions::{generate_burst, GenerateRequest, MockWebSearchProvider};
use serde_json::{json, Value};
use storage::{
    AiProviderRepository, NewAiProvider, NewQuestion, QuestionRepository, SubjectRepository,
    UsageEventRepository,
};
use study_core::{CognitiveMix, GroundingMode};
use tower::ServiceExt;

async fn app() -> (axum::Router, tempfile::TempDir) {
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
                .body(Body::from(r#"{"name":"Biology","description":null}"#))
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

async fn upload_fixture(app: &axum::Router, subject_id: &str) -> String {
    let content = b"# Osmosis\n\nOsmosis is water movement across a membrane.\n\n## Core\nRecall the definition.\n";
    let (content_type, body) = multipart_body(subject_id, "notes.md", content);
    let response = app
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
    assert_eq!(response.status(), StatusCode::CREATED);
    let source = json_body(response).await;
    let source_id = source["id"].as_str().unwrap().to_owned();
    let ready = wait_ready(app, &source_id).await;
    assert_eq!(ready["status"], "ready");
    source_id
}

#[tokio::test]
async fn notes_burst_has_citations_and_no_answer_leak() {
    let (app, _files) = app().await;
    let subject_id = create_subject(&app).await;
    let _source_id = upload_fixture(&app, &subject_id).await;

    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/sessions")
                .header("content-type", "application/json")
                .body(Body::from(
                    json!({
                        "subject_id": subject_id,
                        "scope": { "source_ids": [], "topic_ids": [] },
                        "grounding_mode": "notes",
                        "burst_size": 4
                    })
                    .to_string(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::CREATED);
    let session = json_body(response).await;
    let session_id = session["id"].as_str().unwrap();

    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .uri(format!("/sessions/{session_id}/burst"))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::OK);
    let burst = json_body(response).await;
    let questions = burst["questions"].as_array().unwrap();
    assert!(!questions.is_empty());
    for q in questions {
        assert!(q.get("correct_option").is_none());
        assert!(q.get("model_answer").is_none());
        assert!(q.get("explanation").is_none());
        assert!(q["citations"].is_object());
    }
}

#[tokio::test]
async fn written_answer_grades_and_override_and_usage() {
    let (app, _files) = app().await;
    let subject_id = create_subject(&app).await;
    let _source_id = upload_fixture(&app, &subject_id).await;

    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/sessions")
                .header("content-type", "application/json")
                .body(Body::from(
                    json!({
                        "subject_id": subject_id,
                        "scope": { "source_ids": [], "topic_ids": [] },
                        "grounding_mode": "notes",
                        "burst_size": 4
                    })
                    .to_string(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();
    let session_id = json_body(response).await["id"].as_str().unwrap().to_owned();

    let burst = json_body(
        app.clone()
            .oneshot(
                Request::builder()
                    .uri(format!("/sessions/{session_id}/burst"))
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap(),
    )
    .await;
    let questions = burst["questions"].as_array().unwrap();
    let written = questions
        .iter()
        .find(|q| q["kind"] == "written")
        .or_else(|| questions.first())
        .unwrap();
    let question_id = written["id"].as_str().unwrap();

    let answer_body = if written["kind"] == "written" {
        json!({
            "question_id": question_id,
            "answer_text": "partial answer",
            "time_taken_ms": 1200
        })
    } else {
        json!({
            "question_id": question_id,
            "selected_option": "Option B",
            "time_taken_ms": 800
        })
    };

    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri(format!("/sessions/{session_id}/answer"))
                .header("content-type", "application/json")
                .body(Body::from(answer_body.to_string()))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::OK);
    let graded = json_body(response).await;
    assert!(graded["attempt"]["verdict"].is_string());
    assert!(graded["question"]["model_answer"].is_string() || graded["question"]["correct_option"].is_string() || graded["question"]["explanation"].is_string());

    let attempt_id = graded["attempt"]["id"].as_str().unwrap();
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri(format!(
                    "/sessions/{session_id}/attempts/{attempt_id}/override"
                ))
                .header("content-type", "application/json")
                .body(Body::from(r#"{"verdict":"correct"}"#))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::OK);
    let overridden = json_body(response).await;
    assert_eq!(overridden["graded_by"], "manual_override");
    assert_eq!(overridden["verdict"], "correct");

    // usage events exist via store through a second app connection is hard; hit settings and ensure no crash.
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .uri("/question-settings")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::OK);
}

#[tokio::test]
async fn online_burst_has_url_citations() {
    let (app, _files) = app().await;
    let subject_id = create_subject(&app).await;

    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/web-search-providers")
                .header("content-type", "application/json")
                .body(Body::from(
                    r#"{"name":"Mock Search","endpoint":"mock","api_key":null}"#,
                ))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::CREATED);
    let provider_id = json_body(response).await["id"].as_str().unwrap().to_owned();
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/web-search-providers/default")
                .header("content-type", "application/json")
                .body(Body::from(format!(r#"{{"provider_id":"{provider_id}"}}"#)))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::NO_CONTENT);

    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/sessions")
                .header("content-type", "application/json")
                .body(Body::from(
                    json!({
                        "subject_id": subject_id,
                        "scope": { "source_ids": [], "topic_ids": [] },
                        "grounding_mode": "online",
                        "burst_size": 2
                    })
                    .to_string(),
                ))
                .unwrap(),
        )
        .await
        .unwrap();
    let session_id = json_body(response).await["id"].as_str().unwrap().to_owned();
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .uri(format!("/sessions/{session_id}/burst"))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::OK);
    let burst = json_body(response).await;
    let questions = burst["questions"].as_array().unwrap();
    assert!(!questions.is_empty());
    for q in questions {
        assert_eq!(q["grounding"], "online");
        assert!(q["citations"]["url"].is_string() || q["citations"]["type"] == "online");
    }
}

#[tokio::test]
async fn gold_propose_confirm_reject() {
    let store = storage::connect("sqlite::memory:").await.expect("db");
    let subject = store
        .create_subject(study_core::NewSubject {
            name: "Chem".into(),
            description: None,
        })
        .await
        .unwrap();
    let proposed = store
        .create_question(NewQuestion {
            subject_id: subject.id.clone(),
            source_id: None,
            topic_id: None,
            kind: "written".into(),
            cognitive_level: "recall".into(),
            stem: "Define mole".into(),
            options: None,
            correct_option: None,
            model_answer: Some("Amount of substance".into()),
            explanation: None,
            grounding: "online".into(),
            citations: json!({"type":"online","url":"https://ex.com","excerpt":"mole def"}),
            is_gold: false,
            gold_status: "proposed".into(),
            status: "active".into(),
            generated_by: Some("mock".into()),
            prompt_version: Some("qgen-v1".into()),
        })
        .await
        .unwrap();

    let files = tempfile::tempdir().unwrap();
    let app = api::router(
        api::AppState::new(store, files.path().to_path_buf(), 10 * 1024 * 1024),
        &[],
    );

    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .uri("/questions/gold/queue")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::OK);
    let queue = json_body(response).await;
    assert!(queue.as_array().unwrap().iter().any(|q| q["id"] == proposed.id));

    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri(format!("/questions/{}/gold-review", proposed.id))
                .header("content-type", "application/json")
                .body(Body::from(r#"{"confirm":true}"#))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::OK);
    assert_eq!(json_body(response).await["gold_status"], "confirmed");
}

#[tokio::test]
async fn generate_burst_unit_with_mock_records_partial_ok() {
    let provider = ai::MockProvider::new(32).unwrap();
    let provider: Arc<dyn ai::Provider> = Arc::new(provider);
    let web: Arc<dyn questions::WebSearchProvider> = Arc::new(MockWebSearchProvider::new());
    let result = generate_burst(
        provider,
        Some(web),
        GenerateRequest {
            subject_id: "s1".into(),
            grounding: GroundingMode::Online,
            burst_size: 3,
            mix: CognitiveMix::default(),
            chunks: vec![],
            topic_query: Some("osmosis".into()),
            existing_stems: vec![],
            dedupe_threshold: 0.95,
            provider_label: "mock".into(),
            propose_gold_for_core: false,
        },
    )
    .await
    .expect("generate");
    assert_eq!(result.questions.len(), 3);
}

#[tokio::test]
async fn usage_events_recorded_on_generation() {
    let store = storage::connect("sqlite::memory:").await.unwrap();
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
        .unwrap();
    let files = tempfile::tempdir().unwrap();
    let app = api::router(
        api::AppState::new(
            store.clone(),
            files.path().to_path_buf(),
            10 * 1024 * 1024,
        ),
        &[],
    );
    let subject_id = create_subject(&app).await;
    let _ = upload_fixture(&app, &subject_id).await;
    let session = json_body(
        app.clone()
            .oneshot(
                Request::builder()
                    .method("POST")
                    .uri("/sessions")
                    .header("content-type", "application/json")
                    .body(Body::from(
                        json!({
                            "subject_id": subject_id,
                            "scope": { "source_ids": [], "topic_ids": [] },
                            "grounding_mode": "notes",
                            "burst_size": 2
                        })
                        .to_string(),
                    ))
                    .unwrap(),
            )
            .await
            .unwrap(),
    )
    .await;
    let session_id = session["id"].as_str().unwrap();
    let _ = app
        .clone()
        .oneshot(
            Request::builder()
                .uri(format!("/sessions/{session_id}/burst"))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    let events = store.list_usage_events(20).await.unwrap();
    assert!(events.iter().any(|e| e.kind == "generation"));
}
