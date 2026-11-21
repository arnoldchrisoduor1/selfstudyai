//! Question, session, attempt, and related domain types.

use serde::{Deserialize, Serialize};

fn trimmed(value: String) -> String {
    value.trim().to_owned()
}

fn optional_text(value: Option<String>) -> Option<String> {
    value.and_then(|text| {
        let trimmed = text.trim().to_owned();
        if trimmed.is_empty() {
            None
        } else {
            Some(trimmed)
        }
    })
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum QuestionKind {
    Mcq,
    Written,
}

impl QuestionKind {
    pub fn as_str(self) -> &'static str {
        match self {
            Self::Mcq => "mcq",
            Self::Written => "written",
        }
    }

    pub fn parse(value: &str) -> Result<Self, &'static str> {
        match value {
            "mcq" => Ok(Self::Mcq),
            "written" => Ok(Self::Written),
            _ => Err("kind must be mcq or written"),
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum CognitiveLevel {
    Recall,
    Understand,
    Apply,
    Analyze,
}

impl CognitiveLevel {
    pub fn as_str(self) -> &'static str {
        match self {
            Self::Recall => "recall",
            Self::Understand => "understand",
            Self::Apply => "apply",
            Self::Analyze => "analyze",
        }
    }

    pub fn parse(value: &str) -> Result<Self, &'static str> {
        match value {
            "recall" => Ok(Self::Recall),
            "understand" => Ok(Self::Understand),
            "apply" => Ok(Self::Apply),
            "analyze" => Ok(Self::Analyze),
            _ => Err("cognitive_level must be recall, understand, apply, or analyze"),
        }
    }

    pub fn all() -> [Self; 4] {
        [Self::Recall, Self::Understand, Self::Apply, Self::Analyze]
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum GroundingMode {
    Notes,
    Online,
}

impl GroundingMode {
    pub fn as_str(self) -> &'static str {
        match self {
            Self::Notes => "notes",
            Self::Online => "online",
        }
    }

    pub fn parse(value: &str) -> Result<Self, &'static str> {
        match value {
            "notes" => Ok(Self::Notes),
            "online" => Ok(Self::Online),
            _ => Err("grounding must be notes or online"),
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum GoldStatus {
    None,
    Proposed,
    Confirmed,
    Rejected,
}

impl GoldStatus {
    pub fn as_str(self) -> &'static str {
        match self {
            Self::None => "none",
            Self::Proposed => "proposed",
            Self::Confirmed => "confirmed",
            Self::Rejected => "rejected",
        }
    }

    pub fn parse(value: &str) -> Result<Self, &'static str> {
        match value {
            "none" => Ok(Self::None),
            "proposed" => Ok(Self::Proposed),
            "confirmed" => Ok(Self::Confirmed),
            "rejected" => Ok(Self::Rejected),
            _ => Err("gold_status must be none, proposed, confirmed, or rejected"),
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum QuestionStatus {
    Active,
    Archived,
    Flagged,
}

impl QuestionStatus {
    pub fn as_str(self) -> &'static str {
        match self {
            Self::Active => "active",
            Self::Archived => "archived",
            Self::Flagged => "flagged",
        }
    }

    pub fn parse(value: &str) -> Result<Self, &'static str> {
        match value {
            "active" => Ok(Self::Active),
            "archived" => Ok(Self::Archived),
            "flagged" => Ok(Self::Flagged),
            _ => Err("status must be active, archived, or flagged"),
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum AttemptVerdict {
    Correct,
    Partial,
    Incorrect,
}

impl AttemptVerdict {
    pub fn as_str(self) -> &'static str {
        match self {
            Self::Correct => "correct",
            Self::Partial => "partial",
            Self::Incorrect => "incorrect",
        }
    }

    pub fn parse(value: &str) -> Result<Self, &'static str> {
        match value {
            "correct" => Ok(Self::Correct),
            "partial" => Ok(Self::Partial),
            "incorrect" => Ok(Self::Incorrect),
            _ => Err("verdict must be correct, partial, or incorrect"),
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum GradedBy {
    Deterministic,
    Ai,
    ManualOverride,
}

impl GradedBy {
    pub fn as_str(self) -> &'static str {
        match self {
            Self::Deterministic => "deterministic",
            Self::Ai => "ai",
            Self::ManualOverride => "manual_override",
        }
    }

    pub fn parse(value: &str) -> Result<Self, &'static str> {
        match value {
            "deterministic" => Ok(Self::Deterministic),
            "ai" => Ok(Self::Ai),
            "manual_override" => Ok(Self::ManualOverride),
            _ => Err("graded_by must be deterministic, ai, or manual_override"),
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum UsageKind {
    Generation,
    Grading,
    Embedding,
}

impl UsageKind {
    pub fn as_str(self) -> &'static str {
        match self {
            Self::Generation => "generation",
            Self::Grading => "grading",
            Self::Embedding => "embedding",
        }
    }

    pub fn parse(value: &str) -> Result<Self, &'static str> {
        match value {
            "generation" => Ok(Self::Generation),
            "grading" => Ok(Self::Grading),
            "embedding" => Ok(Self::Embedding),
            _ => Err("usage kind must be generation, grading, or embedding"),
        }
    }
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum Citation {
    Notes { chunk_ids: Vec<String> },
    Online { url: String, excerpt: String },
}

impl Citation {
    pub fn validate(&self) -> Result<(), &'static str> {
        match self {
            Self::Notes { chunk_ids } => {
                if chunk_ids.is_empty() {
                    return Err("notes citation requires chunk_ids");
                }
                if chunk_ids.iter().any(|id| id.trim().is_empty()) {
                    return Err("chunk_ids must be non-empty");
                }
                Ok(())
            }
            Self::Online { url, excerpt } => {
                if url.trim().is_empty() {
                    return Err("online citation requires url");
                }
                if excerpt.trim().is_empty() {
                    return Err("online citation requires excerpt");
                }
                Ok(())
            }
        }
    }
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct CognitiveMix {
    pub recall: u8,
    pub understand: u8,
    pub apply: u8,
    pub analyze: u8,
}

impl Default for CognitiveMix {
    fn default() -> Self {
        Self {
            recall: 30,
            understand: 30,
            apply: 25,
            analyze: 15,
        }
    }
}

impl CognitiveMix {
    pub fn validate(&self) -> Result<(), &'static str> {
        let sum = u16::from(self.recall)
            + u16::from(self.understand)
            + u16::from(self.apply)
            + u16::from(self.analyze);
        if sum != 100 {
            return Err("cognitive mix percentages must sum to 100");
        }
        Ok(())
    }

    pub fn weight(&self, level: CognitiveLevel) -> u8 {
        match level {
            CognitiveLevel::Recall => self.recall,
            CognitiveLevel::Understand => self.understand,
            CognitiveLevel::Apply => self.apply,
            CognitiveLevel::Analyze => self.analyze,
        }
    }
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct QuestionSettings {
    pub default_burst_size: u32,
    pub cognitive_mix: CognitiveMix,
    pub default_grounding_mode: String,
}

impl Default for QuestionSettings {
    fn default() -> Self {
        Self {
            default_burst_size: 4,
            cognitive_mix: CognitiveMix::default(),
            default_grounding_mode: GroundingMode::Notes.as_str().to_owned(),
        }
    }
}

impl QuestionSettings {
    pub fn normalized(self) -> Result<Self, &'static str> {
        if !(1..=20).contains(&self.default_burst_size) {
            return Err("default_burst_size must be 1..=20");
        }
        self.cognitive_mix.validate()?;
        let mode = GroundingMode::parse(self.default_grounding_mode.trim())?
            .as_str()
            .to_owned();
        Ok(Self {
            default_burst_size: self.default_burst_size,
            cognitive_mix: self.cognitive_mix,
            default_grounding_mode: mode,
        })
    }
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Question {
    pub id: String,
    pub subject_id: String,
    pub source_id: Option<String>,
    pub topic_id: Option<String>,
    pub kind: String,
    pub cognitive_level: String,
    pub stem: String,
    pub options: Option<serde_json::Value>,
    pub correct_option: Option<String>,
    pub model_answer: Option<String>,
    pub explanation: Option<String>,
    pub grounding: String,
    pub citations: serde_json::Value,
    pub is_gold: bool,
    pub gold_status: String,
    pub status: String,
    pub generated_by: Option<String>,
    pub prompt_version: Option<String>,
    pub created_at: String,
}

/// Question payload safe to return before the learner answers.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct QuestionPublic {
    pub id: String,
    pub subject_id: String,
    pub source_id: Option<String>,
    pub topic_id: Option<String>,
    pub kind: String,
    pub cognitive_level: String,
    pub stem: String,
    pub options: Option<serde_json::Value>,
    pub grounding: String,
    pub citations: serde_json::Value,
    pub is_gold: bool,
    pub gold_status: String,
    pub status: String,
    pub generated_by: Option<String>,
    pub prompt_version: Option<String>,
    pub created_at: String,
}

impl Question {
    pub fn to_public(&self) -> QuestionPublic {
        QuestionPublic {
            id: self.id.clone(),
            subject_id: self.subject_id.clone(),
            source_id: self.source_id.clone(),
            topic_id: self.topic_id.clone(),
            kind: self.kind.clone(),
            cognitive_level: self.cognitive_level.clone(),
            stem: self.stem.clone(),
            options: self.options.clone(),
            grounding: self.grounding.clone(),
            citations: self.citations.clone(),
            is_gold: self.is_gold,
            gold_status: self.gold_status.clone(),
            status: self.status.clone(),
            generated_by: self.generated_by.clone(),
            prompt_version: self.prompt_version.clone(),
            created_at: self.created_at.clone(),
        }
    }
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct NewQuestion {
    pub subject_id: String,
    pub source_id: Option<String>,
    pub topic_id: Option<String>,
    pub kind: String,
    pub cognitive_level: String,
    pub stem: String,
    pub options: Option<serde_json::Value>,
    pub correct_option: Option<String>,
    pub model_answer: Option<String>,
    pub explanation: Option<String>,
    pub grounding: String,
    pub citations: serde_json::Value,
    pub is_gold: bool,
    pub gold_status: String,
    pub status: String,
    pub generated_by: Option<String>,
    pub prompt_version: Option<String>,
}

impl NewQuestion {
    pub fn normalized(self) -> Result<Self, &'static str> {
        let subject_id = trimmed(self.subject_id);
        let stem = trimmed(self.stem);
        if subject_id.is_empty() {
            return Err("subject_id required");
        }
        if stem.is_empty() {
            return Err("stem required");
        }
        let kind = QuestionKind::parse(self.kind.trim())?;
        let cognitive_level = CognitiveLevel::parse(self.cognitive_level.trim())?;
        let grounding = GroundingMode::parse(self.grounding.trim())?;
        let gold_status = GoldStatus::parse(self.gold_status.trim())?;
        let status = QuestionStatus::parse(self.status.trim())?;

        let correct_option = optional_text(self.correct_option);
        let model_answer = optional_text(self.model_answer);
        match kind {
            QuestionKind::Mcq => {
                let options = self.options.as_ref().ok_or("mcq requires options")?;
                let arr = options.as_array().ok_or("options must be array")?;
                if arr.len() < 2 {
                    return Err("mcq requires at least 2 options");
                }
                let correct = correct_option
                    .as_ref()
                    .ok_or("mcq requires correct_option")?;
                let labels: Vec<String> = arr
                    .iter()
                    .filter_map(|v| v.as_str().map(|s| s.to_owned()))
                    .collect();
                if !labels.iter().any(|l| l == correct) {
                    return Err("correct_option must match an option");
                }
            }
            QuestionKind::Written => {
                if model_answer.is_none() {
                    return Err("written requires model_answer");
                }
            }
        }

        let citations: Citation = serde_json::from_value(self.citations.clone())
            .map_err(|_| "citations must be valid citation object")?;
        citations.validate()?;
        match (&grounding, &citations) {
            (GroundingMode::Notes, Citation::Notes { .. }) => {}
            (GroundingMode::Online, Citation::Online { .. }) => {}
            _ => return Err("citations type must match grounding"),
        }

        Ok(Self {
            subject_id,
            source_id: optional_text(self.source_id),
            topic_id: optional_text(self.topic_id),
            kind: kind.as_str().to_owned(),
            cognitive_level: cognitive_level.as_str().to_owned(),
            stem,
            options: self.options,
            correct_option,
            model_answer,
            explanation: optional_text(self.explanation),
            grounding: grounding.as_str().to_owned(),
            citations: self.citations,
            is_gold: self.is_gold,
            gold_status: gold_status.as_str().to_owned(),
            status: status.as_str().to_owned(),
            generated_by: optional_text(self.generated_by),
            prompt_version: optional_text(self.prompt_version),
        })
    }
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct UpdateQuestion {
    pub stem: Option<String>,
    pub options: Option<serde_json::Value>,
    pub correct_option: Option<String>,
    pub model_answer: Option<String>,
    pub explanation: Option<String>,
    pub status: Option<String>,
    pub is_gold: Option<bool>,
    pub gold_status: Option<String>,
    pub cognitive_level: Option<String>,
}

impl UpdateQuestion {
    pub fn normalized(self) -> Result<Self, &'static str> {
        let stem = match self.stem {
            Some(value) => {
                let t = trimmed(value);
                if t.is_empty() {
                    return Err("stem required");
                }
                Some(t)
            }
            None => None,
        };
        let status = match self.status {
            Some(value) => Some(QuestionStatus::parse(value.trim())?.as_str().to_owned()),
            None => None,
        };
        let gold_status = match self.gold_status {
            Some(value) => Some(GoldStatus::parse(value.trim())?.as_str().to_owned()),
            None => None,
        };
        let cognitive_level = match self.cognitive_level {
            Some(value) => Some(CognitiveLevel::parse(value.trim())?.as_str().to_owned()),
            None => None,
        };
        Ok(Self {
            stem,
            options: self.options,
            correct_option: optional_text(self.correct_option),
            model_answer: optional_text(self.model_answer),
            explanation: optional_text(self.explanation),
            status,
            is_gold: self.is_gold,
            gold_status,
            cognitive_level,
        })
    }
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct QuestionFilter {
    pub subject_id: Option<String>,
    pub source_id: Option<String>,
    pub topic_id: Option<String>,
    pub kind: Option<String>,
    pub cognitive_level: Option<String>,
    pub gold: Option<bool>,
    pub gold_status: Option<String>,
    pub grounding: Option<String>,
    pub status: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct StudySession {
    pub id: String,
    pub subject_id: String,
    pub scope: serde_json::Value,
    pub grounding_mode: String,
    pub burst_size: i32,
    pub mode: String,
    pub started_at: String,
    pub ended_at: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct SessionScope {
    pub source_ids: Vec<String>,
    pub topic_ids: Vec<String>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct NewStudySession {
    pub subject_id: String,
    pub scope: SessionScope,
    pub grounding_mode: String,
    pub burst_size: Option<u32>,
    pub mode: Option<String>,
}

impl NewStudySession {
    pub fn normalized(self) -> Result<Self, &'static str> {
        let subject_id = trimmed(self.subject_id);
        if subject_id.is_empty() {
            return Err("subject_id required");
        }
        let grounding_mode = GroundingMode::parse(self.grounding_mode.trim())?
            .as_str()
            .to_owned();
        if let Some(size) = self.burst_size {
            if !(1..=20).contains(&size) {
                return Err("burst_size must be 1..=20");
            }
        }
        let mode = match self.mode {
            Some(raw) => crate::StudyMode::parse(raw.trim())?.as_str().to_owned(),
            None => crate::StudyMode::Practice.as_str().to_owned(),
        };
        Ok(Self {
            subject_id,
            scope: SessionScope {
                source_ids: self
                    .scope
                    .source_ids
                    .into_iter()
                    .map(trimmed)
                    .filter(|s| !s.is_empty())
                    .collect(),
                topic_ids: self
                    .scope
                    .topic_ids
                    .into_iter()
                    .map(trimmed)
                    .filter(|s| !s.is_empty())
                    .collect(),
            },
            grounding_mode,
            burst_size: self.burst_size,
            mode: Some(mode),
        })
    }
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct SessionQuestion {
    pub id: String,
    pub session_id: String,
    pub question_id: String,
    pub burst_index: i32,
    pub position: i32,
    pub item_kind: String,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct AttemptFeedback {
    pub corrections: Vec<String>,
    pub additions: Vec<String>,
    pub missing_points: Vec<String>,
    pub model_answer: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Attempt {
    pub id: String,
    pub question_id: String,
    pub session_id: Option<String>,
    pub test_id: Option<String>,
    pub answer_text: Option<String>,
    pub selected_option: Option<String>,
    pub score: f32,
    pub verdict: String,
    pub feedback: serde_json::Value,
    pub graded_by: String,
    pub confidence: Option<f32>,
    pub original_score: Option<f32>,
    pub original_verdict: Option<String>,
    pub time_taken_ms: Option<i64>,
    pub created_at: String,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct SubmitAnswer {
    pub question_id: String,
    pub answer_text: Option<String>,
    pub selected_option: Option<String>,
    pub time_taken_ms: Option<i64>,
}

impl SubmitAnswer {
    pub fn normalized(self) -> Result<Self, &'static str> {
        let question_id = trimmed(self.question_id);
        if question_id.is_empty() {
            return Err("question_id required");
        }
        Ok(Self {
            question_id,
            answer_text: optional_text(self.answer_text),
            selected_option: optional_text(self.selected_option),
            time_taken_ms: self.time_taken_ms,
        })
    }
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct OverrideGrade {
    pub verdict: String,
    pub score: Option<f32>,
}

impl OverrideGrade {
    pub fn normalized(self) -> Result<Self, &'static str> {
        let verdict = AttemptVerdict::parse(self.verdict.trim())?;
        let score = self.score.unwrap_or(match verdict {
            AttemptVerdict::Correct => 1.0,
            AttemptVerdict::Partial => 0.5,
            AttemptVerdict::Incorrect => 0.0,
        });
        if !(0.0..=1.0).contains(&score) {
            return Err("score must be 0..=1");
        }
        Ok(Self {
            verdict: verdict.as_str().to_owned(),
            score: Some(score),
        })
    }
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct UsageEvent {
    pub id: String,
    pub provider: String,
    pub model: String,
    pub kind: String,
    pub tokens_in: i32,
    pub tokens_out: i32,
    pub created_at: String,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct NewUsageEvent {
    pub provider: String,
    pub model: String,
    pub kind: String,
    pub tokens_in: i32,
    pub tokens_out: i32,
}

impl NewUsageEvent {
    pub fn normalized(self) -> Result<Self, &'static str> {
        let provider = trimmed(self.provider);
        let model = trimmed(self.model);
        if provider.is_empty() {
            return Err("provider required");
        }
        if model.is_empty() {
            return Err("model required");
        }
        let kind = UsageKind::parse(self.kind.trim())?.as_str().to_owned();
        Ok(Self {
            provider,
            model,
            kind,
            tokens_in: self.tokens_in.max(0),
            tokens_out: self.tokens_out.max(0),
        })
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct WebSearchProvider {
    pub id: String,
    pub name: String,
    pub endpoint: String,
    pub has_api_key: bool,
    pub api_key_hint: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct NewWebSearchProvider {
    pub name: String,
    pub endpoint: String,
    pub api_key: Option<String>,
}

impl NewWebSearchProvider {
    pub fn normalized(self) -> Result<Self, &'static str> {
        let name = trimmed(self.name);
        let endpoint = trimmed(self.endpoint);
        if name.is_empty() {
            return Err("name required");
        }
        if endpoint.is_empty() {
            return Err("endpoint required");
        }
        Ok(Self {
            name,
            endpoint,
            api_key: optional_text(self.api_key),
        })
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct UpdateWebSearchProvider {
    pub name: Option<String>,
    pub endpoint: Option<String>,
    pub api_key: Option<String>,
    pub clear_api_key: Option<bool>,
}

pub const SETTING_BURST_SIZE: &str = "question_default_burst_size";
pub const SETTING_COGNITIVE_MIX: &str = "question_cognitive_mix";
pub const SETTING_GROUNDING_MODE: &str = "question_default_grounding_mode";
pub const SETTING_WEB_SEARCH_PROVIDER: &str = "default_web_search_provider_id";
pub const SETTING_DEDUPE_THRESHOLD: &str = "question_dedupe_threshold";
pub const PROMPT_VERSION: &str = "qgen-v1";
