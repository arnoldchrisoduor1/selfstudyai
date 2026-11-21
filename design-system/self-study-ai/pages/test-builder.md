> **Deprecated.** Retired purple system. Use `docs/design/tokens.md`. See `DEPRECATED.md`.

# Test builder

Create a final test at `/tests/new/`.

## Layout

- Subject, optional source/topic scope
- Question count, pass mark, time limit
- Kind mix (MCQ / written %), cognitive mix read-only from defaults
- Toggle: include gold, use existing pool, focus mode
- Feedback timing and navigation selects from defaults
- Submit creates test and navigates to session
- Loading subjects, empty (no subjects), error states