use serde::{Deserialize, Serialize};
use study_core::{Citation, CognitiveLevel, GroundingMode, QuestionKind};

use crate::error::QuestionsError;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GeneratedQuestionJson {
    pub kind: String,
    pub cognitive_level: String,
    pub stem: String,
    #[serde(default)]
    pub options: Option<Vec<String>>,
    #[serde(default)]
    pub correct_option: Option<String>,
    #[serde(default)]
    pub model_answer: Option<String>,
    #[serde(default)]
    pub explanation: Option<String>,
    pub citations: GeneratedCitation,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(untagged)]
pub enum GeneratedCitation {
    Notes { chunk_ids: Vec<String> },
    Online { url: String, excerpt: String },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GradeJson {
    pub score: f32,
    pub verdict: String,
    #[serde(default)]
    pub corrections: Vec<String>,
    #[serde(default)]
    pub additions: Vec<String>,
    #[serde(default)]
    pub missing_points: Vec<String>,
    #[serde(default)]
    pub confidence: f32,
}

pub fn extract_json_value(raw: &str) -> Result<serde_json::Value, QuestionsError> {
    let trimmed = raw.trim();
    if let Ok(value) = serde_json::from_str::<serde_json::Value>(trimmed) {
        return Ok(value);
    }
    if let Some(start) = trimmed.find("```") {
        let after = &trimmed[start + 3..];
        let after = after.strip_prefix("json").unwrap_or(after).trim_start();
        if let Some(end) = after.find("```") {
            let block = after[..end].trim();
            if let Ok(value) = serde_json::from_str::<serde_json::Value>(block) {
                return Ok(value);
            }
        }
    }
    if let (Some(start), Some(end)) = (trimmed.find('{'), trimmed.rfind('}')) {
        if end > start {
            if let Ok(value) = serde_json::from_str::<serde_json::Value>(&trimmed[start..=end]) {
                return Ok(value);
            }
        }
    }
    if let (Some(start), Some(end)) = (trimmed.find('['), trimmed.rfind(']')) {
        if end > start {
            if let Ok(value) = serde_json::from_str::<serde_json::Value>(&trimmed[start..=end]) {
                return Ok(value);
            }
        }
    }
    Err(QuestionsError::validation("response is not valid JSON"))
}

pub fn parse_generated_questions(raw: &str) -> Result<Vec<GeneratedQuestionJson>, QuestionsError> {
    let value = extract_json_value(raw)?;
    if let Some(arr) = value.as_array() {
        return arr
            .iter()
            .map(|item| {
                serde_json::from_value::<GeneratedQuestionJson>(item.clone())
                    .map_err(|e| QuestionsError::validation(format!("question schema: {e}")))
            })
            .collect();
    }
    if value.get("questions").and_then(|v| v.as_array()).is_some() {
        let questions = value.get("questions").cloned().unwrap();
        return serde_json::from_value::<Vec<GeneratedQuestionJson>>(questions)
            .map_err(|e| QuestionsError::validation(format!("questions array: {e}")));
    }
    serde_json::from_value::<GeneratedQuestionJson>(value)
        .map(|q| vec![q])
        .map_err(|e| QuestionsError::validation(format!("question schema: {e}")))
}

pub fn validate_generated(
    item: &GeneratedQuestionJson,
    grounding: GroundingMode,
    allowed_chunk_ids: Option<&[String]>,
) -> Result<(), QuestionsError> {
    let kind = QuestionKind::parse(item.kind.trim())
        .map_err(QuestionsError::Invalid)?;
    let _level = CognitiveLevel::parse(item.cognitive_level.trim())
        .map_err(QuestionsError::Invalid)?;
    if item.stem.trim().is_empty() {
        return Err(QuestionsError::Invalid("stem required"));
    }
    match kind {
        QuestionKind::Mcq => {
            let options = item
                .options
                .as_ref()
                .ok_or(QuestionsError::Invalid("mcq requires options"))?;
            if options.len() < 2 {
                return Err(QuestionsError::Invalid("mcq requires at least 2 options"));
            }
            let correct = item
                .correct_option
                .as_deref()
                .map(str::trim)
                .filter(|s| !s.is_empty())
                .ok_or(QuestionsError::Invalid("mcq requires correct_option"))?;
            if !options.iter().any(|o| o == correct) {
                return Err(QuestionsError::Invalid("correct_option must match an option"));
            }
        }
        QuestionKind::Written => {
            if item
                .model_answer
                .as_deref()
                .map(str::trim)
                .filter(|s| !s.is_empty())
                .is_none()
            {
                return Err(QuestionsError::Invalid("written requires model_answer"));
            }
        }
    }

    let citation = match &item.citations {
        GeneratedCitation::Notes { chunk_ids } => Citation::Notes {
            chunk_ids: chunk_ids.clone(),
        },
        GeneratedCitation::Online { url, excerpt } => Citation::Online {
            url: url.clone(),
            excerpt: excerpt.clone(),
        },
    };
    citation
        .validate()
        .map_err(QuestionsError::Invalid)?;
    match (grounding, &citation) {
        (GroundingMode::Notes, Citation::Notes { chunk_ids }) => {
            let allowed = allowed_chunk_ids.ok_or(QuestionsError::Invalid("chunk allow-list required"))?;
            if chunk_ids.iter().any(|id| !allowed.iter().any(|a| a == id)) {
                return Err(QuestionsError::Invalid("citation chunk_id not in retrieved chunks"));
            }
        }
        (GroundingMode::Online, Citation::Online { .. }) => {}
        _ => return Err(QuestionsError::Invalid("citations type must match grounding")),
    }
    Ok(())
}

pub fn parse_grade(raw: &str) -> Result<GradeJson, QuestionsError> {
    let value = extract_json_value(raw)?;
    let grade: GradeJson = serde_json::from_value(value)
        .map_err(|e| QuestionsError::validation(format!("grade schema: {e}")))?;
    if !(0.0..=1.0).contains(&grade.score) {
        return Err(QuestionsError::Invalid("score must be 0..=1"));
    }
    study_core::AttemptVerdict::parse(grade.verdict.trim()).map_err(QuestionsError::Invalid)?;
    if !(0.0..=1.0).contains(&grade.confidence) {
        return Err(QuestionsError::Invalid("confidence must be 0..=1"));
    }
    Ok(grade)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn validates_mcq_with_chunk_citations() {
        let q = GeneratedQuestionJson {
            kind: "mcq".into(),
            cognitive_level: "recall".into(),
            stem: "What is X?".into(),
            options: Some(vec!["A".into(), "B".into()]),
            correct_option: Some("A".into()),
            model_answer: None,
            explanation: Some("because".into()),
            citations: GeneratedCitation::Notes {
                chunk_ids: vec!["c1".into()],
            },
        };
        validate_generated(&q, GroundingMode::Notes, Some(&["c1".into()])).unwrap();
    }

    #[test]
    fn rejects_notes_question_without_valid_citation() {
        let q = GeneratedQuestionJson {
            kind: "written".into(),
            cognitive_level: "apply".into(),
            stem: "Explain X".into(),
            options: None,
            correct_option: None,
            model_answer: Some("Y".into()),
            explanation: None,
            citations: GeneratedCitation::Notes {
                chunk_ids: vec!["missing".into()],
            },
        };
        assert!(validate_generated(&q, GroundingMode::Notes, Some(&["c1".into()])).is_err());
    }

    #[test]
    fn parse_questions_retries_friendly_wrapper() {
        let raw = r#"{"questions":[{"kind":"written","cognitive_level":"recall","stem":"S","model_answer":"A","citations":{"chunk_ids":["c1"]}}]}"#;
        let parsed = parse_generated_questions(raw).unwrap();
        assert_eq!(parsed.len(), 1);
    }
}
