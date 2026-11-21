pub mod health;
mod auth;
pub mod credits;
mod dev_clock;
mod export;
mod sync;
mod learning;
mod profiles;
mod providers;
mod question_settings;
mod questions;
mod search;
mod sessions;
mod settings;
mod sources;
mod subjects;
mod tests;
mod topics;
mod web_search;

use axum::routing::{get, post};
use axum::Router;

use crate::state::AppState;

pub fn routes() -> Router<AppState> {
    Router::new()
        .route("/healthz", get(health::health))
        .route("/subjects", get(subjects::list).post(subjects::create))
        .route(
            "/subjects/{id}",
            get(subjects::get_one)
                .patch(subjects::update)
                .delete(subjects::delete_one),
        )
        .route("/settings", get(settings::list).post(settings::create))
        .route(
            "/settings/{id}",
            get(settings::get_one)
                .patch(settings::update)
                .delete(settings::delete_one),
        )
        .route(
            "/local-profiles",
            get(profiles::list).post(profiles::create),
        )
        .route(
            "/local-profiles/{id}",
            get(profiles::get_one)
                .patch(profiles::update)
                .delete(profiles::delete_one),
        )
        .route("/sources", get(sources::list).post(sources::upload))
        .route(
            "/sources/{id}",
            get(sources::get_one).delete(sources::delete_one),
        )
        .route("/sources/{id}/reembed", post(sources::reembed))
        .route("/topics", get(topics::list))
        .route("/topics/{id}", axum::routing::patch(topics::update))
        .route("/chunks", get(topics::list_chunks))
        .route("/search", post(search::search))
        .route(
            "/ai-providers",
            get(providers::list).post(providers::create),
        )
        .route(
            "/ai-providers/{id}",
            get(providers::get_one)
                .patch(providers::update)
                .delete(providers::delete_one),
        )
        .route("/ai-providers/test", post(providers::test_connection))
        .route("/ai-providers/default", post(providers::set_default))
        .route("/sessions", get(sessions::list_open).post(sessions::create))
        .route("/sessions/{id}", get(sessions::get_one))
        .route("/sessions/{id}/end", post(sessions::end))
        .route("/sessions/{id}/burst", get(sessions::next_burst))
        .route("/sessions/{id}/answer", post(sessions::answer))
        .route(
            "/sessions/{session_id}/attempts/{attempt_id}/override",
            post(sessions::override_grade),
        )
        .route("/questions/gold/queue", get(questions::gold_queue))
        .route("/questions", get(questions::list))
        .route("/questions/{id}/archive", post(questions::archive))
        .route("/questions/{id}/flag", post(questions::flag))
        .route("/questions/{id}/gold-review", post(questions::gold_review))
        .route("/questions/{id}/gold", post(questions::gold_toggle))
        .route(
            "/questions/{id}",
            get(questions::get_one)
                .patch(questions::update)
                .delete(questions::delete_one),
        )
        .route(
            "/question-settings",
            get(question_settings::get).patch(question_settings::update),
        )
        .route(
            "/web-search-providers",
            get(web_search::list).post(web_search::create),
        )
        .route("/web-search-providers/test", post(web_search::test_connection))
        .route("/web-search-providers/default", post(web_search::set_default))
        .route(
            "/web-search-providers/{id}",
            get(web_search::get_one)
                .patch(web_search::update)
                .delete(web_search::delete_one),
        )
        .route(
            "/learning-settings",
            get(learning::get_settings).patch(learning::patch_settings),
        )
        .route("/due-queue", get(learning::get_due_queue))
        .route("/dashboard", get(learning::dashboard))
        .route("/points-ledger", get(learning::ledger))
        .route("/streak", get(learning::streak))
        .route("/daily-activity", get(learning::daily_activity))
        .route("/learning/backfill", post(learning::run_backfill))
        .route("/tests", get(tests::list).post(tests::create))
        .route("/tests/{id}", get(tests::get_one))
        .route("/tests/{id}/start", post(tests::start))
        .route("/tests/{id}/answer", post(tests::answer))
        .route("/tests/{id}/submit", post(tests::submit))
        .route("/tests/{id}/expire", post(tests::expire))
        .route("/tests/{id}/integrity-events", post(tests::integrity_events))
        .route("/tests/{id}/results", get(tests::results))
        .route("/dev/clock", post(dev_clock::set_clock))
        .route("/dev/clock/advance", post(dev_clock::advance_clock))
        .route("/auth/sign-up", post(auth::sign_up))
        .route("/auth/sign-in", post(auth::sign_in))
        .route("/auth/me", axum::routing::get(auth::me))
        .route("/auth/verify", post(auth::verify_email))
        .route("/auth/password-reset", post(auth::request_password_reset))
        .route("/auth/password-reset/confirm", post(auth::confirm_password_reset))
        .route("/auth/logout", post(auth::logout))
        .route("/auth/logout-all", post(auth::logout_all))
        .route("/auth/delete-account", post(auth::delete_account))
        .route("/auth/link-local", post(auth::link_local_data))
        .route("/sync/status", axum::routing::get(sync::status))
        .route("/sync/pull", post(sync::pull))
        .route("/sync/push", post(sync::push))
        .route("/credits/balance", axum::routing::get(credits::balance))
        .route("/credits/ledger", axum::routing::get(credits::ledger))
        .route("/credits/topup", post(credits::topup))
        .route("/credits/admin/adjust", post(credits::admin_adjust))
        .route("/export", axum::routing::get(export::export_data))
}
