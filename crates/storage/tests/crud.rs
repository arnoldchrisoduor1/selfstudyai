use storage::{
    connect, AuthRepository, CreditsRepository, LocalProfileRepository, NewLocalProfile,
    NewSetting, NewSubject, Repository, SettingRepository, SubjectRepository,
};
use study_core::CreditKind;

async fn store() -> storage::Store {
    connect("sqlite::memory:").await.expect("memory db")
}

#[tokio::test]
async fn migration_creates_schema_tables() {
    let store = store().await;
    let names = store.table_names().await.expect("tables");
    for required in [
        "local_profile",
        "subjects",
        "goals",
        "sources",
        "chunks",
        "settings",
        "topics",
        "chunk_embeddings",
        "ai_providers",
        "chunks_fts",
        "questions",
        "study_sessions",
        "session_questions",
        "attempts",
        "usage_events",
        "web_search_providers",
        "users",
        "credits_ledger",
        "credit_reservations",
    ] {
        assert!(
            names.iter().any(|name| name == required),
            "missing {required}"
        );
    }
}

#[tokio::test]
async fn subject_crud_round_trip() {
    let store = store().await;
    let created = store
        .create_subject(NewSubject {
            name: "  Algebra ".into(),
            description: Some("  ".into()),
        })
        .await
        .expect("create");
    assert_eq!(created.name, "Algebra");
    assert_eq!(created.description, None);

    let loaded = store
        .get_subject(&created.id)
        .await
        .expect("get")
        .expect("row");
    assert_eq!(loaded.name, "Algebra");

    let updated = store
        .update_subject(
            &created.id,
            NewSubject {
                name: "Geometry".into(),
                description: Some("shapes".into()),
            },
        )
        .await
        .expect("update")
        .expect("row");
    assert_eq!(updated.name, "Geometry");
    assert_eq!(updated.description.as_deref(), Some("shapes"));

    let listed = store.list_subjects().await.expect("list");
    assert_eq!(listed.len(), 1);

    assert!(store.delete_subject(&created.id).await.expect("delete"));
    assert!(store.get_subject(&created.id).await.expect("get").is_none());
}

#[tokio::test]
async fn setting_key_conflict() {
    let store = store().await;
    store
        .create_setting(NewSetting {
            key: "theme".into(),
            value: "light".into(),
        })
        .await
        .expect("create");
    let err = store
        .create_setting(NewSetting {
            key: "theme".into(),
            value: "dark".into(),
        })
        .await
        .expect_err("duplicate");
    assert!(matches!(err, storage::StorageError::Conflict));
}

#[tokio::test]
async fn profile_rejects_blank_name() {
    let store = store().await;
    let err = store
        .create_profile(NewLocalProfile {
            display_name: "   ".into(),
        })
        .await
        .expect_err("blank");
    assert!(matches!(err, storage::StorageError::Invalid(_)));
}

#[tokio::test]
async fn user_create_and_credits_ledger() {
    let store = store().await;
    let user = store
        .create_user("ledger@example.com", "fake-hash")
        .await
        .expect("user");
    let entry = store
        .append_entry(&user.id, 100, CreditKind::Topup, Some("seed".into()))
        .await
        .expect("ledger");
    assert_eq!(entry.amount, 100);
    let balance = store.balance(&user.id).await.expect("balance");
    assert_eq!(balance.balance, 100);
}

#[tokio::test]
async fn credits_reserve_insufficient() {
    let store = store().await;
    let user = store
        .create_user("reserve@example.com", "fake-hash")
        .await
        .expect("user");
    let err = store.reserve(&user.id, 10).await.expect_err("no credits");
    assert!(matches!(err, storage::StorageError::Invalid(_)));

    store
        .append_entry(&user.id, 5, CreditKind::Topup, None)
        .await
        .expect("topup");
    assert!(store.reserve(&user.id, 10).await.is_err());
    assert!(store.reserve(&user.id, 3).await.is_ok());
}
