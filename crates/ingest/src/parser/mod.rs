mod epub;
mod markdown;
mod pdf;
mod txt;

use crate::error::IngestError;
use crate::types::{ParsedDocument, ParsedSection, ParsedTopic};

pub use epub::EpubParser;
pub use markdown::MarkdownParser;
pub use pdf::PdfParser;
pub use txt::TxtParser;

pub trait Parser: Send + Sync {
    fn supports(&self, file_name: &str) -> bool;
    fn parse(&self, bytes: &[u8], file_name: &str) -> Result<ParsedDocument, IngestError>;
}

pub fn parser_for(file_name: &str) -> Option<Box<dyn Parser>> {
    let lower = file_name.to_ascii_lowercase();
    if lower.ends_with(".txt") {
        return Some(Box::new(TxtParser));
    }
    if lower.ends_with(".md") || lower.ends_with(".markdown") {
        return Some(Box::new(MarkdownParser));
    }
    if lower.ends_with(".pdf") {
        return Some(Box::new(PdfParser));
    }
    if lower.ends_with(".epub") {
        return Some(Box::new(EpubParser));
    }
    None
}

pub(crate) fn strip_html(html: &str) -> String {
    let mut out = String::with_capacity(html.len());
    let mut in_tag = false;
    let mut prev_space = false;
    for ch in html.chars() {
        match ch {
            '<' => in_tag = true,
            '>' => {
                in_tag = false;
                if !prev_space && !out.is_empty() {
                    out.push(' ');
                    prev_space = true;
                }
            }
            _ if !in_tag => {
                if ch.is_whitespace() {
                    if !prev_space && !out.is_empty() {
                        out.push(' ');
                        prev_space = true;
                    }
                } else {
                    out.push(ch);
                    prev_space = false;
                }
            }
            _ => {}
        }
    }
    out.trim().to_string()
}

pub(crate) fn title_from_file_name(file_name: &str) -> String {
    let base = file_name
        .rsplit(['/', '\\'])
        .next()
        .unwrap_or(file_name);
    let stem = base
        .rsplit_once('.')
        .map(|(s, _)| s)
        .unwrap_or(base);
    if stem.is_empty() {
        "Document".to_string()
    } else {
        stem.to_string()
    }
}

pub(crate) fn single_section_topic(
    title: String,
    text: String,
    page_ref: Option<String>,
) -> ParsedDocument {
    ParsedDocument {
        title: title.clone(),
        topics: vec![ParsedTopic {
            title,
            parent_index: None,
            sections: vec![ParsedSection { text, page_ref }],
        }],
    }
}