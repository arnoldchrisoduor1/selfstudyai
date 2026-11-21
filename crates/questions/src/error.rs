use thiserror::Error;

#[derive(Debug, Error)]
pub enum QuestionsError {
    #[error("{0}")]
    Invalid(&'static str),
    #[error("{0}")]
    Validation(String),
    #[error("provider error: {0}")]
    Provider(String),
    #[error("web search error: {0}")]
    WebSearch(String),
    #[error("generation failed: {0}")]
    Generation(String),
}

impl QuestionsError {
    pub fn validation(msg: impl Into<String>) -> Self {
        Self::Validation(msg.into())
    }
}
