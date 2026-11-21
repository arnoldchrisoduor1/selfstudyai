#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ParsedDocument {
    pub title: String,
    pub topics: Vec<ParsedTopic>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ParsedTopic {
    pub title: String,
    pub parent_index: Option<usize>,
    pub sections: Vec<ParsedSection>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ParsedSection {
    pub text: String,
    pub page_ref: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ChunkDraft {
    pub topic_index: usize,
    pub position: i32,
    pub text: String,
    pub token_count: i32,
    pub page_ref: Option<String>,
}