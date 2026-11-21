# SyncStatusChip

Header chip for cloud sync state. Built on StatusChip tones.

## States

- `synced` — accent tone, label "Synced"
- `syncing` — neutral tone, label "Syncing"
- `offline` — neutral tone, label "Offline" (signed out or no session)
- `error` — danger tone, label "Sync error" plus optional retry control via `onRetry`

Optional `message` renders as subdued helper text below the chip (e.g. API `message` field).

Min height 44px. Retry uses the shared Button, secondary variant.