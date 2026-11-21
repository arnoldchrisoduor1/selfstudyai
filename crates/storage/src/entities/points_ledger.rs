#![allow(dead_code)]

use sea_orm::entity::prelude::*;

#[derive(Clone, Debug, PartialEq, Eq, DeriveEntityModel)]
#[sea_orm(table_name = "points_ledger")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub id: String,
    pub amount: i32,
    pub reason: String,
    pub attempt_id: Option<String>,
    pub test_id: Option<String>,
    pub multiplier_breakdown: String,
    pub user_id: Option<String>,
    pub version: i32,
    pub deleted_at: Option<String>,
    pub created_at: String,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
