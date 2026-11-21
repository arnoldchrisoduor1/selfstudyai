> **Deprecated.** Retired purple system. Use `docs/design/tokens.md`. See `DEPRECATED.md`.

# AppShell

- Sidebar + column: TopBar slot + main. `data-testid="app-shell"`.
- Owns sidebar collapse (persist) and mobile drawer. ⌘B / Ctrl+B.
- `header` prop renders inside TopBar region (auth, sync, encouragement, study CTA come from the app).
- Shell is viewport height and does not scroll. Main column scrolls. Sidebar stays fixed height beside it.
- Main is `flex-1 min-w-0 overflow-y-auto` with `--space-lg` padding. No invented page copy.
