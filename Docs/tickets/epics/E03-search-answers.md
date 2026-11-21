# E03 Search and answers

## Goal

Answer a question from the learner's own notes, with citations back to the chunks `POST /search` already returns.

## Scope

- **C12 Cited answers.** `POST /search` stays the passage search (`SearchHit`: chunk, source, topic, `page_ref`, score). A new answer route takes the same filters, retrieves hits, and asks the active provider (C13) for a short answer that cites those hit ids. The syllabus "Ask your notes" action and the search-results overview both use it. Saving the answer as a card and extracting a flashcard from a passage are separate actions in `possible-missed-gaps.md` and are not part of this capability. Closes `hint-ask-notes`.

Local-only users get the answer from the local or bring-your-own-key provider, or from the template fallback in C13 when no model is configured. Signed-in users on cloud AI pay credits through the existing reserve-and-settle path. The answer is stored as an event (C05) and does not become a question until a later, separate action.

## Out of scope

- Replacing hybrid search, FTS5, or the vector index.
- A general chat with memory across days.
- Follow-up question suggestions and related-concept mastery. Those are listed as possible misses, not accepted gaps.
- Changing citation rules for generated study questions. Notes-mode questions already require chunk citations (`crates/questions`).

## Crates

`api` for the route. `storage` for the existing search. `ai` for the chat call. `questions` only if the prompt helpers there are reused. `core` for the answer and citation types.
