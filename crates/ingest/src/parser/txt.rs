use super::{title_from_file_name, Parser};
use crate::error::IngestError;
use crate::types::ParsedDocument;

pub struct TxtParser;

impl Parser for TxtParser {
    fn supports(&self, file_name: &str) -> bool {
        file_name.to_ascii_lowercase().ends_with(".txt")
    }

    fn parse(&self, bytes: &[u8], file_name: &str) -> Result<ParsedDocument, IngestError> {
        let text = std::str::from_utf8(bytes)
            .map_err(|e| IngestError::Parse(format!("text file is not valid UTF-8: {e}")))?
            .trim()
            .to_string();
        if text.is_empty() {
            return Err(IngestError::NoText);
        }
        let title = title_from_file_name(file_name);
        Ok(super::single_section_topic(title, text, None))
    }
}