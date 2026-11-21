//! Question generation, grading helpers, dedupe, and web search.

mod dedupe;
mod error;
mod generate;
mod grade;
mod mix;
mod prompt;
mod schema;
mod web_search;

pub use dedupe::{cosine_similarity, filter_near_duplicates};
pub use error::QuestionsError;
pub use generate::{generate_burst, ChunkContext, GenerateRequest, GenerateResult};
pub use grade::{
    apply_manual_override, assert_no_answer_leak, grade_from_ai_json, grade_mcq, strip_answer_fields,
    GradeResult,
};
pub use mix::allocate_levels;
pub use prompt::{
    generation_system_prompt, generation_user_prompt, grading_system_prompt, grading_user_prompt,
    hostile_stays_in_data_section, wrap_untrusted,
};
pub use schema::{
    extract_json_value, parse_generated_questions, parse_grade, validate_generated, GradeJson,
    GeneratedCitation, GeneratedQuestionJson,
};
pub use web_search::{HttpWebSearchProvider, MockWebSearchProvider, WebSearchHit, WebSearchProvider};
