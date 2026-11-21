#![allow(dead_code)]

use sea_orm::entity::prelude::*;

#[derive(Clone, Debug, PartialEq, DeriveEntityModel)]
#[sea_orm(table_name = "review_logs")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub id: String,
    pub question_id: String,
    pub attempt_id: String,
    pub rating: String,
    pub state_before: String,
    pub state_after: String,
    pub scheduled_days: f64,
    pub elapsed_days: f64,
    pub user_id: Option<String>,
    pub version: i32,
    pub deleted_at: Option<String>,
    pub created_at: String,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
