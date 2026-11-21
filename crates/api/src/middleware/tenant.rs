use axum::{body::Body, middleware::Next, response::Response};
use storage::with_tenant_user;

use crate::middleware::auth::AuthUser;

pub async fn tenant_scope(req: axum::http::Request<Body>, next: Next) -> Response {
    let user_id = req
        .extensions()
        .get::<AuthUser>()
        .map(|user| user.user_id.clone());
    with_tenant_user(user_id, async move { next.run(req).await }).await
}