use async_trait::async_trait;
use sea_orm::{ActiveModelTrait, ColumnTrait, EntityTrait, QueryFilter, QueryOrder, Set};
use study_core::{LocalProfile, NewLocalProfile, NewSetting, NewSubject, Setting, Subject};

use crate::entities::{local_profile, setting, subject};
use crate::error::{map_query, StorageError};
use crate::sync_meta::{bump_version, new_row_sync_fields};
use crate::tenant::{not_deleted, user_id_condition};
use crate::Store;

fn profile_from(model: local_profile::Model) -> LocalProfile {
    LocalProfile {
        id: model.id,
        display_name: model.display_name,
        created_at: model.created_at,
        updated_at: model.updated_at,
    }
}

fn subject_from(model: subject::Model) -> Subject {
    Subject {
        id: model.id,
        name: model.name,
        description: model.description,
        created_at: model.created_at,
        updated_at: model.updated_at,
    }
}

fn setting_from(model: setting::Model) -> Setting {
    Setting {
        id: model.id,
        key: model.setting_key,
        value: model.value,
        created_at: model.created_at,
        updated_at: model.updated_at,
    }
}

#[async_trait]
pub trait LocalProfileRepository: Send + Sync {
    async fn list_profiles(&self) -> Result<Vec<LocalProfile>, StorageError>;
    async fn get_profile(&self, id: &str) -> Result<Option<LocalProfile>, StorageError>;
    async fn create_profile(&self, input: NewLocalProfile) -> Result<LocalProfile, StorageError>;
    async fn update_profile(
        &self,
        id: &str,
        input: NewLocalProfile,
    ) -> Result<Option<LocalProfile>, StorageError>;
    async fn delete_profile(&self, id: &str) -> Result<bool, StorageError>;
}

#[async_trait]
pub trait SubjectRepository: Send + Sync {
    async fn list_subjects(&self) -> Result<Vec<Subject>, StorageError>;
    async fn get_subject(&self, id: &str) -> Result<Option<Subject>, StorageError>;
    async fn create_subject(&self, input: NewSubject) -> Result<Subject, StorageError>;
    async fn update_subject(
        &self,
        id: &str,
        input: NewSubject,
    ) -> Result<Option<Subject>, StorageError>;
    async fn delete_subject(&self, id: &str) -> Result<bool, StorageError>;
}

#[async_trait]
pub trait SettingRepository: Send + Sync {
    async fn list_settings(&self) -> Result<Vec<Setting>, StorageError>;
    async fn get_setting(&self, id: &str) -> Result<Option<Setting>, StorageError>;
    async fn find_setting_by_key(&self, key: &str) -> Result<Option<Setting>, StorageError>;
    async fn create_setting(&self, input: NewSetting) -> Result<Setting, StorageError>;
    async fn update_setting(
        &self,
        id: &str,
        input: NewSetting,
    ) -> Result<Option<Setting>, StorageError>;
    async fn delete_setting(&self, id: &str) -> Result<bool, StorageError>;
}

#[async_trait]
impl LocalProfileRepository for Store {
    async fn list_profiles(&self) -> Result<Vec<LocalProfile>, StorageError> {
        let rows = local_profile::Entity::find()
            .filter(user_id_condition(local_profile::Column::UserId))
            .filter(not_deleted(local_profile::Column::DeletedAt))
            .order_by_asc(local_profile::Column::DisplayName)
            .all(&self.db)
            .await
            .map_err(map_query)?;
        Ok(rows.into_iter().map(profile_from).collect())
    }

    async fn get_profile(&self, id: &str) -> Result<Option<LocalProfile>, StorageError> {
        let row = local_profile::Entity::find_by_id(id)
            .filter(user_id_condition(local_profile::Column::UserId))
            .filter(not_deleted(local_profile::Column::DeletedAt))
            .one(&self.db)
            .await
            .map_err(map_query)?;
        Ok(row.map(profile_from))
    }

    async fn create_profile(&self, input: NewLocalProfile) -> Result<LocalProfile, StorageError> {
        let input = input.normalized().map_err(StorageError::Invalid)?;
        let stamp = self.now();
        let (user_id, version, deleted_at) = new_row_sync_fields();
        let active = local_profile::ActiveModel {
            id: Set(study_core::new_id()),
            display_name: Set(input.display_name),
            user_id,
            version,
            deleted_at,
            created_at: Set(stamp.clone()),
            updated_at: Set(stamp),
            ..Default::default()
        };
        let model = active.insert(&self.db).await.map_err(map_query)?;
        Ok(profile_from(model))
    }

    async fn update_profile(
        &self,
        id: &str,
        input: NewLocalProfile,
    ) -> Result<Option<LocalProfile>, StorageError> {
        let input = input.normalized().map_err(StorageError::Invalid)?;
        let Some(existing) = local_profile::Entity::find_by_id(id)
            .filter(user_id_condition(local_profile::Column::UserId))
            .filter(not_deleted(local_profile::Column::DeletedAt))
            .one(&self.db)
            .await
            .map_err(map_query)?
        else {
            return Ok(None);
        };
        let ver = existing.version;
        let mut active: local_profile::ActiveModel = existing.into();
        active.display_name = Set(input.display_name);
        active.updated_at = Set(self.now());
        active.version = bump_version(ver);
        let model = active.update(&self.db).await.map_err(map_query)?;
        Ok(Some(profile_from(model)))
    }

    async fn delete_profile(&self, id: &str) -> Result<bool, StorageError> {
        let Some(existing) = local_profile::Entity::find_by_id(id)
            .filter(user_id_condition(local_profile::Column::UserId))
            .filter(not_deleted(local_profile::Column::DeletedAt))
            .one(&self.db)
            .await
            .map_err(map_query)?
        else {
            return Ok(false);
        };
        let ver = existing.version;
        let mut active: local_profile::ActiveModel = existing.into();
        let stamp = self.now();
        active.deleted_at = Set(Some(stamp.clone()));
        active.updated_at = Set(stamp);
        active.version = bump_version(ver);
        active.update(&self.db).await.map_err(map_query)?;
        Ok(true)
    }
}

#[async_trait]
impl SubjectRepository for Store {
    async fn list_subjects(&self) -> Result<Vec<Subject>, StorageError> {
        let rows = subject::Entity::find()
            .filter(user_id_condition(subject::Column::UserId))
            .filter(not_deleted(subject::Column::DeletedAt))
            .order_by_asc(subject::Column::Name)
            .all(&self.db)
            .await
            .map_err(map_query)?;
        Ok(rows.into_iter().map(subject_from).collect())
    }

    async fn get_subject(&self, id: &str) -> Result<Option<Subject>, StorageError> {
        let row = subject::Entity::find_by_id(id)
            .filter(user_id_condition(subject::Column::UserId))
            .filter(not_deleted(subject::Column::DeletedAt))
            .one(&self.db)
            .await
            .map_err(map_query)?;
        Ok(row.map(subject_from))
    }

    async fn create_subject(&self, input: NewSubject) -> Result<Subject, StorageError> {
        let input = input.normalized().map_err(StorageError::Invalid)?;
        let stamp = self.now();
        let (user_id, version, deleted_at) = new_row_sync_fields();
        let active = subject::ActiveModel {
            id: Set(study_core::new_id()),
            name: Set(input.name),
            description: Set(input.description),
            user_id,
            version,
            deleted_at,
            created_at: Set(stamp.clone()),
            updated_at: Set(stamp),
            ..Default::default()
        };
        let model = active.insert(&self.db).await.map_err(map_query)?;
        Ok(subject_from(model))
    }

    async fn update_subject(
        &self,
        id: &str,
        input: NewSubject,
    ) -> Result<Option<Subject>, StorageError> {
        let input = input.normalized().map_err(StorageError::Invalid)?;
        let Some(existing) = subject::Entity::find_by_id(id)
            .filter(user_id_condition(subject::Column::UserId))
            .filter(not_deleted(subject::Column::DeletedAt))
            .one(&self.db)
            .await
            .map_err(map_query)?
        else {
            return Ok(None);
        };
        let ver = existing.version;
        let mut active: subject::ActiveModel = existing.into();
        active.name = Set(input.name);
        active.description = Set(input.description);
        active.updated_at = Set(self.now());
        active.version = bump_version(ver);
        let model = active.update(&self.db).await.map_err(map_query)?;
        Ok(Some(subject_from(model)))
    }

    async fn delete_subject(&self, id: &str) -> Result<bool, StorageError> {
        let Some(existing) = subject::Entity::find_by_id(id)
            .filter(user_id_condition(subject::Column::UserId))
            .filter(not_deleted(subject::Column::DeletedAt))
            .one(&self.db)
            .await
            .map_err(map_query)?
        else {
            return Ok(false);
        };
        let ver = existing.version;
        let mut active: subject::ActiveModel = existing.into();
        let stamp = self.now();
        active.deleted_at = Set(Some(stamp.clone()));
        active.updated_at = Set(stamp);
        active.version = bump_version(ver);
        active.update(&self.db).await.map_err(map_query)?;
        Ok(true)
    }
}

#[async_trait]
impl SettingRepository for Store {
    async fn list_settings(&self) -> Result<Vec<Setting>, StorageError> {
        let rows = setting::Entity::find()
            .filter(user_id_condition(setting::Column::UserId))
            .filter(not_deleted(setting::Column::DeletedAt))
            .order_by_asc(setting::Column::SettingKey)
            .all(&self.db)
            .await
            .map_err(map_query)?;
        Ok(rows.into_iter().map(setting_from).collect())
    }

    async fn get_setting(&self, id: &str) -> Result<Option<Setting>, StorageError> {
        let row = setting::Entity::find_by_id(id)
            .filter(user_id_condition(setting::Column::UserId))
            .filter(not_deleted(setting::Column::DeletedAt))
            .one(&self.db)
            .await
            .map_err(map_query)?;
        Ok(row.map(setting_from))
    }

    async fn find_setting_by_key(&self, key: &str) -> Result<Option<Setting>, StorageError> {
        let row = setting::Entity::find()
            .filter(setting::Column::SettingKey.eq(key))
            .filter(user_id_condition(setting::Column::UserId))
            .filter(not_deleted(setting::Column::DeletedAt))
            .one(&self.db)
            .await
            .map_err(map_query)?;
        Ok(row.map(setting_from))
    }

    async fn create_setting(&self, input: NewSetting) -> Result<Setting, StorageError> {
        let input = input.normalized().map_err(StorageError::Invalid)?;
        let stamp = self.now();
        let (user_id, version, deleted_at) = new_row_sync_fields();
        let active = setting::ActiveModel {
            id: Set(study_core::new_id()),
            setting_key: Set(input.key),
            value: Set(input.value),
            user_id,
            version,
            deleted_at,
            created_at: Set(stamp.clone()),
            updated_at: Set(stamp),
            ..Default::default()
        };
        let model = active.insert(&self.db).await.map_err(map_query)?;
        Ok(setting_from(model))
    }

    async fn update_setting(
        &self,
        id: &str,
        input: NewSetting,
    ) -> Result<Option<Setting>, StorageError> {
        let input = input.normalized().map_err(StorageError::Invalid)?;
        let Some(existing) = setting::Entity::find_by_id(id)
            .filter(user_id_condition(setting::Column::UserId))
            .filter(not_deleted(setting::Column::DeletedAt))
            .one(&self.db)
            .await
            .map_err(map_query)?
        else {
            return Ok(None);
        };
        let ver = existing.version;
        let mut active: setting::ActiveModel = existing.into();
        active.setting_key = Set(input.key);
        active.value = Set(input.value);
        active.updated_at = Set(self.now());
        active.version = bump_version(ver);
        let model = active.update(&self.db).await.map_err(map_query)?;
        Ok(Some(setting_from(model)))
    }

    async fn delete_setting(&self, id: &str) -> Result<bool, StorageError> {
        let Some(existing) = setting::Entity::find_by_id(id)
            .filter(user_id_condition(setting::Column::UserId))
            .filter(not_deleted(setting::Column::DeletedAt))
            .one(&self.db)
            .await
            .map_err(map_query)?
        else {
            return Ok(false);
        };
        let ver = existing.version;
        let mut active: setting::ActiveModel = existing.into();
        let stamp = self.now();
        active.deleted_at = Set(Some(stamp.clone()));
        active.updated_at = Set(stamp);
        active.version = bump_version(ver);
        active.update(&self.db).await.map_err(map_query)?;
        Ok(true)
    }
}
