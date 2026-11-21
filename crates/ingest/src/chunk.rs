use crate::types::{ChunkDraft, ParsedDocument};

/// Rough whitespace token estimate.
pub fn estimate_tokens(text: &str) -> i32 {
    text.split_whitespace().count() as i32
}

const DEFAULT_TARGET: i32 = 500;

/// Chunk sections into ~`target_tokens` (default 500) with `overlap_tokens` overlap (default 50).
/// Splits on `.!?` followed by space or newline when possible.
pub fn chunk_document(doc: &ParsedDocument, target_tokens: i32, overlap_tokens: i32) -> Vec<ChunkDraft> {
    let target = if target_tokens > 0 {
        target_tokens
    } else {
        DEFAULT_TARGET
    };
    let overlap = overlap_tokens.max(0).min(target - 1);

    let mut chunks = Vec::new();
    for (topic_index, topic) in doc.topics.iter().enumerate() {
        let mut position = 0;
        for section in &topic.sections {
            let section_chunks = chunk_section_text(
                &section.text,
                target,
                overlap,
                topic_index,
                position,
                &section.page_ref,
            );
            position += section_chunks.len() as i32;
            chunks.extend(section_chunks);
        }
    }
    chunks
}

fn chunk_section_text(
    text: &str,
    target: i32,
    overlap: i32,
    topic_index: usize,
    start_position: i32,
    page_ref: &Option<String>,
) -> Vec<ChunkDraft> {
    let trimmed = text.trim();
    if trimmed.is_empty() {
        return vec![];
    }
    if estimate_tokens(trimmed) <= target {
        return vec![ChunkDraft {
            topic_index,
            position: start_position,
            text: trimmed.to_string(),
            token_count: estimate_tokens(trimmed),
            page_ref: page_ref.clone(),
        }];
    }

    let boundaries = sentence_boundaries(trimmed);
    let mut chunks = Vec::new();
    let mut start_byte = 0;
    let mut position = start_position;

    while start_byte < trimmed.len() {
        let window_end = grow_to_token_target(trimmed, start_byte, target, &boundaries);
        let chunk_text = trimmed[start_byte..window_end].trim().to_string();
        if !chunk_text.is_empty() {
            chunks.push(ChunkDraft {
                topic_index,
                position,
                token_count: estimate_tokens(&chunk_text),
                text: chunk_text,
                page_ref: page_ref.clone(),
            });
            position += 1;
        }
        if window_end >= trimmed.len() {
            break;
        }
        let next_start = rewind_for_overlap(trimmed, start_byte, window_end, overlap);
        if next_start <= start_byte {
            start_byte = window_end;
        } else {
            start_byte = next_start;
        }
    }
    chunks
}

fn grow_to_token_target(
    text: &str,
    start: usize,
    target: i32,
    boundaries: &[usize],
) -> usize {
    let mut last_good = start;
    for &b in boundaries.iter().filter(|b| **b > start) {
        let tokens = estimate_tokens(&text[start..b]);
        if tokens > target {
            if last_good > start {
                return last_good;
            }
            return word_boundary_at_token_offset(text, start, target as usize);
        }
        last_good = b;
    }
    if last_good > start {
        return last_good;
    }
    word_boundary_at_token_offset(text, start, target as usize)
}

fn word_boundary_at_token_offset(text: &str, start: usize, target_words: usize) -> usize {
    let slice = &text[start..];
    let mut byte = start;
    for (i, word) in slice.split_whitespace().enumerate() {
        byte += word.len();
        if i + 1 >= target_words {
            return byte.min(text.len());
        }
        byte += 1;
    }
    text.len()
}

fn rewind_for_overlap(text: &str, chunk_start: usize, chunk_end: usize, overlap: i32) -> usize {
    if overlap == 0 {
        return chunk_end;
    }
    let chunk = &text[chunk_start..chunk_end];
    let words: Vec<&str> = chunk.split_whitespace().collect();
    if words.is_empty() {
        return chunk_end;
    }
    let take = (overlap as usize).min(words.len().saturating_sub(1));
    if take == 0 {
        return chunk_end;
    }
    let anchor = words[words.len() - take];
    chunk
        .rfind(anchor)
        .map(|pos| chunk_start + pos)
        .unwrap_or(chunk_end)
}

fn sentence_boundaries(text: &str) -> Vec<usize> {
    let mut out = Vec::new();
    let bytes = text.as_bytes();
    let mut i = 0;
    while i + 2 < bytes.len() {
        let b = bytes[i];
        if matches!(b, b'.' | b'!' | b'?') {
            let next = bytes[i + 1];
            if next == b' ' || next == b'\n' || next == b'\r' {
                out.push(i + 1 + if next == b'\r' && bytes.get(i + 2) == Some(&b'\n') {
                    2
                } else {
                    1
                });
            }
        }
        i += 1;
    }
    if out.last().copied() != Some(text.len()) {
        out.push(text.len());
    }
    out
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::types::{ParsedDocument, ParsedSection, ParsedTopic};

    fn long_sentence(word: &str, count: usize) -> String {
        std::iter::repeat(word)
            .take(count)
            .collect::<Vec<_>>()
            .join(" ")
    }

    #[test]
    fn does_not_split_mid_sentence_when_possible() {
        let s1 = long_sentence("alpha", 120);
        let s2 = long_sentence("beta", 120);
        let text = format!("{s1}. {s2}.");
        let doc = ParsedDocument {
            title: "t".into(),
            topics: vec![ParsedTopic {
                title: "T".into(),
                parent_index: None,
                sections: vec![ParsedSection {
                    text,
                    page_ref: None,
                }],
            }],
        };
        let chunks = chunk_document(&doc, 200, 20);
        assert!(chunks.len() >= 2);
        assert!(!chunks[0].text.ends_with("alph"));
        assert!(chunks[0].text.contains('.'));
    }

    #[test]
    fn overlap_carries_tail_tokens() {
        let words: String = (0..400)
            .map(|i| format!("w{i}"))
            .collect::<Vec<_>>()
            .join(" ");
        let doc = ParsedDocument {
            title: "t".into(),
            topics: vec![ParsedTopic {
                title: "T".into(),
                parent_index: None,
                sections: vec![ParsedSection {
                    text: words,
                    page_ref: None,
                }],
            }],
        };
        let chunks = chunk_document(&doc, 100, 30);
        assert!(chunks.len() > 1);
        let first_words: Vec<&str> = chunks[0].text.split_whitespace().collect();
        let second_words: Vec<&str> = chunks[1].text.split_whitespace().collect();
        assert!(!first_words.is_empty() && !second_words.is_empty());
        let shared = first_words[first_words.len().saturating_sub(30)..]
            .first()
            .copied()
            .unwrap_or(first_words[0]);
        assert_eq!(second_words.first().copied(), Some(shared));
    }
}