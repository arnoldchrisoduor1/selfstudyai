//! PDF parsing via text extraction.
//!
//! Scanned PDFs or image-only pages have no text layer; those return
//! [`IngestError::NoText`]. Outline/bookmarks are used when present.

use super::Parser;
use crate::error::IngestError;
use crate::types::{ParsedDocument, ParsedSection, ParsedTopic};
use indexmap::IndexMap;
use lopdf::{Document, Object, Outline};
use pdf_extract::extract_text_from_mem_by_pages;
use std::collections::BTreeMap;

pub struct PdfParser;

impl Parser for PdfParser {
    fn supports(&self, file_name: &str) -> bool {
        file_name.to_ascii_lowercase().ends_with(".pdf")
    }

    fn parse(&self, bytes: &[u8], file_name: &str) -> Result<ParsedDocument, IngestError> {
        let doc = Document::load_mem(bytes).map_err(|e| {
            IngestError::Parse(format!("could not open PDF: {e}"))
        })?;
        let title = read_pdf_title(&doc).unwrap_or_else(|| super::title_from_file_name(file_name));

        let pages = extract_text_from_mem_by_pages(bytes)
            .map_err(|e| IngestError::Parse(format!("PDF text extraction failed: {e}")))?;

        if pages.iter().all(|p| p.trim().is_empty()) {
            return Err(IngestError::NoText);
        }

        let page_map = build_page_index(&doc);
        let mut named = IndexMap::new();
        if let Ok(Some(outlines)) = doc.get_outlines(None, None, &mut named) {
            if !outlines.is_empty() {
                let mut topics = Vec::new();
                push_outline_nodes(&outlines, None, &pages, &page_map, &mut topics);
                if topics_have_text(&topics) {
                    return Ok(ParsedDocument { title, topics });
                }
            }
        }

        let topics = topics_from_pages(&pages);
        if topics.is_empty() {
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

fn read_pdf_title(doc: &Document) -> Option<String> {
    let info = doc.trailer.get(b"Info").ok()?;
    let id = info.as_reference().ok()?;
    let dict = doc.get_dictionary(id).ok()?;
    let title = dict.get(b"Title").ok()?;
    object_to_string(title)
}

fn object_to_string(obj: &Object) -> Option<String> {
    match obj {
        Object::String(bytes, _) => String::from_utf8(bytes.clone()).ok(),
        Object::Name(name) => Some(String::from_utf8_lossy(name).into_owned()),
        _ => None,
    }
}

fn build_page_index(doc: &Document) -> BTreeMap<(u32, u16), usize> {
    let mut map = BTreeMap::new();
    for (i, id) in doc.get_pages().values().enumerate() {
        map.insert(*id, i);
    }
    map
}

fn push_outline_nodes(
    outlines: &[Outline],
    parent_index: Option<usize>,
    pages: &[String],
    page_map: &BTreeMap<(u32, u16), usize>,
    topics: &mut Vec<ParsedTopic>,
) {
    let mut last_destination_parent = parent_index;
    for outline in outlines {
        match outline {
            Outline::Destination(dest) => {
                let title = dest
                    .title()
                    .ok()
                    .and_then(object_to_string)
                    .filter(|t| !t.trim().is_empty())
                    .unwrap_or_else(|| "Section".to_string());
                let (page_idx, page_ref) = dest
                    .page()
                    .ok()
                    .and_then(|p| page_number_from_object(p, page_map))
                    .map(|idx| (idx, Some(format!("Page {}", idx + 1))))
                    .unwrap_or((0, None));
                let text = pages
                    .get(page_idx)
                    .map(|s| s.trim().to_string())
                    .unwrap_or_default();
                let idx = topics.len();
                topics.push(ParsedTopic {
                    title,
                    parent_index,
                    sections: if text.is_empty() {
                        vec![]
                    } else {
                        vec![ParsedSection { text, page_ref }]
                    },
                });
                last_destination_parent = Some(idx);
            }
            Outline::SubOutlines(children) => {
                push_outline_nodes(
                    children,
                    last_destination_parent,
                    pages,
                    page_map,
                    topics,
                );
            }
        }
    }
}

fn page_number_from_object(page: &Object, page_map: &BTreeMap<(u32, u16), usize>) -> Option<usize> {
    let id = page.as_reference().ok()?;
    page_map.get(&id).copied()
}

fn topics_from_pages(pages: &[String]) -> Vec<ParsedTopic> {
    let mut topics = Vec::new();
    for (i, page) in pages.iter().enumerate() {
        let text = page.trim().to_string();
        if text.is_empty() {
            continue;
        }
        topics.push(ParsedTopic {
            title: format!("Page {}", i + 1),
            parent_index: None,
            sections: vec![ParsedSection {
                text,
                page_ref: Some(format!("Page {}", i + 1)),
            }],
        });
    }
    topics
}