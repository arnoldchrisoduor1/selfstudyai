> **Deprecated.** Retired purple system. Use `docs/design/tokens.md`. See `DEPRECATED.md`.

# Account & sync (Settings tab)

Lives under Settings as tab **Account & sync**.

## Signed out

- Email + password fields, Sign up and Sign in actions
- Password reset: email → token + new password fields
- Email verify: token field

## Signed in

- Email, verification StatusChip
- Last sync timestamp (local after successful sync, else API hint)
- Sessions DataTable: user agent, created, expires, revoked
- Actions: Sync now, Sign out (keeps local data), Link local data (confirm modal), Export JSON, Delete account (confirm modal)

Copy is functional only (no marketing).