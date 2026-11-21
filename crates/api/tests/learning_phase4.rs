use std::sync::Arc;

use axum::body::Body;
use axum::http::{Request, StatusCode};
use chrono::{DateTime, Duration, Utc};
use http_body_util::BodyExt;
use serde_json::{json, Value};
use storage::{
    CardStateRepository, FinalTestRepository, LearningSettingsRepository, NewQuestion,
    PointsLedgerRepository, QuestionRepository, ReviewLogRepository, StudySessionRepository,
    SubjectRepository, TestQuestionRepository,
};
use study_core::{FakeClock, LearningSettingsPatch, QuestionKind, SETTING_DAILY_GOAL};
use tower::ServiceExt;

async fn app_with_clock(
    start: DateTime<Utc>,
) -> (axum::Router, Arc<FakeClock>, tempfile::TempDir) {
    let fake = Arc::new(FakeClock::new(start));
    let store = storage::connect_with_clock("sqlite::memory:", fake.clone() as Arc<dyn study_core::Clock>)
        .await
        .expect("db");
    let files = tempfile::tempdir().expect("tmpdir");
    let state = api::AppState::with_scheduler(
        store,
        files.path().to_path_buf(),
        10 * 1024 * 1024,
        Arc::new(learning::FsrsScheduler),
        Some(fake.clone()),
    );
    let router = api::router(state, &[]);
    (router, fake, files)
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

fn empty_scope() -> study_core::SessionScope {
    study_core::SessionScope {
        topic_ids: vec![],
        source_ids: vec![],
    }
}

fn mcq(subject_id: &str, stem: &str, correct: &str) -> NewQuestion {
    NewQuestion {
        subject_id: subject_id.to_owned(),
        source_id: None,
        topic_id: None,
        kind: QuestionKind::Mcq.as_str().to_owned(),
        cognitive_level: "recall".into(),
        stem: stem.into(),
        options: Some(json!(["a", "b"])),
        correct_option: Some(correct.into()),
        model_answer: None,
        explanation: None,
        grounding: "notes".into(),
        citations: json!({"type":"notes","chunk_ids":["chunk-test-1"]}),
        is_gold: false,
        gold_status: "none".into(),
        status: "active".into(),
        generated_by: None,
        prompt_version: None,
    }
}

#[tokio::test]
async fn settings_subject_precedence() {
    let start = DateTime::parse_from_rfc3339("2026-06-01T12:00:00Z")
        .unwrap()
        .with_timezone(&Utc);
    let (app, _fake, _files) = app_with_clock(start).await;

    let patched = app
        .clone()
        .oneshot(
            Request::builder()
                .method("PATCH")
                .uri("/learning-settings")
                .header("content-type", "application/json")
                .body(Body::from(r#"{"daily_goal":20}"#))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(patched.status(), StatusCode::OK);

    let subject = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/subjects")
                .header("content-type", "application/json")
                .body(Body::from(r#"{"name":"Bio","description":null}"#))
                .unwrap(),
        )
        .await
        .unwrap();
    let subject_body = json_body(subject).await;
    let subject_id = subject_body["id"].as_str().unwrap().to_owned();

    let subject_patch = app
        .clone()
        .oneshot(
            Request::builder()
                .method("PATCH")
                .uri(format!("/learning-settings?subject_id={subject_id}"))
                .header("content-type", "application/json")
                .body(Body::from(r#"{"daily_goal":5}"#))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(subject_patch.status(), StatusCode::OK);

    let resolved = app
        .clone()
        .oneshot(
            Request::builder()
                .uri(format!("/learning-settings?subject_id={subject_id}"))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    let body = json_body(resolved).await;
    assert_eq!(body["settings"]["daily_goal"], 5);
    assert_eq!(body["sources"]["daily_goal"], "subject");
}

#[tokio::test]
async fn score_path_updates_card_state() {
    let start = DateTime::parse_from_rfc3339("2026-06-01T12:00:00Z")
        .unwrap()
        .with_timezone(&Utc);
    let fake = Arc::new(FakeClock::new(start));
    let store = storage::connect_with_clock("sqlite::memory:", fake.clone() as Arc<dyn study_core::Clock>)
        .await
        .expect("db");
    let subject = store
        .create_subject(study_core::NewSubject {
            name: "Chem".into(),
            description: None,
        })
        .await
        .expect("subject");
    let question = store
        .create_question(mcq(&subject.id, "H2O?", "a"))
        .await
        .expect("question");

    let files = tempfile::tempdir().expect("tmpdir");
    let state = api::AppState::with_scheduler(
        store.clone(),
        files.path().to_path_buf(),
        1_048_576,
        Arc::new(learning::FsrsScheduler),
        Some(fake),
    );

    let session = store
        .create_session(
            study_core::NewStudySession {
                subject_id: subject.id,
                scope: study_core::SessionScope {
                    topic_ids: vec![],
                    source_ids: vec![],
                },
                grounding_mode: "notes".into(),
                burst_size: Some(1),
                mode: Some("practice".into()),
            },
            1,
        )
        .await
        .expect("session");
    store
        .add_session_questions(&session.id, &[question.id.clone()], 0, Some("new"))
        .await
        .expect("link");

    let response = api::services::submit_answer(
        &state,
        &session.id,
        &question.id,
        None,
        Some("a".into()),
        None,
    )
    .await
    .expect("answer");

    assert!(response.attempt.score > 0.9);
    let card = CardStateRepository::get_by_question(&store, &question.id)
        .await
        .expect("card")
        .expect("exists");
    assert!(card.reps >= 1);
    assert!(ReviewLogRepository::exists_for_attempt(&store, &response.attempt.id)
        .await
        .expect("log"));
}

#[tokio::test]
async fn ledger_idempotent_for_same_attempt() {
    let start = DateTime::parse_from_rfc3339("2026-06-01T12:00:00Z")
        .unwrap()
        .with_timezone(&Utc);
    let fake = Arc::new(FakeClock::new(start));
    let store = storage::connect_with_clock("sqlite::memory:", fake.clone() as Arc<dyn study_core::Clock>)
        .await
        .expect("db");
    let subject = store
        .create_subject(study_core::NewSubject {
            name: "Lit".into(),
            description: None,
        })
        .await
        .expect("subject");
    let question = store
        .create_question(mcq(&subject.id, "Color of sky?", "a"))
        .await
        .expect("question");
    let files = tempfile::tempdir().expect("tmpdir");
    let state = api::AppState::with_scheduler(
        store.clone(),
        files.path().to_path_buf(),
        1_048_576,
        Arc::new(learning::FsrsScheduler),
        Some(fake),
    );
    let session = store
        .create_session(
            study_core::NewStudySession {
                subject_id: subject.id,
                scope: empty_scope(),
                grounding_mode: "notes".into(),
                burst_size: Some(1),
                mode: None,
            },
            1,
        )
        .await
        .expect("session");
    store
        .add_session_questions(&session.id, &[question.id.clone()], 0, None)
        .await
        .expect("link");
    let graded = api::services::submit_answer(
        &state,
        &session.id,
        &question.id,
        None,
        Some("a".into()),
        None,
    )
    .await
        .expect("answer");
    let resolved = LearningSettingsRepository::get_resolved(&store, Some(&question.subject_id))
        .await
        .expect("settings");
    api::learning_services::record_learning_outcome(
        &state,
        &graded.attempt,
        &graded.question,
        &resolved,
        false,
        true,
    )
    .await
    .expect("noop second");
    let entries = PointsLedgerRepository::list(&store, 10)
        .await
        .expect("ledger");
    let for_attempt = entries
        .iter()
        .filter(|e| e.attempt_id.as_deref() == Some(graded.attempt.id.as_str()))
        .count();
    assert_eq!(for_attempt, 1);
}

#[tokio::test]
async fn streak_moves_with_fake_clock() {
    let start = DateTime::parse_from_rfc3339("2026-06-01T12:00:00Z")
        .unwrap()
        .with_timezone(&Utc);
    let fake = Arc::new(FakeClock::new(start));
    let store = storage::connect_with_clock("sqlite::memory:", fake.clone() as Arc<dyn study_core::Clock>)
        .await
        .expect("db");
    store
        .update_user_patch(LearningSettingsPatch {
            daily_goal: Some(1),
            ..Default::default()
        })
        .await
        .expect("patch");
    let files = tempfile::tempdir().expect("tmpdir");
    let state = api::AppState::with_scheduler(
        store.clone(),
        files.path().to_path_buf(),
        1_048_576,
        Arc::new(learning::FsrsScheduler),
        Some(fake.clone()),
    );

    let subject = store
        .create_subject(study_core::NewSubject {
            name: "Hist".into(),
            description: None,
        })
        .await
        .expect("subject");
    let question = store
        .create_question(mcq(&subject.id, "Year 1776?", "a"))
        .await
        .expect("question");
    let subject_id = subject.id.clone();
    let question_id = question.id.clone();
    let session = store
        .create_session(
            study_core::NewStudySession {
                subject_id: subject.id,
                scope: empty_scope(),
                grounding_mode: "notes".into(),
                burst_size: Some(1),
                mode: None,
            },
            1,
        )
        .await
        .expect("session");
    store
        .add_session_questions(&session.id, &[question_id.clone()], 0, None)
        .await
        .expect("link");
    api::services::submit_answer(
        &state,
        &session.id,
        &question_id,
        None,
        Some("a".into()),
        None,
    )
        .await
        .expect("answer");
    let day1 = api::learning_services::streak_info(&state).await.expect("streak");
    assert!(day1.current >= 1);

    fake.advance(Duration::days(1));
    let q2 = store
        .create_question(mcq(&subject_id, "Year 1789?", "a"))
        .await
        .expect("q2");
    let session2 = store
        .create_session(
            study_core::NewStudySession {
                subject_id: subject_id.clone(),
                scope: empty_scope(),
                grounding_mode: "notes".into(),
                burst_size: Some(1),
                mode: None,
            },
            1,
        )
        .await
        .expect("session");
    store
        .add_session_questions(&session2.id, &[q2.id.clone()], 0, None)
        .await
        .expect("link");
    api::services::submit_answer(
        &state,
        &session2.id,
        &q2.id,
        None,
        Some("FR".into()),
        None,
    )
    .await
    .expect("answer2");
    let day2 = api::learning_services::streak_info(&state).await.expect("streak");
    assert!(day2.current >= day1.current);
    let _ = SETTING_DAILY_GOAL;
}

#[tokio::test]
async fn test_timer_expires() {
    let start = DateTime::parse_from_rfc3339("2026-06-01T12:00:00Z")
        .unwrap()
        .with_timezone(&Utc);
    let fake = Arc::new(FakeClock::new(start));
    let store = storage::connect_with_clock("sqlite::memory:", fake.clone() as Arc<dyn study_core::Clock>)
        .await
        .expect("db");
    let subject = store
        .create_subject(study_core::NewSubject {
            name: "Phys".into(),
            description: None,
        })
        .await
        .expect("subject");
    let question = store
        .create_question(mcq(&subject.id, "F=ma", "a"))
        .await
        .expect("question");
    let files = tempfile::tempdir().expect("tmpdir");
    let state = api::AppState::with_scheduler(
        store.clone(),
        files.path().to_path_buf(),
        1_048_576,
        Arc::new(learning::FsrsScheduler),
        Some(fake.clone()),
    );

    let test = FinalTestRepository::create(
        &store,
        storage::NewFinalTestRow {
            subject_id: subject.id.clone(),
            config: json!({
                "subject_id": subject.id,
                "source_ids": [],
                "topic_ids": [],
                "question_count": 1,
                "time_limit_s": 60,
                "kinds": {"mcq_pct": 100, "written_pct": 0},
                "cognitive_mix": {"recall": 100, "understand": 0, "apply": 0, "analyze": 0},
                "include_gold": true,
                "use_existing": true,
                "pass_mark": 0.7,
                "feedback_timing": "end",
                "navigation": "free",
                "focus_mode": false
            }),
            time_limit_s: Some(60),
        },
    )
    .await
    .expect("test");
    TestQuestionRepository::add_many(&store, &test.id, &[question.id.clone()])
        .await
        .expect("tq");
    FinalTestRepository::start_test(&store, &test.id)
        .await
        .expect("start");

    fake.advance(Duration::seconds(120));
    let err = api::learning_services::submit_test_answer(
        &state,
        &test.id,
        study_core::SubmitAnswer {
            question_id: question.id,
            answer_text: None,
            selected_option: Some("a".into()),
            time_taken_ms: None,
        },
    )
    .await;
    assert!(err.is_err());
}

#[tokio::test]
async fn mixed_session_respects_new_cap() {
    let start = DateTime::parse_from_rfc3339("2026-06-01T12:00:00Z")
        .unwrap()
        .with_timezone(&Utc);
    let fake = Arc::new(FakeClock::new(start));
    let store = storage::connect_with_clock("sqlite::memory:", fake.clone() as Arc<dyn study_core::Clock>)
        .await
        .expect("db");
    store
        .update_user_patch(LearningSettingsPatch {
            new_questions_per_day: Some(1),
            review_new_ratio: Some(0.5),
            ..Default::default()
        })
        .await
        .expect("patch");
    let subject = store
        .create_subject(study_core::NewSubject {
            name: "Mix".into(),
            description: None,
        })
        .await
        .expect("subject");
    for i in 0..3 {
        store
            .create_question(mcq(&subject.id, &format!("Q{i}"), "a"))
            .await
            .expect("q");
    }
    let files = tempfile::tempdir().expect("tmpdir");
    let state = api::AppState::with_scheduler(
        store.clone(),
        files.path().to_path_buf(),
        1_048_576,
        Arc::new(learning::FsrsScheduler),
        Some(fake),
    );
    let session = store
        .create_session(
            study_core::NewStudySession {
                subject_id: subject.id.clone(),
                scope: empty_scope(),
                grounding_mode: "notes".into(),
                burst_size: Some(4),
                mode: Some("mixed".into()),
            },
            4,
        )
        .await
        .expect("session");
    let links = api::learning_services::attach_review_burst(&state, &session, 0)
        .await
        .expect("burst");
    let new_count = links
        .iter()
        .filter(|l| l.item_kind == "new")
        .count();
    assert!(new_count <= 1);
}