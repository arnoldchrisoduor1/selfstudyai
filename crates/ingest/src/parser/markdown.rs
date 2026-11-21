use super::{title_from_file_name, Parser};
use crate::error::IngestError;
use crate::types::{ParsedDocument, ParsedSection, ParsedTopic};

pub struct MarkdownParser;

impl Parser for MarkdownParser {
    fn supports(&self, file_name: &str) -> bool {
        let lower = file_name.to_ascii_lowercase();
        lower.ends_with(".md") || lower.ends_with(".markdown")
    }

    fn parse(&self, bytes: &[u8], file_name: &str) -> Result<ParsedDocument, IngestError> {
        let content = std::str::from_utf8(bytes)
            .map_err(|e| IngestError::Parse(format!("markdown is not valid UTF-8: {e}")))?;
        parse_markdown(content, title_from_file_name(file_name))
    }
}

fn parse_markdown(content: &str, doc_title: String) -> Result<ParsedDocument, IngestError> {
    let mut topics: Vec<ParsedTopic> = Vec::new();
    let mut stack: Vec<(u8, usize)> = Vec::new();
    let mut current_topic: Option<usize> = None;
    let mut body_lines: Vec<String> = Vec::new();

    let flush_body = |topics: &mut Vec<ParsedTopic>,
                      current: &mut Option<usize>,
                      lines: &mut Vec<String>| {
        let text = lines.join("\n").trim().to_string();
        lines.clear();
        if text.is_empty() {
            return;
        }
        if let Some(idx) = current.take() {
            topics[idx].sections.push(ParsedSection {
                text,
                page_ref: None,
            });
        } else if topics.is_empty() {
            topics.push(ParsedTopic {
                title: doc_title.clone(),
                parent_index: None,
                sections: vec![ParsedSection {
                    text,
                    page_ref: None,
                }],
            });
        }
    };

    let mut saw_heading = false;

    for line in content.lines() {
        if let Some((level, title)) = heading_line(line) {
            flush_body(&mut topics, &mut current_topic, &mut body_lines);
            saw_heading = true;

            while stack
                .last()
                .is_some_and(|(l, _)| *l >= level)
            {
                stack.pop();
            }
            let parent_index = stack.last().map(|(_, i)| *i);
            let idx = topics.len();
            topics.push(ParsedTopic {
                title,
                parent_index,
                sections: Vec::new(),
            });
            stack.push((level, idx));
            current_topic = Some(idx);
        } else {
            body_lines.push(line.to_string());
        }
    }
    flush_body(&mut topics, &mut current_topic, &mut body_lines);

    if !saw_heading {
        let text = content.trim().to_string();
        if text.is_empty() {
            return Err(IngestError::NoText);
        }
        return Ok(ParsedDocument {
            title: doc_title,
            topics: vec![ParsedTopic {
                title: "Document".to_string(),
                parent_index: None,
                sections: vec![ParsedSection {
                    text,
                    page_ref: None,
                }],
            }],
        });
    }

    if topics.is_empty() {
        return Err(IngestError::NoText);
    }

    let title = doc_title;

    Ok(ParsedDocument { title, topics })
}

fn heading_line(line: &str) -> Option<(u8, String)> {
    let trimmed = line.trim_start();
    if !trimmed.starts_with('#') {
        return None;
    }
    let hashes = trimmed.chars().take_while(|c| *c == '#').count();
    if hashes == 0 || hashes > 6 {
        return None;
    }
    let rest = trimmed[hashes..].trim_start();
    if rest.is_empty() {
        return None;
    }
    if hashes < trimmed.len() && trimmed.as_bytes().get(hashes).is_none_or(|b| *b != b' ') {
        return None;
    }
    Some((hashes as u8, rest.to_string()))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn nested_headings_set_parent_index() {
        let md = "# Root\n\nIntro.\n\n## Child\n\nDetail.";
        let doc = parse_markdown(md, "doc".into()).unwrap();
        assert_eq!(doc.topics.len(), 2);
        assert_eq!(doc.topics[0].parent_index, None);
        assert_eq!(doc.topics[1].parent_index, Some(0));
        assert!(doc.topics[1].sections[0].text.contains("Detail"));
    }
}