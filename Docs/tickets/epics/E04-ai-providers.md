# E04 AI providers

## Goal

Store one workspace inference mode — local model, bring-your-own key, app-credit cloud, or the template fallback — and route generation, grading, embeddings, and cited answers through it without changing callers.

## Scope

- **C13 Inference mode and credentials.** Persist the mode apart from `ai_providers` rows. `GET /ai-providers` stays the list of OpenAI-compatible, Ollama, and mock configs. The mode says which of those, or `CloudProvider` (`crates/ai/src/cloud.rs`, key from `CLOUD_AI_API_KEY`), or a template/rule implementation, is active. The settings cards (local, custom API, app credits) read and write this mode. Closes `settings-9`.
- The gateway control closes `settings-5` by using the provider that the mode points at: masked hint, replace key, `POST /ai-providers/test`. The API does not return a raw key. There is no second secret store. Cloud mode has no user-supplied gateway key; the platform key stays in the environment.
- Template/rule generation is the fallback when the mode is template, or when the selected provider is unavailable, so question generation still returns a burst. It does not replace `crates/questions` schema validation, citation checks, or the cognitive mix.

Local-only users can select template, local (Ollama), or bring-your-own key. App-credit cloud requires a signed-in user and a credit balance (C14). Embeddings follow the same mode. A mode change still sets `needs_reembed` the way an embedding-model change does today.

## Out of scope

- New question types, gold rules, or burst assembly. Those already live in `crates/questions` and `POST /sessions/{id}/burst`.
- A hosted model catalog, failover chain, or quality-check service beyond the single cloud provider.
- Credit pricing, top-up, and the usage table (C14).

## Crates

`core` for the mode enum. `storage` for the setting. `ai` for the template provider and the factory that `crates/ai/src/factory.rs` already uses to pick an implementation. `api` for the settings routes. `questions` calls the factory and does not grow a second provider switch.
