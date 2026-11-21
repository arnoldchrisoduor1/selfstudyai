# E02 Documents and ingestion

## Goal

Make a source a complete library record: size, pages, author, quota, and import history; accept a URL as well as a file; report named pipeline stages with cancel and retry; and let a subject carry the discipline, level, and archived flag the Subjects screen filters on.

## Scope

- **C08 Source metadata and import history.** Persist `bytes`, `page_count`, and `author` on `Source`. Return workspace `storage_used` and `storage_quota`. `stored_files.size_bytes` exists only as a migration-005 table with no repository; the library reads the source row, not that unused table. Import history is the source list plus tombstoned imports, so a deleted file still appears as history. Closes `library-1`, `library-5`, `subjects-6`.
- **C09 URL import.** `POST /sources/url` with `subject_id` and `url`, then the same pipeline as a file upload. Closes `library-2`. The Add Material samples (ArXiv, a course page) use this route.
- **C10 Ingest pipeline stages.** A job (C02) per file with the stages the Add Material queue shows: upload, read, sections, index, questions. Cancel stops the job. Retry re-runs the failed stage. Failed ingest stays visible, which the Library "Failed: retry" row needs. Optional generate-on-ingest calls the existing question generator when the user turns that on. Closes `hint-ingest-stages`.
- **C11 Subject taxonomy.** `category`, `level`, and `archived` on `Subject`, accepted by create and patch, returned by `GET /subjects`. Closes `subjects-4`. Overview "Continue studying" reads `category` from this field once C22 supplies the rest of the card.

Local-only and signed-in users upload, import, and tag subjects the same way. Files stay in `FILES_DIR` until sync. Quota for a local-only user is the local disk budget. Quota for a signed-in user is the account budget on the server that holds the blob. Generating questions during ingest uses whichever inference mode C13 selected, and spends credits only for cloud AI.

## Out of scope

- Replacing the parsers that already work (`.txt`, `.md`, `.pdf`, `.epub` in `crates/ingest/src/parser`).
- A vector-store migration. Embeddings stay on `chunk_embeddings` with the brute-force index in `crates/storage/src/vector.rs`.
- Topic mastery, syllabus trees, and resume targets (C22).
- The 75 MB versus 250 MB copy conflict. The server keeps `MAX_UPLOAD_BYTES`. The ticket that touches upload copy records the one limit.

DOCX and OCR are inside C10 only as far as the Add Material design shows them. The current parser returns no parser for `.docx`, and there is no OCR. Whether those ship in the first ingest ticket or a follow-up is a split for T3, not a second capability.

## Crates

`core` for `Source`, `NewSource`, and `Subject` fields. `storage` for the migration and repositories. `ingest` for stages, URL fetch, and any new parser. `api` for the routes. `questions` is called when generate-on-ingest is on; it does not own the pipeline.
