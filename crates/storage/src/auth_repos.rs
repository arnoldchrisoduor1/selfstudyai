use async_trait::async_trait;
use sea_orm::{
    ActiveModelTrait, ColumnTrait, ConnectionTrait, EntityTrait, QueryFilter, QueryOrder, Set,
};
use study_core::{AuthSessionPublic, UserAccount};

use crate::entities::{auth_session, email_token, user};
use crate::error::{map_query, StorageError};
use crate::Store;

pub const TOKEN_KIND_VERIFY: &str = "verify";
pub const TOKEN_KIND_RESET: &str = "reset";
pub const SESSION_KIND_COOKIE: &str = "cookie";
pub const SESSION_KIND_BEARER: &str = "bearer";

fn user_from(model: user::Model) -> UserAccount {
    UserAccount {
        id: model.id,
        email: model.email,
        email_verified: model.email_verified,
        created_at: model.created_at,
        updated_at: model.updated_at,
    }
}

fn session_from(model: auth_session::Model) -> AuthSessionPublic {
    AuthSessionPublic {
        id: model.id,
        user_id: model.user_id,
        kind: model.kind,
        user_agent: model.user_agent,
        created_at: model.created_at,
        expires_at: model.expires_at,
        revoked_at: model.revoked_at,
    }
}

#[async_trait]
pub trait AuthRepository: Send + Sync {
    async fn create_user(
        &self,
        email: &str,
        password_hash: &str,
    ) -> Result<UserAccount, StorageError>;
    async fn find_user_by_email(&self, email: &str) -> Result<Option<(UserAccount, String)>, StorageError>;
    async fn find_user_with_hash(&self, id: &str) -> Result<Option<(UserAccount, String)>, StorageError>;
    async fn mark_email_verified(&self, user_id: &str) -> Result<(), StorageError>;
    async fn update_password_hash(&self, user_id: &str, password_hash: &str) -> Result<(), StorageError>;
    async fn delete_user(&self, user_id: &str) -> Result<bool, StorageError>;

    async fn create_session(
        &self,
        user_id: &str,
        token_hash: &str,
        kind: &str,
        user_agent: Option<String>,
        ip_hint: Option<String>,
        expires_at: &str,
    ) -> Result<AuthSessionPublic, StorageError>;
    async fn find_session_by_token_hash(
        &self,
        token_hash: &str,
    ) -> Result<Option<AuthSessionPublic>, StorageError>;
    async fn revoke_session(&self, session_id: &str) -> Result<bool, StorageError>;
    async fn revoke_all_sessions(&self, user_id: &str) -> Result<u64, StorageError>;
    async fn list_sessions(&self, user_id: &str) -> Result<Vec<AuthSessionPublic>, StorageError>;

    async fn create_email_token(
        &self,
        user_id: &str,
        kind: &str,
        token_hash: &str,
        expires_at: &str,
    ) -> Result<(), StorageError>;
    async fn consume_email_token(
        &self,
        kind: &str,
        token_hash: &str,
        now: &str,
    ) -> Result<Option<String>, StorageError>;

    async fn assign_local_rows_to_user(&self, user_id: &str) -> Result<u64, StorageError>;
}

#[async_trait]
impl AuthRepository for Store {
    async fn create_user(
        &self,
        email: &str,
        password_hash: &str,
    ) -> Result<UserAccount, StorageError> {
        let stamp = self.now();
        let active = user::ActiveModel {
            id: Set(study_core::new_id()),
            email: Set(email.trim().to_lowercase()),
            password_hash: Set(password_hash.to_owned()),
            email_verified: Set(false),
            created_at: Set(stamp.clone()),
            updated_at: Set(stamp),
            deleted_at: Set(None),
            ..Default::default()
        };
        let model = active.insert(&self.db).await.map_err(map_query)?;
        Ok(user_from(model))
    }

    async fn find_user_by_email(
        &self,
        email: &str,
    ) -> Result<Option<(UserAccount, String)>, StorageError> {
        let row = user::Entity::find()
            .filter(user::Column::Email.eq(email.trim().to_lowercase()))
            .filter(user::Column::DeletedAt.is_null())
            .one(&self.db)
            .await
            .map_err(map_query)?;
        Ok(row.map(|m| (user_from(m.clone()), m.password_hash)))
    }

    async fn find_user_with_hash(
        &self,
        id: &str,
    ) -> Result<Option<(UserAccount, String)>, StorageError> {
        let row = user::Entity::find_by_id(id)
            .filter(user::Column::DeletedAt.is_null())
            .one(&self.db)
            .await
            .map_err(map_query)?;
        Ok(row.map(|m| (user_from(m.clone()), m.password_hash)))
    }

    async fn mark_email_verified(&self, user_id: &str) -> Result<(), StorageError> {
        let Some(existing) = user::Entity::find_by_id(user_id)
            .one(&self.db)
            .await
            .map_err(map_query)?
        else {
            return Err(StorageError::Invalid("user not found"));
        };
        let mut active: user::ActiveModel = existing.into();
        active.email_verified = Set(true);
        active.updated_at = Set(self.now());
        active.update(&self.db).await.map_err(map_query)?;
        Ok(())
    }

    async fn update_password_hash(&self, user_id: &str, password_hash: &str) -> Result<(), StorageError> {
        let Some(existing) = user::Entity::find_by_id(user_id)
            .one(&self.db)
            .await
            .map_err(map_query)?
        else {
            return Err(StorageError::Invalid("user not found"));
        };
        let mut active: user::ActiveModel = existing.into();
        active.password_hash = Set(password_hash.to_owned());
        active.updated_at = Set(self.now());
        active.update(&self.db).await.map_err(map_query)?;
        Ok(())
    }

    async fn delete_user(&self, user_id: &str) -> Result<bool, StorageError> {
        let Some(existing) = user::Entity::find_by_id(user_id)
            .one(&self.db)
            .await
            .map_err(map_query)?
        else {
            return Ok(false);
        };
        let mut active: user::ActiveModel = existing.into();
        active.deleted_at = Set(Some(self.now()));
        active.updated_at = Set(self.now());
        active.update(&self.db).await.map_err(map_query)?;
        Ok(true)
    }

    async fn create_session(
        &self,
        user_id: &str,
        token_hash: &str,
        kind: &str,
        user_agent: Option<String>,
        ip_hint: Option<String>,
        expires_at: &str,
    ) -> Result<AuthSessionPublic, StorageError> {
        let stamp = self.now();
        let active = auth_session::ActiveModel {
            id: Set(study_core::new_id()),
            user_id: Set(user_id.to_owned()),
            token_hash: Set(token_hash.to_owned()),
            kind: Set(kind.to_owned()),
            user_agent: Set(user_agent),
            ip_hint: Set(ip_hint),
            created_at: Set(stamp),
            expires_at: Set(expires_at.to_owned()),
            revoked_at: Set(None),
            ..Default::default()
        };
        let model = active.insert(&self.db).await.map_err(map_query)?;
        Ok(session_from(model))
    }

    async fn find_session_by_token_hash(
        &self,
        token_hash: &str,
    ) -> Result<Option<AuthSessionPublic>, StorageError> {
        let row = auth_session::Entity::find()
            .filter(auth_session::Column::TokenHash.eq(token_hash))
            .filter(auth_session::Column::RevokedAt.is_null())
            .one(&self.db)
            .await
            .map_err(map_query)?;
        Ok(row.map(session_from))
    }

    async fn revoke_session(&self, session_id: &str) -> Result<bool, StorageError> {
        let Some(existing) = auth_session::Entity::find_by_id(session_id)
            .one(&self.db)
            .await
            .map_err(map_query)?
        else {
            return Ok(false);
        };
        let mut active: auth_session::ActiveModel = existing.into();
        active.revoked_at = Set(Some(self.now()));
        active.update(&self.db).await.map_err(map_query)?;
        Ok(true)
    }

    async fn revoke_all_sessions(&self, user_id: &str) -> Result<u64, StorageError> {
        let rows = auth_session::Entity::find()
            .filter(auth_session::Column::UserId.eq(user_id))
            .filter(auth_session::Column::RevokedAt.is_null())
            .all(&self.db)
            .await
            .map_err(map_query)?;
        let mut count = 0u64;
        let stamp = self.now();
        for row in rows {
            let mut active: auth_session::ActiveModel = row.into();
            active.revoked_at = Set(Some(stamp.clone()));
            active.update(&self.db).await.map_err(map_query)?;
            count += 1;
        }
        Ok(count)
    }

    async fn list_sessions(&self, user_id: &str) -> Result<Vec<AuthSessionPublic>, StorageError> {
        let rows = auth_session::Entity::find()
            .filter(auth_session::Column::UserId.eq(user_id))
            .order_by_desc(auth_session::Column::CreatedAt)
            .all(&self.db)
            .await
            .map_err(map_query)?;
        Ok(rows.into_iter().map(session_from).collect())
    }

    async fn create_email_token(
        &self,
        user_id: &str,
        kind: &str,
        token_hash: &str,
        expires_at: &str,
    ) -> Result<(), StorageError> {
        let active = email_token::ActiveModel {
            id: Set(study_core::new_id()),
            user_id: Set(user_id.to_owned()),
            kind: Set(kind.to_owned()),
            token_hash: Set(token_hash.to_owned()),
            expires_at: Set(expires_at.to_owned()),
            used_at: Set(None),
            created_at: Set(self.now()),
            ..Default::default()
        };
        active.insert(&self.db).await.map_err(map_query)?;
        Ok(())
    }

    async fn consume_email_token(
        &self,
        kind: &str,
        token_hash: &str,
        now: &str,
    ) -> Result<Option<String>, StorageError> {
        let row = email_token::Entity::find()
            .filter(email_token::Column::Kind.eq(kind))
            .filter(email_token::Column::TokenHash.eq(token_hash))
            .filter(email_token::Column::UsedAt.is_null())
            .one(&self.db)
            .await
            .map_err(map_query)?;
        let Some(row) = row else {
            return Ok(None);
        };
        if row.expires_at < now.to_owned() {
            return Ok(None);
        }
        let mut active: email_token::ActiveModel = row.clone().into();
        active.used_at = Set(Some(now.to_owned()));
        active.update(&self.db).await.map_err(map_query)?;
        Ok(Some(row.user_id))
    }

    async fn assign_local_rows_to_user(&self, user_id: &str) -> Result<u64, StorageError> {
        let tables = [
            "subjects", "goals", "sources", "chunks", "settings", "topics", "chunk_embeddings",
            "ai_providers", "questions", "study_sessions", "session_questions", "attempts",
            "usage_events", "web_search_providers", "tests", "test_questions", "integrity_events",
            "review_logs", "points_ledger", "daily_activity", "local_profile",
        ];
        let mut total = 0u64;
        let backend = self.db.get_database_backend();
        for table in tables {
            let sql = format!(
                "UPDATE {table} SET user_id = ?1 WHERE user_id IS NULL"
            );
            let result = self
                .db
                .execute(sea_orm::Statement::from_sql_and_values(
                    backend,
                    &sql,
                    [user_id.into()],
                ))
                .await
                .map_err(map_query)?;
            total += result.rows_affected();
        }
        Ok(total)
    }
}