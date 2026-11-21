use async_trait::async_trait;
use sea_orm::{
    ActiveModelTrait, ColumnTrait, ConnectionTrait, EntityTrait, QueryFilter, QueryOrder,
    QuerySelect, Set, Statement,
};
use study_core::{CreditKind, CreditsBalance, CreditsLedgerEntry};

use crate::entities::{credit_reservation, credits_ledger};
use crate::error::{map_query, StorageError};
use crate::Store;

fn entry_from(model: credits_ledger::Model) -> CreditsLedgerEntry {
    CreditsLedgerEntry {
        id: model.id,
        user_id: model.user_id,
        amount: model.amount,
        kind: model.kind,
        reference: model.reference,
        created_at: model.created_at,
    }
}

#[async_trait]
pub trait CreditsRepository: Send + Sync {
    async fn append_entry(
        &self,
        user_id: &str,
        amount: i64,
        kind: CreditKind,
        reference: Option<String>,
    ) -> Result<CreditsLedgerEntry, StorageError>;
    async fn balance(&self, user_id: &str) -> Result<CreditsBalance, StorageError>;
    async fn list_ledger(&self, user_id: &str, limit: u32) -> Result<Vec<CreditsLedgerEntry>, StorageError>;
    async fn reserve(&self, user_id: &str, amount: i64) -> Result<String, StorageError>;
    async fn release_reservation(&self, reservation_id: &str) -> Result<(), StorageError>;
    async fn settle_reservation(&self, reservation_id: &str, actual_amount: i64, reference: &str) -> Result<(), StorageError>;
    async fn spend_today(&self, user_id: &str, day_start: &str) -> Result<i64, StorageError>;
}

#[async_trait]
impl CreditsRepository for Store {
    async fn append_entry(
        &self,
        user_id: &str,
        amount: i64,
        kind: CreditKind,
        reference: Option<String>,
    ) -> Result<CreditsLedgerEntry, StorageError> {
        let active = credits_ledger::ActiveModel {
            id: Set(study_core::new_id()),
            user_id: Set(user_id.to_owned()),
            amount: Set(amount),
            kind: Set(kind.as_str().to_owned()),
            reference: Set(reference),
            created_at: Set(self.now()),
            ..Default::default()
        };
        let model = active.insert(&self.db).await.map_err(map_query)?;
        Ok(entry_from(model))
    }

    async fn balance(&self, user_id: &str) -> Result<CreditsBalance, StorageError> {
        let backend = self.db.get_database_backend();
        let sum_row = self
            .db
            .query_one(Statement::from_sql_and_values(
                backend,
                "SELECT COALESCE(SUM(amount), 0) AS total FROM credits_ledger WHERE user_id = ?1",
                [user_id.into()],
            ))
            .await
            .map_err(map_query)?;
        let balance = sum_row
            .and_then(|row| row.try_get::<i64>("", "total").ok())
            .unwrap_or(0);
        let reserved_row = self
            .db
            .query_one(Statement::from_sql_and_values(
                backend,
                "SELECT COALESCE(SUM(amount), 0) AS total FROM credit_reservations WHERE user_id = ?1 AND settled_at IS NULL AND released_at IS NULL",
                [user_id.into()],
            ))
            .await
            .map_err(map_query)?;
        let reserved = reserved_row
            .and_then(|row| row.try_get::<i64>("", "total").ok())
            .unwrap_or(0);
        Ok(CreditsBalance {
            balance,
            reserved,
            available: balance - reserved,
        })
    }

    async fn list_ledger(&self, user_id: &str, limit: u32) -> Result<Vec<CreditsLedgerEntry>, StorageError> {
        let rows = credits_ledger::Entity::find()
            .filter(credits_ledger::Column::UserId.eq(user_id))
            .order_by_desc(credits_ledger::Column::CreatedAt)
            .limit(limit as u64)
            .all(&self.db)
            .await
            .map_err(map_query)?;
        Ok(rows.into_iter().map(entry_from).collect())
    }

    async fn reserve(&self, user_id: &str, amount: i64) -> Result<String, StorageError> {
        if amount <= 0 {
            return Err(StorageError::Invalid("amount must be positive"));
        }
        let bal = self.balance(user_id).await?;
        if bal.available < amount {
            return Err(StorageError::Invalid("insufficient credits"));
        }
        let id = study_core::new_id();
        let active = credit_reservation::ActiveModel {
            id: Set(id.clone()),
            user_id: Set(user_id.to_owned()),
            amount: Set(amount),
            created_at: Set(self.now()),
            settled_at: Set(None),
            released_at: Set(None),
            ..Default::default()
        };
        active.insert(&self.db).await.map_err(map_query)?;
        Ok(id)
    }

    async fn release_reservation(&self, reservation_id: &str) -> Result<(), StorageError> {
        let Some(existing) = credit_reservation::Entity::find_by_id(reservation_id)
            .one(&self.db)
            .await
            .map_err(map_query)?
        else {
            return Err(StorageError::Invalid("reservation not found"));
        };
        let mut active: credit_reservation::ActiveModel = existing.into();
        active.released_at = Set(Some(self.now()));
        active.update(&self.db).await.map_err(map_query)?;
        Ok(())
    }

    async fn settle_reservation(
        &self,
        reservation_id: &str,
        actual_amount: i64,
        reference: &str,
    ) -> Result<(), StorageError> {
        let Some(existing) = credit_reservation::Entity::find_by_id(reservation_id)
            .one(&self.db)
            .await
            .map_err(map_query)?
        else {
            return Err(StorageError::Invalid("reservation not found"));
        };
        if existing.settled_at.is_some() || existing.released_at.is_some() {
            return Err(StorageError::Invalid("reservation already closed"));
        }
        self.append_entry(
            &existing.user_id,
            -actual_amount,
            CreditKind::Usage,
            Some(reference.to_owned()),
        )
        .await?;
        let refund = existing.amount - actual_amount;
        if refund > 0 {
            self.append_entry(
                &existing.user_id,
                refund,
                CreditKind::Refund,
                Some(format!("reservation:{reservation_id}")),
            )
            .await?;
        }
        let mut active: credit_reservation::ActiveModel = existing.into();
        active.settled_at = Set(Some(self.now()));
        active.update(&self.db).await.map_err(map_query)?;
        Ok(())
    }

    async fn spend_today(&self, user_id: &str, day_start: &str) -> Result<i64, StorageError> {
        let backend = self.db.get_database_backend();
        let row = self
            .db
            .query_one(Statement::from_sql_and_values(
                backend,
                "SELECT COALESCE(SUM(ABS(amount)), 0) AS spent FROM credits_ledger WHERE user_id = ?1 AND kind = 'usage' AND created_at >= ?2",
                [user_id.into(), day_start.into()],
            ))
            .await
            .map_err(map_query)?;
        Ok(row
            .and_then(|r| r.try_get::<i64>("", "spent").ok())
            .unwrap_or(0))
    }
}