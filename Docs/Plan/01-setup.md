Phase 1 of "self-study-ai": foundation, design system, shared component library, and working web + desktop shells. Mirror the tooling structure of my visitor management system project. Do NOT add CI/CD (pending; no Jenkins, no GitHub Actions). No business logic beyond what is listed.

1. Rust workspace in /crates: core (domain types only, no dependencies on other crates), storage (repository traits + SQLite implementation, Postgres-ready, using SeaORM with migrations), ingest (placeholder), ai (provider trait, placeholder), api (axum, GET /healthz, tracing with clear non-bloated logs). api depends on the others; core depends on nothing.

2. Core schema (table-level, via migrations): local_profile, subjects, goals, sources, chunks, settings. Every table gets created_at/updated_at. Repository traits and SQLite implementations for local_profile, subjects, and settings, with CRUD endpoints in api for those three.

3. /apps/web: Next.js + Tailwind, static export (output: 'export'), no server-only Next features. A single api-client module for all HTTP calls. App shell with sidebar layout, plus pages for Subjects (list/create/edit) and Settings, using the shared components.

4. /apps/landing: separate Next.js + Tailwind static-export site. Scaffold only: layout and a placeholder home page, no invented claims.

5. Design system: use the ui-ux-pro-max skill to decide the design approach for this product (learning tool: notes and books, quizzes, spaced repetition, progress and points). Persist under design-system/self-study-ai/: [MASTER.md](http://MASTER.md), pages/<page>.md and components/<component>.md for every page and component built in this phase, plus [landing.md](http://landing.md). Rule going forward: every new page or component gets its design-system entry when it is created, and future UI changes start by editing that entry. Wire the tokens into the Tailwind config of both web and landing.

6. Shared component library: build the reusable set (Button, Input, Select, Textarea, Toggle, Modal, DataTable, StatusChip, EmptyState, ErrorState, Toast, Loader, Sidebar/AppShell). All in one flat components folder, no subfolders; sections that hold components live in a sections folder; pages in a pages folder. Share between web and landing through a shared package, never by copy-paste. Add a /dev/components gallery page that renders every component.

7. /apps/desktop: Tauri 2 shell that loads the apps/web static export and runs the same axum API in-process on [localhost](http://localhost), with SQLite stored in the OS app data directory. The UI still talks HTTP through the same api-client. Mobile is out of scope; just keep nothing desktop-only inside core, storage, or api.

8. /e2e: Playwright for web (healthz, landing loads, app shell loads, create and edit a subject, change a setting, component gallery renders, axe accessibility scan on the main pages). For desktop: a build check plus a launch smoke test that confirms the embedded API answers /healthz.

9. Root: docker-compose.yml (api + web + landing, Nginx reverse proxy), workspace package.json, [README.md](http://README.md) covering crate responsibilities, dependency direction, the web/landing/desktop split, and how to run each. /docs: [FEATURES.md](http://FEATURES.md) and [ARCHITECTURE.md](http://ARCHITECTURE.md) stubs. .cursor/rules: clear non-bloated logs, every UI feature a reusable component, flat components folder, sections folder, pages folder, design-system entry required per new page or component.

10. Testing: write unit tests for storage and api, and the Playwright tests above. Per-step checks while building: cargo build, cargo clippy, tsc --noEmit, web lint. At the END of the phase run everything once (cargo test, Playwright, desktop launch smoke), fix failures, and prune Docker after every build.

Report: what was built, design decisions, anything not verified, and the exact commands to run web and desktop locally.