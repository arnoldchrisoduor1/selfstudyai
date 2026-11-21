use super::{strip_html, title_from_file_name, Parser};
use crate::error::IngestError;
use crate::types::{ParsedDocument, ParsedSection, ParsedTopic};
use epub::doc::{EpubDoc, NavPoint};
use std::io::Cursor;
use std::path::Path;

pub struct EpubParser;

impl Parser for EpubParser {
    fn supports(&self, file_name: &str) -> bool {
        file_name.to_ascii_lowercase().ends_with(".epub")
    }

    fn parse(&self, bytes: &[u8], file_name: &str) -> Result<ParsedDocument, IngestError> {
        let mut doc = EpubDoc::from_reader(Cursor::new(bytes.to_vec())).map_err(|e| {
            IngestError::Parse(format!("could not open EPUB: {e}"))
        })?;

        let title = doc
            .get_title()
            .filter(|t| !t.trim().is_empty())
            .unwrap_or_else(|| title_from_file_name(file_name));

        let toc = doc.toc.clone();
        if !toc.is_empty() {
            let topics = topics_from_toc(&mut doc, &toc)?;
            if topics_have_text(&topics) {
                return Ok(ParsedDocument { title, topics });
            }
        }

        let topics = size_based_chapters(&mut doc)?;
        if topics.is_empty() || !topics_have_text(&topics) {
            return Err(IngestError::NoText);
        }
        Ok(ParsedDocument { title, topics })
    }
}

fn topics_have_text(topics: &[ParsedTopic]) -> bool {
    topics.iter().any(|t| {
        t.sections
            .iter()
            .any(|s| !s.text.trim().is_empty())
    })
}

fn topics_from_toc(doc: &mut EpubDoc<Cursor<Vec<u8>>>, toc: &[NavPoint]) -> Result<Vec<ParsedTopic>, IngestError> {
    let mut topics = Vec::new();
    build_toc_nodes(doc, toc, None, &mut topics)?;
    Ok(topics)
}

fn build_toc_nodes(
    doc: &mut EpubDoc<Cursor<Vec<u8>>>,
    nodes: &[NavPoint],
    parent_index: Option<usize>,
    topics: &mut Vec<ParsedTopic>,
) -> Result<(), IngestError> {
    for node in nodes {
        let idx = topics.len();
        let path = node.content.clone();
        let text = chapter_text_at(doc, &path).unwrap_or_default();
        let page_ref = path_to_string(&path);
        topics.push(ParsedTopic {
            title: node.label.clone(),
            parent_index,
            sections: if text.trim().is_empty() {
                vec![]
            } else {
                vec![ParsedSection {
                    text,
                    page_ref: Some(page_ref),
                }]
            },
        });
        if !node.children.is_empty() {
            build_toc_nodes(doc, &node.children, Some(idx), topics)?;
        }
    }
    Ok(())
}

fn chapter_text_at(doc: &mut EpubDoc<Cursor<Vec<u8>>>, path: &Path) -> Result<String, IngestError> {
    if let Some(chapter) = doc.resource_uri_to_chapter(&path.to_path_buf()) {
        doc.set_current_chapter(chapter);
        let mut html = String::new();
        if let Some((chunk, _mime)) = doc.get_current_str() {
            html.push_str(&chunk);
        }
        return Ok(strip_html(&html));
    }
    let html = doc
        .get_resource_str_by_path(path)
        .ok_or_else(|| IngestError::Parse(format!("EPUB chapter missing: {}", path.display())))?;
    Ok(strip_html(&html))
}

fn size_based_chapters(doc: &mut EpubDoc<Cursor<Vec<u8>>>) -> Result<Vec<ParsedTopic>, IngestError> {
    let count = doc.get_num_chapters();
    let mut topics = Vec::new();
    for i in 0..count {
        if !doc.set_current_chapter(i) {
            continue;
        }
        let path = doc
            .get_current_path()
            .map(|p| path_to_string(&p))
            .unwrap_or_else(|| format!("Section {}", i + 1));
        let mut html = String::new();
        if let Some((chunk, _mime)) = doc.get_current_str() {
            html.push_str(&chunk);
        }
        let text = strip_html(&html);
        if text.trim().is_empty() {
            continue;
        }
        topics.push(ParsedTopic {
            title: format!("Section {}", i + 1),
            parent_index: None,
            sections: vec![ParsedSection {
                text,
                page_ref: Some(path),
            }],
        });
    }
    Ok(topics)
}

fn path_to_string(path: &Path) -> String {
    path.to_string_lossy().into_owned()
}

#[cfg(test)]
mod tests {
    use super::strip_html;

    #[test]
    fn strip_html_removes_tags() {
        let plain = strip_html("<p>Hello world.</p>");
        assert_eq!(plain, "Hello world.");
    }
}