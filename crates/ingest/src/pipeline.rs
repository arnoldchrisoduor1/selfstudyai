use crate::chunk::chunk_document;
use crate::error::IngestError;
use crate::parser::parser_for;
use crate::types::ChunkDraft;

#[derive(Debug)]
pub struct PipelineResult {
    pub title: String,
    pub topics: Vec<(String, Option<usize>, bool)>,
    pub chunks: Vec<ChunkDraft>,
}

pub fn run_pipeline(bytes: &[u8], file_name: &str) -> Result<PipelineResult, IngestError> {
    let parser = parser_for(file_name).ok_or_else(|| {
        IngestError::UnsupportedFormat(file_name.to_string())
    })?;
    let doc = parser.parse(bytes, file_name)?;
    let chunks = chunk_document(&doc, 500, 50);
    let topics = doc
        .topics
        .iter()
        .map(|t| (t.title.clone(), t.parent_index, false))
        .collect();
    Ok(PipelineResult {
        title: doc.title,
        topics,
        chunks,
    })
}