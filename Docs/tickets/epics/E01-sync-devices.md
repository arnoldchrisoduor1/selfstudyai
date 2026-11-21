# E01 Sync and devices

## Goal

Make the Library backup copy tell the truth about sync: last successful sync, whether more than one device has synced, and encryption only when the server actually encrypts.

## Scope

- **C07 Sync status and devices.** `GET /sync/status` today returns `state`, `last_sync_at: null`, and a message derived only from whether `optional_user` found a session (`crates/api/src/routes/sync.rs`). Read `last_sync_at` from `sync_cursors`. Return the devices already implied by those cursors (`device_id`, `last_sync_at`). Add an `encrypted` flag that is true only for a property the deployment actually has. Closes `library-4`.

A local-only user keeps `state: offline` and the existing "sign in to sync" message, with no device list. A signed-in user sees the cursor timestamps and device ids for their account. Device ids are the sync client ids already sent on push and pull. IP addresses stay on the audit log (C04), not on this payload.

`GET /auth/me` already returns sessions without `ip_hint`. This epic does not add a second session manager.

## Out of scope

- A new sync protocol. Pull, push, tombstones, and card-state recompute stay as implemented in `crates/storage/src/sync_engine.rs`.
- A designed device-management screen. The settings nav says "Sync & devices" and has no panel. No rename, revoke-one-device, or push-notification registration.
- Claiming end-to-end encryption in the client. The create-account design says notes are encrypted at rest. The API must not report `encrypted: true` until that storage property exists.

## Crates

`core` for the `SyncStatus` fields. `storage` to query cursors. `api` for `GET /sync/status`.
