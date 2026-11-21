#![allow(dead_code)]

use sea_orm::entity::prelude::*;

#[derive(Clone, Debug, PartialEq, DeriveEntityModel)]
#[sea_orm(table_name = "attempts")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub id: String,
    pub question_id: String,
    pub session_id: Option<String>,
    pub test_id: Option<String>,
    pub answer_text: Option<String>,
    pub selected_option: Option<String>,
    pub score: f32,
    pub verdict: String,
    pub feedback: String,
    pub graded_by: String,
    pub confidence: Option<f32>,
    pub original_score: Option<f32>,
    pub original_verdict: Option<String>,
    pub time_taken_ms: Option<i64>,
    pub user_id: Option<String>,
    pub version: i32,
    pub deleted_at: Option<String>,
    pub created_at: String,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
