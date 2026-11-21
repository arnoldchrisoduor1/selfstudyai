//! Client-generated ids suitable for offline sync.

use uuid::Uuid;

/// UUIDv7 for time-ordered, offline-safe primary keys.
pub fn new_id() -> String {
    Uuid::now_v7().to_string()
}