//! Source ingestion: parse study files into topics and chunks.
//!
//! PDF support depends on an embedded text layer; scanned image-only PDFs
//! return [`IngestError::NoText`].

mod chunk;
mod error;
mod hash;
mod parser;
mod pipeline;
mod types;

pub use chunk::{chunk_document, estimate_tokens};
pub use error::IngestError;
pub use hash::content_hash;
pub use parser::{
    parser_for, EpubParser, MarkdownParser, Parser, PdfParser, TxtParser,
};
pub use pipeline::{run_pipeline, PipelineResult};
pub use types::{ChunkDraft, ParsedDocument, ParsedSection, ParsedTopic};

/// Lightweight status hook for the API health banner.
pub struct IngestPipeline;

impl IngestPipeline {
    pub fn status() -> &'static str {
        "ready"
    }
}