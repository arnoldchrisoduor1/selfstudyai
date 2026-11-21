use std::sync::Arc;

use ai::{ChatMessage, Provider};
use study_core::{
    Citation, CognitiveLevel, GoldStatus, GroundingMode, NewQuestion, QuestionKind, PROMPT_VERSION,
};

use crate::dedupe::filter_near_duplicates;
use crate::error::QuestionsError;
use crate::mix::allocate_levels;
use crate::prompt::{generation_system_prompt, generation_user_prompt, wrap_untrusted};
use crate::schema::{
    parse_generated_questions, validate_generated, GeneratedCitation, GeneratedQuestionJson,
};
use crate::web_search::WebSearchProvider;
use study_core::CognitiveMix;

#[derive(Debug, Clone)]
pub struct ChunkContext {
    pub id: String,
    pub text: String,
    pub topic_id: String,
    pub source_id: String,
    pub is_core_topic: bool,
}

#[derive(Debug, Clone)]
pub struct GenerateRequest {
    pub subject_id: String,
    pub grounding: GroundingMode,
    pub burst_size: usize,
    pub mix: CognitiveMix,
    pub chunks: Vec<ChunkContext>,
    pub topic_query: Option<String>,
    pub existing_stems: Vec<(String, String)>,
    pub dedupe_threshold: f32,
    pub provider_label: String,
    pub propose_gold_for_core: bool,
}

#[derive(Debug, Clone)]
pub struct GenerateResult {
    pub questions: Vec<NewQuestion>,
    pub partial_error: Option<String>,
}

pub async fn generate_burst(
    provider: Arc<dyn Provider>,
    web: Option<Arc<dyn WebSearchProvider>>,
    request: GenerateRequest,
) -> Result<GenerateResult, QuestionsError> {
    let levels = allocate_levels(request.burst_size, &request.mix);
    let kinds = cycle_kinds(request.burst_size);
    let (source_blocks, allowed_chunk_ids, online_hit) =
        build_source_blocks(&request, web).await?;

    let system = generation_system_prompt();
    let user = generation_user_prompt(request.grounding, &levels, &kinds, &source_blocks);
    let messages = [
        ChatMessage {
            role: "system".into(),
            content: system,
        },
        ChatMessage {
            role: "user".into(),
            content: user,
        },
    ];

    let mut raw = provider
        .chat(&messages)
        .await
        .map_err(|e| QuestionsError::Provider(e.to_string()))?;
    let mut parsed = match parse_and_validate(&raw, request.grounding, allowed_chunk_ids.as_deref())
    {
        Ok(items) => items,
        Err(first_err) => {
            let retry_messages = [
                messages[0].clone(),
                messages[1].clone(),
                ChatMessage {
                    role: "assistant".into(),
                    content: raw.clone(),
                },
                ChatMessage {
                    role: "user".into(),
                    content: format!(
                        "Your previous output failed validation: {first_err}. \
                         Return corrected JSON only."
                    ),
                },
            ];
            raw = provider
                .chat(&retry_messages)
                .await
                .map_err(|e| QuestionsError::Provider(e.to_string()))?;
            parse_and_validate(&raw, request.grounding, allowed_chunk_ids.as_deref()).map_err(
                |e| QuestionsError::Generation(format!("invalid after retry: {e}")),
            )?
        }
    };

    // Align to requested burst size if model returned extras/short.
    parsed.truncate(request.burst_size);

    let stems: Vec<String> = parsed.iter().map(|q| q.stem.clone()).collect();
    let embeds = provider
        .embed(&stems)
        .await
        .map_err(|e| QuestionsError::Provider(e.to_string()))?;
    let existing_texts: Vec<String> = request.existing_stems.iter().map(|(_, s)| s.clone()).collect();
    let existing_embeds = if existing_texts.is_empty() {
        Vec::new()
    } else {
        provider
            .embed(&existing_texts)
            .await
            .map_err(|e| QuestionsError::Provider(e.to_string()))?
    };
    let candidates: Vec<(String, Vec<f32>)> = stems
        .into_iter()
        .zip(embeds.into_iter())
        .collect();
    let existing_pairs: Vec<(String, Vec<f32>)> = existing_texts
        .into_iter()
        .zip(existing_embeds.into_iter())
        .collect();
    let kept = filter_near_duplicates(&candidates, &existing_pairs, request.dedupe_threshold)?;

    let mut questions = Vec::new();
    let mut partial_error = None;
    for (pos, idx) in kept.into_iter().enumerate() {
        let item = &parsed[idx];
        let level = levels
            .get(pos)
            .copied()
            .unwrap_or(CognitiveLevel::Recall);
        match to_new_question(item, &request, level, online_hit.as_ref()) {
            Ok(q) => questions.push(q),
            Err(err) => {
                partial_error = Some(err.to_string());
            }
        }
    }

    if questions.is_empty() {
        return Err(QuestionsError::Generation(
            partial_error.unwrap_or_else(|| "no questions generated".into()),
        ));
    }

    Ok(GenerateResult {
        questions,
        partial_error,
    })
}

fn cycle_kinds(n: usize) -> Vec<QuestionKind> {
    (0..n)
        .map(|i| {
            if i % 2 == 0 {
                QuestionKind::Mcq
            } else {
                QuestionKind::Written
            }
        })
        .collect()
}

async fn build_source_blocks(
    request: &GenerateRequest,
    web: Option<Arc<dyn WebSearchProvider>>,
) -> Result<(Vec<String>, Option<Vec<String>>, Option<(String, String)>), QuestionsError> {
    match request.grounding {
        GroundingMode::Notes => {
            if request.chunks.is_empty() {
                return Err(QuestionsError::Invalid("notes mode requires chunks"));
            }
            let allowed: Vec<String> = request.chunks.iter().map(|c| c.id.clone()).collect();
            let blocks = request
                .chunks
                .iter()
                .map(|c| wrap_untrusted(&format!("chunk_id={}", c.id), &c.text))
                .collect();
            Ok((blocks, Some(allowed), None))
        }
        GroundingMode::Online => {
            let searcher = web.ok_or(QuestionsError::Invalid("online mode requires web search"))?;
            let query = request
                .topic_query
                .clone()
                .unwrap_or_else(|| "study topic".into());
            let hits = searcher.search(&query, 3).await?;
            let hit = hits
                .into_iter()
                .next()
                .ok_or(QuestionsError::WebSearch("no search hits".into()))?;
            let excerpt = if hit.excerpt.chars().count() > 400 {
                hit.excerpt.chars().take(400).collect()
            } else {
                hit.excerpt.clone()
            };
            let block = wrap_untrusted(
                &format!("url={}", hit.url),
                &format!("{}\n{}", hit.title, excerpt),
            );
            Ok((vec![block], None, Some((hit.url, excerpt))))
        }
    }
}

fn parse_and_validate(
    raw: &str,
    grounding: GroundingMode,
    allowed: Option<&[String]>,
) -> Result<Vec<GeneratedQuestionJson>, QuestionsError> {
    let items = parse_generated_questions(raw)?;
    if items.is_empty() {
        return Err(QuestionsError::validation("empty questions"));
    }
    for item in &items {
        validate_generated(item, grounding, allowed)?;
    }
    Ok(items)
}

fn to_new_question(
    item: &GeneratedQuestionJson,
    request: &GenerateRequest,
    level: CognitiveLevel,
    online_hit: Option<&(String, String)>,
) -> Result<NewQuestion, QuestionsError> {
    let kind = QuestionKind::parse(item.kind.trim()).map_err(QuestionsError::Invalid)?;
    let citation_value = match (&item.citations, request.grounding) {
        (GeneratedCitation::Notes { chunk_ids }, GroundingMode::Notes) => {
            serde_json::to_value(Citation::Notes {
                chunk_ids: chunk_ids.clone(),
            })
            .map_err(|e| QuestionsError::validation(e.to_string()))?
        }
        (GeneratedCitation::Online { url, excerpt }, GroundingMode::Online) => {
            serde_json::to_value(Citation::Online {
                url: url.clone(),
                excerpt: excerpt.clone(),
            })
            .map_err(|e| QuestionsError::validation(e.to_string()))?
        }
        (_, GroundingMode::Online) => {
            let (url, excerpt) = online_hit
                .cloned()
                .ok_or(QuestionsError::Invalid("online citation missing"))?;
            serde_json::to_value(Citation::Online { url, excerpt })
                .map_err(|e| QuestionsError::validation(e.to_string()))?
        }
        _ => return Err(QuestionsError::Invalid("citation grounding mismatch")),
    };

    let (source_id, topic_id, propose_gold) = match request.grounding {
        GroundingMode::Notes => {
            let chunk_ids = match &item.citations {
                GeneratedCitation::Notes { chunk_ids } => chunk_ids.clone(),
                _ => Vec::new(),
            };
            let ctx = request
                .chunks
                .iter()
                .find(|c| chunk_ids.iter().any(|id| id == &c.id));
            (
                ctx.map(|c| c.source_id.clone()),
                ctx.map(|c| c.topic_id.clone()),
                ctx.map(|c| c.is_core_topic).unwrap_or(false) && request.propose_gold_for_core,
            )
        }
        GroundingMode::Online => (None, None, false),
    };

    let gold_status = if propose_gold {
        GoldStatus::Proposed
    } else {
        GoldStatus::None
    };

    let options = item
        .options
        .as_ref()
        .map(|opts| serde_json::to_value(opts).unwrap_or(serde_json::Value::Null));

    NewQuestion {
        subject_id: request.subject_id.clone(),
        source_id,
        topic_id,
        kind: kind.as_str().to_owned(),
        cognitive_level: level.as_str().to_owned(),
        stem: item.stem.clone(),
        options,
        correct_option: item.correct_option.clone(),
        model_answer: item.model_answer.clone(),
        explanation: item.explanation.clone(),
        grounding: request.grounding.as_str().to_owned(),
        citations: citation_value,
        is_gold: false,
        gold_status: gold_status.as_str().to_owned(),
        status: "active".into(),
        generated_by: Some(request.provider_label.clone()),
        prompt_version: Some(PROMPT_VERSION.into()),
    }
    .normalized()
    .map_err(QuestionsError::Invalid)
}
