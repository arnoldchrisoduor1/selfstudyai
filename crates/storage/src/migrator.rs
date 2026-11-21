use sea_orm_migration::prelude::*;

pub struct Migration001Init;

impl MigrationName for Migration001Init {
    fn name(&self) -> &str {
        "m20241116_001_init"
    }
}

#[async_trait::async_trait]
impl MigrationTrait for Migration001Init {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        let db = manager.get_connection();
        db.execute_unprepared(
            r#"
            CREATE TABLE local_profile (
                id TEXT NOT NULL PRIMARY KEY,
                display_name TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );

            CREATE TABLE subjects (
                id TEXT NOT NULL PRIMARY KEY,
                name TEXT NOT NULL,
                description TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );

            CREATE TABLE goals (
                id TEXT NOT NULL PRIMARY KEY,
                subject_id TEXT NOT NULL REFERENCES subjects(id),
                title TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );

            CREATE TABLE sources (
                id TEXT NOT NULL PRIMARY KEY,
                subject_id TEXT NOT NULL REFERENCES subjects(id),
                title TEXT NOT NULL,
                kind TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );

            CREATE TABLE chunks (
                id TEXT NOT NULL PRIMARY KEY,
                source_id TEXT NOT NULL REFERENCES sources(id),
                body TEXT NOT NULL,
                position INTEGER NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );

            CREATE TABLE settings (
                id TEXT NOT NULL PRIMARY KEY,
                setting_key TEXT NOT NULL UNIQUE,
                value TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );
            "#,
        )
        .await?;
        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        let db = manager.get_connection();
        db.execute_unprepared(
            r#"
            DROP TABLE IF EXISTS chunks;
            DROP TABLE IF EXISTS sources;
            DROP TABLE IF EXISTS goals;
            DROP TABLE IF EXISTS settings;
            DROP TABLE IF EXISTS subjects;
            DROP TABLE IF EXISTS local_profile;
            "#,
        )
        .await?;
        Ok(())
    }
}

pub struct Migration002IngestSearch;

impl MigrationName for Migration002IngestSearch {
    fn name(&self) -> &str {
        "m20241116_002_ingest_search"
    }
}

#[async_trait::async_trait]
impl MigrationTrait for Migration002IngestSearch {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        let db = manager.get_connection();
        db.execute_unprepared(
            r#"
            CREATE TABLE sources_new (
                id TEXT NOT NULL PRIMARY KEY,
                subject_id TEXT NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
                title TEXT NOT NULL,
                kind TEXT NOT NULL,
                file_name TEXT NOT NULL DEFAULT '',
                content_hash TEXT NOT NULL DEFAULT '',
                status TEXT NOT NULL DEFAULT 'pending',
                error TEXT,
                progress INTEGER NOT NULL DEFAULT 0,
                needs_reembed INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );

            INSERT INTO sources_new (
                id, subject_id, title, kind, file_name, content_hash, status,
                error, progress, needs_reembed, created_at, updated_at
            )
            SELECT
                id, subject_id, title, kind, '', '', 'ready',
                NULL, 100, 0, created_at, updated_at
            FROM sources;

            DROP TABLE sources;
            ALTER TABLE sources_new RENAME TO sources;

            CREATE UNIQUE INDEX idx_sources_subject_hash
                ON sources(subject_id, content_hash)
                WHERE content_hash != '';

            CREATE TABLE topics (
                id TEXT NOT NULL PRIMARY KEY,
                source_id TEXT NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
                parent_id TEXT REFERENCES topics(id) ON DELETE CASCADE,
                title TEXT NOT NULL,
                position INTEGER NOT NULL,
                is_core INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );

            CREATE INDEX idx_topics_source ON topics(source_id);

            CREATE TABLE chunks_new (
                id TEXT NOT NULL PRIMARY KEY,
                source_id TEXT NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
                topic_id TEXT NOT NULL DEFAULT '',
                position INTEGER NOT NULL,
                text TEXT NOT NULL DEFAULT '',
                token_count INTEGER NOT NULL DEFAULT 0,
                page_ref TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );

            INSERT INTO chunks_new (
                id, source_id, topic_id, position, text, token_count, page_ref, created_at, updated_at
            )
            SELECT
                id, source_id, '', position, body, 0, NULL, created_at, updated_at
            FROM chunks;

            DROP TABLE chunks;
            ALTER TABLE chunks_new RENAME TO chunks;

            CREATE INDEX idx_chunks_source ON chunks(source_id);
            CREATE INDEX idx_chunks_topic ON chunks(topic_id);

            CREATE TABLE chunk_embeddings (
                id TEXT NOT NULL PRIMARY KEY,
                chunk_id TEXT NOT NULL REFERENCES chunks(id) ON DELETE CASCADE,
                provider_model TEXT NOT NULL,
                dimensions INTEGER NOT NULL,
                vector BLOB NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );

            CREATE UNIQUE INDEX idx_chunk_embeddings_chunk_model
                ON chunk_embeddings(chunk_id, provider_model);

            CREATE TABLE ai_providers (
                id TEXT NOT NULL PRIMARY KEY,
                name TEXT NOT NULL,
                kind TEXT NOT NULL,
                base_url TEXT,
                api_key TEXT,
                chat_model TEXT NOT NULL,
                embedding_model TEXT NOT NULL,
                embedding_dimensions INTEGER NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );

            CREATE VIRTUAL TABLE chunks_fts USING fts5(
                chunk_id UNINDEXED,
                source_id UNINDEXED,
                topic_id UNINDEXED,
                text,
                tokenize = 'porter'
            );
            "#,
        )
        .await?;
        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        let db = manager.get_connection();
        db.execute_unprepared(
            r#"
            DROP TABLE IF EXISTS chunks_fts;
            DROP TABLE IF EXISTS ai_providers;
            DROP TABLE IF EXISTS chunk_embeddings;
            DROP TABLE IF EXISTS topics;

            CREATE TABLE chunks_old (
                id TEXT NOT NULL PRIMARY KEY,
                source_id TEXT NOT NULL,
                body TEXT NOT NULL,
                position INTEGER NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );
            INSERT INTO chunks_old (id, source_id, body, position, created_at, updated_at)
            SELECT id, source_id, text, position, created_at, updated_at FROM chunks;
            DROP TABLE chunks;
            ALTER TABLE chunks_old RENAME TO chunks;

            CREATE TABLE sources_old (
                id TEXT NOT NULL PRIMARY KEY,
                subject_id TEXT NOT NULL,
                title TEXT NOT NULL,
                kind TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );
            INSERT INTO sources_old (id, subject_id, title, kind, created_at, updated_at)
            SELECT id, subject_id, title, kind, created_at, updated_at FROM sources;
            DROP TABLE sources;
            ALTER TABLE sources_old RENAME TO sources;
            "#,
        )
        .await?;
        Ok(())
    }
}

pub struct Migration003Questions;

impl MigrationName for Migration003Questions {
    fn name(&self) -> &str {
        "m20241116_003_questions"
    }
}

#[async_trait::async_trait]
impl MigrationTrait for Migration003Questions {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        let db = manager.get_connection();
        db.execute_unprepared(
            r#"
            CREATE TABLE questions (
                id TEXT NOT NULL PRIMARY KEY,
                subject_id TEXT NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
                source_id TEXT REFERENCES sources(id) ON DELETE SET NULL,
                topic_id TEXT REFERENCES topics(id) ON DELETE SET NULL,
                kind TEXT NOT NULL,
                cognitive_level TEXT NOT NULL,
                stem TEXT NOT NULL,
                options TEXT,
                correct_option TEXT,
                model_answer TEXT,
                explanation TEXT,
                grounding TEXT NOT NULL,
                citations TEXT NOT NULL,
                is_gold INTEGER NOT NULL DEFAULT 0,
                gold_status TEXT NOT NULL DEFAULT 'none',
                status TEXT NOT NULL DEFAULT 'active',
                generated_by TEXT,
                prompt_version TEXT,
                created_at TEXT NOT NULL
            );

            CREATE INDEX idx_questions_subject ON questions(subject_id);
            CREATE INDEX idx_questions_topic ON questions(topic_id);
            CREATE INDEX idx_questions_gold ON questions(gold_status);
            CREATE INDEX idx_questions_status ON questions(status);

            CREATE TABLE study_sessions (
                id TEXT NOT NULL PRIMARY KEY,
                subject_id TEXT NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
                scope TEXT NOT NULL,
                grounding_mode TEXT NOT NULL,
                burst_size INTEGER NOT NULL,
                started_at TEXT NOT NULL,
                ended_at TEXT
            );

            CREATE INDEX idx_study_sessions_subject ON study_sessions(subject_id);

            CREATE TABLE session_questions (
                id TEXT NOT NULL PRIMARY KEY,
                session_id TEXT NOT NULL REFERENCES study_sessions(id) ON DELETE CASCADE,
                question_id TEXT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
                burst_index INTEGER NOT NULL,
                position INTEGER NOT NULL
            );

            CREATE INDEX idx_session_questions_session ON session_questions(session_id);
            CREATE UNIQUE INDEX idx_session_questions_unique
                ON session_questions(session_id, question_id);

            CREATE TABLE attempts (
                id TEXT NOT NULL PRIMARY KEY,
                question_id TEXT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
                session_id TEXT NOT NULL REFERENCES study_sessions(id) ON DELETE CASCADE,
                answer_text TEXT,
                selected_option TEXT,
                score REAL NOT NULL,
                verdict TEXT NOT NULL,
                feedback TEXT NOT NULL,
                graded_by TEXT NOT NULL,
                confidence REAL,
                original_score REAL,
                original_verdict TEXT,
                time_taken_ms INTEGER,
                created_at TEXT NOT NULL
            );

            CREATE INDEX idx_attempts_session ON attempts(session_id);
            CREATE INDEX idx_attempts_question ON attempts(question_id);

            CREATE TABLE usage_events (
                id TEXT NOT NULL PRIMARY KEY,
                provider TEXT NOT NULL,
                model TEXT NOT NULL,
                kind TEXT NOT NULL,
                tokens_in INTEGER NOT NULL DEFAULT 0,
                tokens_out INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL
            );

            CREATE INDEX idx_usage_events_created ON usage_events(created_at);

            CREATE TABLE web_search_providers (
                id TEXT NOT NULL PRIMARY KEY,
                name TEXT NOT NULL,
                endpoint TEXT NOT NULL,
                api_key TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );
            "#,
        )
        .await?;
        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        let db = manager.get_connection();
        db.execute_unprepared(
            r#"
            DROP TABLE IF EXISTS attempts;
            DROP TABLE IF EXISTS session_questions;
            DROP TABLE IF EXISTS study_sessions;
            DROP TABLE IF EXISTS questions;
            DROP TABLE IF EXISTS usage_events;
            DROP TABLE IF EXISTS web_search_providers;
            "#,
        )
        .await?;
        Ok(())
    }
}

pub struct Migration004Learning;

impl MigrationName for Migration004Learning {
    fn name(&self) -> &str {
        "m20241116_004_learning"
    }
}

#[async_trait::async_trait]
impl MigrationTrait for Migration004Learning {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        let db = manager.get_connection();
        db.execute_unprepared(
            r#"
            ALTER TABLE study_sessions ADD COLUMN mode TEXT NOT NULL DEFAULT 'practice';
            ALTER TABLE session_questions ADD COLUMN item_kind TEXT NOT NULL DEFAULT 'new';

            CREATE TABLE tests (
                id TEXT NOT NULL PRIMARY KEY,
                subject_id TEXT NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
                config TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'draft',
                started_at TEXT,
                submitted_at TEXT,
                time_limit_s INTEGER,
                score REAL,
                pass INTEGER,
                integrity_status TEXT NOT NULL DEFAULT 'unverified',
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );
            CREATE INDEX idx_tests_subject ON tests(subject_id);
            CREATE INDEX idx_tests_status ON tests(status);

            CREATE TABLE attempts_new (
                id TEXT NOT NULL PRIMARY KEY,
                question_id TEXT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
                session_id TEXT REFERENCES study_sessions(id) ON DELETE CASCADE,
                test_id TEXT REFERENCES tests(id) ON DELETE CASCADE,
                answer_text TEXT,
                selected_option TEXT,
                score REAL NOT NULL,
                verdict TEXT NOT NULL,
                feedback TEXT NOT NULL,
                graded_by TEXT NOT NULL,
                confidence REAL,
                original_score REAL,
                original_verdict TEXT,
                time_taken_ms INTEGER,
                created_at TEXT NOT NULL
            );
            INSERT INTO attempts_new (
                id, question_id, session_id, test_id, answer_text, selected_option,
                score, verdict, feedback, graded_by, confidence, original_score,
                original_verdict, time_taken_ms, created_at
            )
            SELECT
                id, question_id, session_id, NULL, answer_text, selected_option,
                score, verdict, feedback, graded_by, confidence, original_score,
                original_verdict, time_taken_ms, created_at
            FROM attempts;
            DROP TABLE attempts;
            ALTER TABLE attempts_new RENAME TO attempts;
            CREATE INDEX idx_attempts_session ON attempts(session_id);
            CREATE INDEX idx_attempts_question ON attempts(question_id);
            CREATE INDEX idx_attempts_test ON attempts(test_id);

            CREATE TABLE card_states (
                id TEXT NOT NULL PRIMARY KEY,
                question_id TEXT NOT NULL UNIQUE REFERENCES questions(id) ON DELETE CASCADE,
                due TEXT NOT NULL,
                stability REAL NOT NULL DEFAULT 0,
                difficulty REAL NOT NULL DEFAULT 0,
                state TEXT NOT NULL DEFAULT 'new',
                reps INTEGER NOT NULL DEFAULT 0,
                lapses INTEGER NOT NULL DEFAULT 0,
                last_review TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );
            CREATE INDEX idx_card_states_due ON card_states(due);
            CREATE INDEX idx_card_states_state ON card_states(state);

            CREATE TABLE review_logs (
                id TEXT NOT NULL PRIMARY KEY,
                question_id TEXT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
                attempt_id TEXT NOT NULL REFERENCES attempts(id) ON DELETE CASCADE,
                rating TEXT NOT NULL,
                state_before TEXT NOT NULL,
                state_after TEXT NOT NULL,
                scheduled_days REAL NOT NULL,
                elapsed_days REAL NOT NULL,
                created_at TEXT NOT NULL
            );
            CREATE INDEX idx_review_logs_question ON review_logs(question_id);
            CREATE INDEX idx_review_logs_attempt ON review_logs(attempt_id);

            CREATE TABLE points_ledger (
                id TEXT NOT NULL PRIMARY KEY,
                amount INTEGER NOT NULL,
                reason TEXT NOT NULL,
                attempt_id TEXT,
                test_id TEXT,
                multiplier_breakdown TEXT NOT NULL,
                created_at TEXT NOT NULL
            );
            CREATE UNIQUE INDEX idx_points_ledger_attempt_award
                ON points_ledger(attempt_id, reason)
                WHERE attempt_id IS NOT NULL;
            CREATE INDEX idx_points_ledger_created ON points_ledger(created_at);

            CREATE TABLE daily_activity (
                id TEXT NOT NULL PRIMARY KEY,
                date TEXT NOT NULL UNIQUE,
                questions_answered INTEGER NOT NULL DEFAULT 0,
                points_earned INTEGER NOT NULL DEFAULT 0,
                minutes_studied INTEGER NOT NULL DEFAULT 0,
                goal_met INTEGER NOT NULL DEFAULT 0
            );

            CREATE TABLE test_questions (
                id TEXT NOT NULL PRIMARY KEY,
                test_id TEXT NOT NULL REFERENCES tests(id) ON DELETE CASCADE,
                question_id TEXT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
                position INTEGER NOT NULL
            );
            CREATE UNIQUE INDEX idx_test_questions_unique ON test_questions(test_id, question_id);
            CREATE INDEX idx_test_questions_test ON test_questions(test_id);

            CREATE TABLE integrity_events (
                id TEXT NOT NULL PRIMARY KEY,
                test_id TEXT NOT NULL REFERENCES tests(id) ON DELETE CASCADE,
                kind TEXT NOT NULL,
                at TEXT NOT NULL,
                meta TEXT NOT NULL
            );
            CREATE INDEX idx_integrity_events_test ON integrity_events(test_id);
            "#,
        )
        .await?;
        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        let db = manager.get_connection();
        db.execute_unprepared(
            r#"
            DROP TABLE IF EXISTS integrity_events;
            DROP TABLE IF EXISTS test_questions;
            DROP TABLE IF EXISTS tests;
            DROP TABLE IF EXISTS daily_activity;
            DROP TABLE IF EXISTS points_ledger;
            DROP TABLE IF EXISTS review_logs;
            DROP TABLE IF EXISTS card_states;
            "#,
        )
        .await?;
        Ok(())
    }
}

pub struct Migration005AccountsSync;

impl MigrationName for Migration005AccountsSync {
    fn name(&self) -> &str {
        "m20241117_005_accounts_sync"
    }
}

fn sync_meta_alters(table: &str) -> String {
    format!(
        "ALTER TABLE {table} ADD COLUMN user_id TEXT;\n\
         ALTER TABLE {table} ADD COLUMN version INTEGER NOT NULL DEFAULT 1;\n\
         ALTER TABLE {table} ADD COLUMN deleted_at TEXT;\n"
    )
}

#[async_trait::async_trait]
impl MigrationTrait for Migration005AccountsSync {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        let db = manager.get_connection();
        let mut sql = String::new();
        for table in [
            "local_profile",
            "subjects",
            "goals",
            "sources",
            "chunks",
            "settings",
            "topics",
            "chunk_embeddings",
            "ai_providers",
            "questions",
            "study_sessions",
            "session_questions",
            "web_search_providers",
            "tests",
            "test_questions",
            "integrity_events",
            "review_logs",
            "points_ledger",
            "daily_activity",
        ] {
            sql.push_str(&sync_meta_alters(table));
        }
        for table in ["attempts", "usage_events"] {
            sql.push_str(&sync_meta_alters(table));
        }
        sql.push_str(
            r#"
            CREATE TABLE users (
                id TEXT NOT NULL PRIMARY KEY,
                email TEXT NOT NULL UNIQUE,
                password_hash TEXT NOT NULL,
                email_verified INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                deleted_at TEXT
            );

            CREATE TABLE auth_sessions (
                id TEXT NOT NULL PRIMARY KEY,
                user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                token_hash TEXT NOT NULL UNIQUE,
                kind TEXT NOT NULL,
                user_agent TEXT,
                ip_hint TEXT,
                created_at TEXT NOT NULL,
                expires_at TEXT NOT NULL,
                revoked_at TEXT
            );
            CREATE INDEX idx_auth_sessions_user ON auth_sessions(user_id);

            CREATE TABLE email_tokens (
                id TEXT NOT NULL PRIMARY KEY,
                user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                kind TEXT NOT NULL,
                token_hash TEXT NOT NULL,
                expires_at TEXT NOT NULL,
                used_at TEXT,
                created_at TEXT NOT NULL
            );
            CREATE INDEX idx_email_tokens_user ON email_tokens(user_id);

            CREATE TABLE sync_cursors (
                user_id TEXT NOT NULL,
                device_id TEXT NOT NULL,
                cursor TEXT NOT NULL,
                last_sync_at TEXT NOT NULL,
                PRIMARY KEY (user_id, device_id)
            );

            CREATE TABLE credits_ledger (
                id TEXT NOT NULL PRIMARY KEY,
                user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                amount INTEGER NOT NULL,
                kind TEXT NOT NULL,
                reference TEXT,
                created_at TEXT NOT NULL
            );
            CREATE INDEX idx_credits_ledger_user ON credits_ledger(user_id);
            CREATE INDEX idx_credits_ledger_created ON credits_ledger(created_at);

            CREATE TABLE credit_reservations (
                id TEXT NOT NULL PRIMARY KEY,
                user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                amount INTEGER NOT NULL,
                created_at TEXT NOT NULL,
                settled_at TEXT,
                released_at TEXT
            );
            CREATE INDEX idx_credit_reservations_user ON credit_reservations(user_id);

            CREATE TABLE stored_files (
                content_hash TEXT NOT NULL PRIMARY KEY,
                user_id TEXT NOT NULL,
                path TEXT NOT NULL,
                size_bytes INTEGER NOT NULL,
                created_at TEXT NOT NULL
            );
            CREATE INDEX idx_stored_files_user ON stored_files(user_id);

            CREATE TABLE rate_limit_buckets (
                bucket_key TEXT NOT NULL PRIMARY KEY,
                count INTEGER NOT NULL DEFAULT 0,
                window_start TEXT NOT NULL
            );
            "#,
        );
        db.execute_unprepared(&sql).await?;
        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        let db = manager.get_connection();
        db.execute_unprepared(
            r#"
            DROP TABLE IF EXISTS rate_limit_buckets;
            DROP TABLE IF EXISTS stored_files;
            DROP TABLE IF EXISTS credit_reservations;
            DROP TABLE IF EXISTS credits_ledger;
            DROP TABLE IF EXISTS sync_cursors;
            DROP TABLE IF EXISTS email_tokens;
            DROP TABLE IF EXISTS auth_sessions;
            DROP TABLE IF EXISTS users;
            "#,
        )
        .await?;
        Ok(())
    }
}

pub struct Migrator;

#[async_trait::async_trait]
impl MigratorTrait for Migrator {
    fn migrations() -> Vec<Box<dyn MigrationTrait>> {
        vec![
            Box::new(Migration001Init),
            Box::new(Migration002IngestSearch),
            Box::new(Migration003Questions),
            Box::new(Migration004Learning),
            Box::new(Migration005AccountsSync),
        ]
    }
}
