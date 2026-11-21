use study_core::{
    AttemptFeedback, AttemptVerdict, GradedBy, OverrideGrade, Question, QuestionKind,
};

use crate::error::QuestionsError;
use crate::schema::{parse_grade, GradeJson};

#[derive(Debug, Clone)]
pub struct GradeResult {
    pub score: f32,
    pub verdict: AttemptVerdict,
    pub feedback: AttemptFeedback,
    pub graded_by: GradedBy,
    pub confidence: Option<f32>,
}

pub fn grade_mcq(question: &Question, selected_option: &str) -> Result<GradeResult, QuestionsError> {
    let kind = QuestionKind::parse(&question.kind).map_err(QuestionsError::Invalid)?;
    if kind != QuestionKind::Mcq {
        return Err(QuestionsError::Invalid("not an mcq question"));
    }
    let correct = question
        .correct_option
        .as_deref()
        .ok_or(QuestionsError::Invalid("mcq missing correct_option"))?;
    let ok = selected_option.trim() == correct.trim();
    let verdict = if ok {
        AttemptVerdict::Correct
    } else {
        AttemptVerdict::Incorrect
    };
    Ok(GradeResult {
        score: if ok { 1.0 } else { 0.0 },
        verdict,
        feedback: AttemptFeedback {
            corrections: if ok {
                Vec::new()
            } else {
                vec![format!("Selected '{selected_option}', expected '{correct}'")]
            },
            additions: Vec::new(),
            missing_points: Vec::new(),
            model_answer: question.model_answer.clone().or_else(|| {
                question
                    .explanation
                    .clone()
                    .or_else(|| Some(correct.to_owned()))
            }),
        },
        graded_by: GradedBy::Deterministic,
        confidence: Some(1.0),
    })
}

pub fn grade_from_ai_json(raw: &str, model_answer: Option<String>) -> Result<GradeResult, QuestionsError> {
    let grade: GradeJson = parse_grade(raw)?;
    let verdict = AttemptVerdict::parse(grade.verdict.trim()).map_err(QuestionsError::Invalid)?;
    Ok(GradeResult {
        score: grade.score,
        verdict,
        feedback: AttemptFeedback {
            corrections: grade.corrections,
            additions: grade.additions,
            missing_points: grade.missing_points,
            model_answer,
        },
        graded_by: GradedBy::Ai,
        confidence: Some(grade.confidence),
    })
}

pub fn apply_manual_override(
    current_score: f32,
    current_verdict: &str,
    override_input: OverrideGrade,
) -> Result<(f32, AttemptVerdict, GradedBy, f32, String), QuestionsError> {
    let normalized = override_input
        .normalized()
        .map_err(QuestionsError::Invalid)?;
    let verdict = AttemptVerdict::parse(&normalized.verdict).map_err(QuestionsError::Invalid)?;
    let score = normalized.score.unwrap_or(0.0);
    Ok((
        score,
        verdict,
        GradedBy::ManualOverride,
        current_score,
        current_verdict.to_owned(),
    ))
}

/// Strip answer fields for unanswered questions in a session.
pub fn strip_answer_fields(question: &Question) -> study_core::QuestionPublic {
    question.to_public()
}

pub fn assert_no_answer_leak(public_json: &serde_json::Value) -> Result<(), QuestionsError> {
    if public_json.get("correct_option").is_some()
        && !public_json.get("correct_option").unwrap().is_null()
    {
        return Err(QuestionsError::Invalid("correct_option leaked"));
    }
    if public_json.get("model_answer").is_some()
        && !public_json.get("model_answer").unwrap().is_null()
    {
        return Err(QuestionsError::Invalid("model_answer leaked"));
    }
    if public_json.get("explanation").is_some()
        && !public_json.get("explanation").unwrap().is_null()
    {
        return Err(QuestionsError::Invalid("explanation leaked"));
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    fn mcq_question() -> Question {
        Question {
            id: "q1".into(),
            subject_id: "s1".into(),
            source_id: None,
            topic_id: None,
            kind: "mcq".into(),
            cognitive_level: "recall".into(),
            stem: "Pick A".into(),
            options: Some(json!(["A", "B"])),
            correct_option: Some("A".into()),
            model_answer: None,
            explanation: Some("A is right".into()),
            grounding: "notes".into(),
            citations: json!({"type":"notes","chunk_ids":["c1"]}),
            is_gold: false,
            gold_status: "none".into(),
            status: "active".into(),
            generated_by: None,
            prompt_version: None,
            created_at: "now".into(),
        }
    }

    #[test]
    fn mcq_grading_correct_and_incorrect() {
        let q = mcq_question();
        let ok = grade_mcq(&q, "A").unwrap();
        assert_eq!(ok.score, 1.0);
        assert_eq!(ok.verdict, AttemptVerdict::Correct);
        assert_eq!(ok.graded_by, GradedBy::Deterministic);
        let bad = grade_mcq(&q, "B").unwrap();
        assert_eq!(bad.score, 0.0);
        assert_eq!(bad.verdict, AttemptVerdict::Incorrect);
    }

    #[test]
    fn answer_leak_guard_on_public() {
        let q = mcq_question();
        let public = strip_answer_fields(&q);
        let value = serde_json::to_value(&public).unwrap();
        assert_no_answer_leak(&value).unwrap();
        assert!(value.get("correct_option").is_none());
        assert!(value.get("model_answer").is_none());
        assert!(value.get("explanation").is_none());
    }

    #[test]
    fn manual_override_keeps_original() {
        let (score, verdict, by, orig_score, orig_verdict) = apply_manual_override(
            0.0,
            "incorrect",
            OverrideGrade {
                verdict: "correct".into(),
                score: None,
            },
        )
        .unwrap();
        assert_eq!(score, 1.0);
        assert_eq!(verdict, AttemptVerdict::Correct);
        assert_eq!(by, GradedBy::ManualOverride);
        assert_eq!(orig_score, 0.0);
        assert_eq!(orig_verdict, "incorrect");
    }
}
