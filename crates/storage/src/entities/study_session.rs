#![allow(dead_code)]

use sea_orm::entity::prelude::*;

#[derive(Clone, Debug, PartialEq, Eq, DeriveEntityModel)]
#[sea_orm(table_name = "study_sessions")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub id: String,
    pub subject_id: String,
    pub scope: String,
    pub grounding_mode: String,
    pub burst_size: i32,
    pub mode: String,
    pub started_at: String,
    pub ended_at: Option<String>,
    pub user_id: Option<String>,
    pub version: i32,
    pub deleted_at: Option<String>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
