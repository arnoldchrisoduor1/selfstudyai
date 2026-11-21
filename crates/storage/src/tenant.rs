use sea_orm::sea_query::{Condition, Expr};
use sea_orm::ColumnTrait;
use std::cell::RefCell;

tokio::task_local! {
    static TENANT_USER: RefCell<Option<String>>;
}

/// Scope data access: `None` = local-only rows (`user_id` IS NULL); `Some` = that cloud user.
pub async fn with_tenant_user<R, F>(user_id: Option<String>, f: F) -> R
where
    F: std::future::Future<Output = R>,
{
    TENANT_USER
        .scope(RefCell::new(user_id), f)
        .await
}

pub fn tenant_user_id() -> Option<String> {
    TENANT_USER
        .try_with(|cell| cell.borrow().clone())
        .ok()
        .flatten()
}

pub fn user_id_condition<C: ColumnTrait>(col: C) -> Condition {
    match tenant_user_id() {
        None => Condition::all().add(col.is_null()),
        Some(id) => Condition::all().add(col.eq(id)),
    }
}

pub fn active_user_id_for_write() -> Option<String> {
    tenant_user_id()
}

pub fn not_deleted<C: ColumnTrait>(deleted_at: C) -> Condition {
    Condition::all().add(
        Condition::any()
            .add(deleted_at.is_null())
            .add(Expr::col(deleted_at).eq("")),
    )
}