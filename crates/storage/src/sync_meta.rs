use sea_orm::ActiveValue::{self, Set};

use crate::tenant::active_user_id_for_write;

pub fn new_row_sync_fields() -> (
    ActiveValue<Option<String>>,
    ActiveValue<i32>,
    ActiveValue<Option<String>>,
) {
    (
        Set(active_user_id_for_write()),
        Set(1),
        Set(None),
    )
}

pub fn bump_version(existing: i32) -> ActiveValue<i32> {
    Set(existing.saturating_add(1))
}