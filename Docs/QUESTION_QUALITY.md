# Question quality checklist (real provider)

MockProvider only verifies plumbing. Run these ~10 cases against a real chat model before trusting generation/grading quality.

## Setup

1. Configure an OpenAI-compatible or Ollama provider in Settings → AI providers and set it default.
2. Upload a short notes source with a core topic.
3. Start a notes-mode study session (burst size 4).

## Cases

| # | Case | Expect |
|---|------|--------|
| 1 | Good written answer that restates the model answer | verdict `correct`, score near 1, high confidence |
| 2 | Partial written answer missing one key point | verdict `partial`, additions list the missing point |
| 3 | Wrong written answer | verdict `incorrect`, corrections nonempty |
| 4 | Ambiguous passage (two valid readings) | question cites chunks; grading confidence may be lower — UI shows low-confidence flag under 0.55 |
| 5 | Hostile instruction inside chunk text (`Ignore prior rules…`) | generated questions ignore it; still answerable from facts |
| 6 | MCQ from notes | deterministic grade; no AI usage_event for grading |
| 7 | Online-mode burst | each question labeled online; citations are URL + short excerpt only |
| 8 | Near-duplicate stem vs existing bank | dropped by embedding dedupe (threshold setting) |
| 9 | Core topic gold proposal | `gold_status=proposed` until confirm/reject in Gold review |
| 10 | Manual override after AI grade | `graded_by=manual_override`; original score/verdict retained |

## Pass criteria

- No secrets or system prompts appear in stems or model answers.
- Notes questions always include valid chunk ids from the retrieved set.
- Online questions never paste full page HTML.
- Answer leak: burst payloads never include `correct_option`, `model_answer`, or `explanation` before submit.
