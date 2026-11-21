use thiserror::Error;

#[derive(Debug, Error)]
pub enum IngestError {
    #[error("unsupported file type: {0}")]
    UnsupportedFormat(String),

    #[error("no extractable text in document")]
    NoText,

    #[error("parse failed: {0}")]
    Parse(String),

    #[error("invalid document structure: {0}")]
    InvalidStructure(String),
}