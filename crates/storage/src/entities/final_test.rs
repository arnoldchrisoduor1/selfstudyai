#![allow(dead_code)]

use sea_orm::entity::prelude::*;

#[derive(Clone, Debug, PartialEq, DeriveEntityModel)]
#[sea_orm(table_name = "tests")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub id: String,
    pub subject_id: String,
    pub config: String,
    pub status: String,
    pub started_at: Option<String>,
    pub submitted_at: Option<String>,
    pub time_limit_s: Option<i32>,
    pub score: Option<f64>,
    pub pass: Option<bool>,
    pub integrity_status: String,
    pub user_id: Option<String>,
    pub version: i32,
    pub deleted_at: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
