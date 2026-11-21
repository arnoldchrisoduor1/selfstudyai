use axum::body::Body;
use axum::http::{Request, StatusCode};
use http_body_util::BodyExt;
use serde_json::Value;
use std::sync::Arc;
use storage::connect;
use tower::ServiceExt;

use api::{router, AppState, ConsoleSender};

async fn app_with_email(email: Arc<ConsoleSender>) -> axum::Router {
    let store = connect("sqlite::memory:").await.expect("db");
    let mut state = AppState::new(store, "data/files".into(), 1024);
    state.email = email;
    router(state, &["http://localhost:3000".into()])
}

async fn app() -> axum::Router {
    app_with_email(Arc::new(ConsoleSender::new())).await
}

async fn response_json(res: axum::response::Response) -> Value {
    let bytes = res.into_body().collect().await.unwrap().to_bytes();
    serde_json::from_slice(&bytes).unwrap()
}

async fn sign_up(app: &axum::Router, email: &str, password: &str) -> Value {
    let sign_up = Request::builder()
        .method("POST")
        .uri("/auth/sign-up")
        .header("content-type", "application/json")
        .body(Body::from(
            serde_json::json!({ "email": email, "password": password }).to_string(),
        ))
        .unwrap();
    let res = app.clone().oneshot(sign_up).await.unwrap();
    assert_eq!(res.status(), StatusCode::OK);
    response_json(res).await
}

async fn sign_in_cookie(app: &axum::Router, email: &str, password: &str) -> String {
    let sign_in = Request::builder()
        .method("POST")
        .uri("/auth/sign-in")
        .header("content-type", "application/json")
        .body(Body::from(
            serde_json::json!({ "email": email, "password": password }).to_string(),
        ))
        .unwrap();
    let res = app.clone().oneshot(sign_in).await.unwrap();
    assert_eq!(res.status(), StatusCode::OK);
    res.headers()
        .get("set-cookie")
        .and_then(|v| v.to_str().ok())
        .expect("session cookie")
        .to_string()
}

#[tokio::test]
async fn sign_up_sign_in_me_round_trip() {
    let app = app().await;
    let _ = sign_up(&app, "phase5@example.com", "password-long-enough").await;

    let cookie = sign_in_cookie(&app, "phase5@example.com", "password-long-enough").await;
    assert!(cookie.contains("study_session="));

    let me = Request::builder()
        .method("GET")
        .uri("/auth/me")
        .header("cookie", cookie)
        .body(Body::empty())
        .unwrap();
    let res = app.oneshot(me).await.unwrap();
    assert_eq!(res.status(), StatusCode::OK);
    let body = response_json(res).await;
    assert_eq!(body["user"]["email"], "phase5@example.com");
}

#[tokio::test]
async fn password_reset_via_console_token() {
    let email_sender = Arc::new(ConsoleSender::new());
    let app = app_with_email(email_sender.clone()).await;
    sign_up(&app, "reset@example.com", "password-long-enough").await;

    let reset_req = Request::builder()
        .method("POST")
        .uri("/auth/password-reset")
        .header("content-type", "application/json")
        .body(Body::from(
            serde_json::json!({ "email": "reset@example.com" }).to_string(),
        ))
        .unwrap();
    let res = app.clone().oneshot(reset_req).await.unwrap();
    assert_eq!(res.status(), StatusCode::NO_CONTENT);

    let body = email_sender
        .take_last_body()
        .await
        .expect("reset email body");
    let token = body
        .strip_prefix("Reset token: ")
        .expect("reset token prefix");

    let confirm = Request::builder()
        .method("POST")
        .uri("/auth/password-reset/confirm")
        .header("content-type", "application/json")
        .body(Body::from(
            serde_json::json!({
                "token": token,
                "new_password": "new-password-long"
            })
            .to_string(),
        ))
        .unwrap();
    let res = app.clone().oneshot(confirm).await.unwrap();
    assert_eq!(res.status(), StatusCode::NO_CONTENT);

    let sign_in_old = Request::builder()
        .method("POST")
        .uri("/auth/sign-in")
        .header("content-type", "application/json")
        .body(Body::from(
            serde_json::json!({
                "email": "reset@example.com",
                "password": "password-long-enough"
            })
            .to_string(),
        ))
        .unwrap();
    let res = app.clone().oneshot(sign_in_old).await.unwrap();
    assert_eq!(res.status(), StatusCode::BAD_REQUEST);

    let cookie = sign_in_cookie(&app, "reset@example.com", "new-password-long").await;
    assert!(cookie.contains("study_session="));
}

#[tokio::test]
async fn subject_isolation_between_users() {
    let app = app().await;
    let _ = sign_up(&app, "alice@example.com", "password-long-enough").await;
    let _ = sign_up(&app, "bob@example.com", "password-long-enough").await;
    let cookie_a = sign_in_cookie(&app, "alice@example.com", "password-long-enough").await;
    let cookie_b = sign_in_cookie(&app, "bob@example.com", "password-long-enough").await;

    let create_a = Request::builder()
        .method("POST")
        .uri("/subjects")
        .header("content-type", "application/json")
        .header("cookie", &cookie_a)
        .body(Body::from(
            serde_json::json!({ "name": "Alice subject", "description": null }).to_string(),
        ))
        .unwrap();
    let res = app.clone().oneshot(create_a).await.unwrap();
    assert_eq!(res.status(), StatusCode::CREATED);
    let subject_a = response_json(res).await;
    let subject_a_id = subject_a["id"].as_str().unwrap();

    let peek_b = Request::builder()
        .method("GET")
        .uri(format!("/subjects/{subject_a_id}"))
        .header("cookie", &cookie_b)
        .body(Body::empty())
        .unwrap();
    let res = app.clone().oneshot(peek_b).await.unwrap();
    assert_eq!(res.status(), StatusCode::NOT_FOUND);

    let list_b = Request::builder()
        .method("GET")
        .uri("/subjects")
        .header("cookie", &cookie_b)
        .body(Body::empty())
        .unwrap();
    let res = app.oneshot(list_b).await.unwrap();
    let body = response_json(res).await;
    assert!(body.as_array().unwrap().is_empty());
}

#[tokio::test]
async fn credits_topup_shows_balance() {
    let app = app().await;
    sign_up(&app, "credits@example.com", "password-long-enough").await;
    let cookie = sign_in_cookie(&app, "credits@example.com", "password-long-enough").await;

    let topup = Request::builder()
        .method("POST")
        .uri("/credits/topup")
        .header("content-type", "application/json")
        .header("cookie", &cookie)
        .body(Body::from(
            serde_json::json!({ "amount_credits": 25, "idempotency_key": "t1" }).to_string(),
        ))
        .unwrap();
    let res = app.clone().oneshot(topup).await.unwrap();
    assert_eq!(res.status(), StatusCode::OK);

    let balance = Request::builder()
        .method("GET")
        .uri("/credits/balance")
        .header("cookie", &cookie)
        .body(Body::empty())
        .unwrap();
    let res = app.oneshot(balance).await.unwrap();
    assert_eq!(res.status(), StatusCode::OK);
    let body = response_json(res).await;
    assert!(body["balance"].as_i64().unwrap() >= 25);
}

#[tokio::test]
async fn sync_pull_after_tenant_subject_create() {
    let app = app().await;
    sign_up(&app, "sync@example.com", "password-long-enough").await;
    let cookie = sign_in_cookie(&app, "sync@example.com", "password-long-enough").await;

    let create = Request::builder()
        .method("POST")
        .uri("/subjects")
        .header("content-type", "application/json")
        .header("cookie", &cookie)
        .body(Body::from(
            serde_json::json!({ "name": "Sync subject", "description": null }).to_string(),
        ))
        .unwrap();
    let res = app.clone().oneshot(create).await.unwrap();
    assert_eq!(res.status(), StatusCode::CREATED);

    let pull = Request::builder()
        .method("POST")
        .uri("/sync/pull")
        .header("content-type", "application/json")
        .header("cookie", &cookie)
        .body(Body::from(
            serde_json::json!({
                "device_id": "dev-1",
                "cursor": null,
                "limit": 50
            })
            .to_string(),
        ))
        .unwrap();
    let res = app.clone().oneshot(pull).await.unwrap();
    assert_eq!(res.status(), StatusCode::OK);
    let body = response_json(res).await;
    let records = body["records"].as_array().unwrap();
    assert!(records.iter().any(|r| r["table"] == "subjects"));

    let push = Request::builder()
        .method("POST")
        .uri("/sync/push")
        .header("content-type", "application/json")
        .header("cookie", &cookie)
        .body(Body::from(
            serde_json::json!({
                "device_id": "dev-1",
                "records": []
            })
            .to_string(),
        ))
        .unwrap();
    let res = app.oneshot(push).await.unwrap();
    assert_eq!(res.status(), StatusCode::OK);
}