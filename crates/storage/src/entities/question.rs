#![allow(dead_code)]

use sea_orm::entity::prelude::*;

#[derive(Clone, Debug, PartialEq, DeriveEntityModel)]
#[sea_orm(table_name = "questions")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub id: String,
    pub subject_id: String,
    pub source_id: Option<String>,
    pub topic_id: Option<String>,
    pub kind: String,
    pub cognitive_level: String,
    pub stem: String,
    pub options: Option<String>,
    pub correct_option: Option<String>,
    pub model_answer: Option<String>,
    pub explanation: Option<String>,
    pub grounding: String,
    pub citations: String,
    pub is_gold: bool,
    pub gold_status: String,
    pub status: String,
    pub generated_by: Option<String>,
    pub prompt_version: Option<String>,
    pub user_id: Option<String>,
    pub version: i32,
    pub deleted_at: Option<String>,
    pub created_at: String,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
