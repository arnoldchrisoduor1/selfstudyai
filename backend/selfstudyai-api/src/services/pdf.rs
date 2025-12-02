use anyhow::{Context, Result};
use lopdf::Document as PdfDocument;
use std::io::Cursor;

pub struct PdfService;

impl PdfService {
    /// Extract text from PDF bytes
    pub fn extract_text(pdf_bytes: &[u8]) -> Result<String> {
        let cursor = Cursor::new(pdf_bytes);
        let doc = PdfDocument::load_from(cursor)
            .context("Failed to load PDF document")?;

        let mut text = String::new();
        let pages = doc.get_pages();

        for (page_num, _) in pages.iter() {
            if let Ok(page_text) = doc.extract_text(&[*page_num]) {
                text.push_str(&page_text);
                text.push('\n');
            }
        }

        Ok(text.trim().to_string())
    }

    /// Get page count from PDF
    pub fn get_page_count(pdf_bytes: &[u8]) -> Result<i32> {
        let cursor = Cursor::new(pdf_bytes);
        let doc = PdfDocument::load_from(cursor)
            .context("Failed to load PDF document")?;

        Ok(doc.get_pages().len() as i32)
    }

    /// Chunk text into smaller pieces with overlap
    pub fn chunk_text(text: &str, chunk_size: usize, overlap: usize) -> Vec<String> {
        let words: Vec<&str> = text.split_whitespace().collect();
        let mut chunks = Vec::new();

        if words.is_empty() {
            return chunks;
        }

        let mut i = 0;
        while i < words.len() {
            let end = (i + chunk_size).min(words.len());
            let chunk = words[i..end].join(" ");
            chunks.push(chunk);

            // Move forward by chunk_size - overlap
            if end >= words.len() {
                break;
            }
            i += chunk_size.saturating_sub(overlap);
        }

        chunks
    }

    /// Estimate token count (rough approximation: 1 token ≈ 4 chars)
    pub fn estimate_tokens(text: &str) -> i32 {
        (text.len() / 4) as i32
    }
}