use argon2::{
    password_hash::{rand_core::OsRng, PasswordHash, PasswordHasher, PasswordVerifier, SaltString},
    Argon2,
};
use chrono::Utc;
use jsonwebtoken::{encode, EncodingKey, Header};
use sea_orm::{ActiveModelTrait, ColumnTrait, DatabaseConnection, EntityTrait, QueryFilter, Set};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::entities::user;
use crate::dto::auth::{AuthResponse, LoginRequest, RegisterRequest, UserResponse};

#[derive(Debug, Serialize, Deserialize)]
pub struct Claims {
    pub sub: String, // this is the user_id
    pub email: String,
    pub exp: usize, // this is expiration time
}

pub struct AuthService;

impl AuthService {
    // Hash password using Argon2
    pub fn hash_password(password: &str) -> Result<String, argon2::password_hash::Error> {
        let salt = SaltString::generate(&mut OsRng);
        let argon2 = Argon2::default();
        let password_hash = argon2
            .hash_password(password.as_bytes(), &salt)?
            .to_string();
        Ok(password_hash)
    }

    // Verify password
    pub fn verify_password(password: &str, hash: &str) -> Result<bool, argon2::password_hash::Error> {
        let parsed_hash = PasswordHash::new(hash)?;
        Ok(Argon2::default()
            .verify_password(password.as_bytes(), &parsed_hash)
            .is_ok())
    }

    // Generate JWT token
    pub fn generate_token(user_id: &Uuid, email: &str, secret: &str) -> Result<String, jsonwebtoken::errors::Error> {
        let expiration = Utc::now()
            .checked_add_signed(chrono::Duration::hours(24))
            .expect("valid timestamp")
            .timestamp() as usize;

        let claims = Claims {
            sub: user_id.to_string(),
            email: email.to_string(),
            exp: expiration,
        };

        encode(
            &Header::default(),
            &claims,
            &EncodingKey::from_secret(secret.as_bytes()),
        )
    }

    // Register new user
    pub async fn register(
        db: &DatabaseConnection,
        request: RegisterRequest,
        jwt_secret: &str,
    ) -> Result<AuthResponse, String> {
        // Check if user already exists
        let existing_user = user::Entity::find()
            .filter(user::Column::Email.eq(&request.email))
            .one(db)
            .await
            .map_err(|e| format!("Database error: {}", e))?;

        if existing_user.is_some() {
            return Err("User with this email already exists".to_string());
        }

        // Hash password
        let password_hash = Self::hash_password(&request.password)
            .map_err(|e| format!("Failed to hash password: {}", e))?;

        // Create new user
        let user_id = Uuid::new_v4();
        let now = Utc::now().naive_utc();

        let new_user = user::ActiveModel {
            id: Set(user_id),
            email: Set(request.email.clone()),
            password_hash: Set(password_hash),
            full_name: Set(Some(request.full_name.clone())),
            created_at: Set(now),
            updated_at: Set(now),
        };

        let user = new_user
            .insert(db)
            .await
            .map_err(|e| format!("Failed to create user: {}", e))?;

        // Generate token
        let token = Self::generate_token(&user.id, &user.email, jwt_secret)
            .map_err(|e| format!("Failed to generate token: {}", e))?;

        Ok(AuthResponse {
            token,
            user: UserResponse {
                id: user.id.to_string(),
                email: user.email,
                full_name: user.full_name,
            },
        })
    }

    // Login user
    pub async fn login(
        db: &DatabaseConnection,
        request: LoginRequest,
        jwt_secret: &str,
    ) -> Result<AuthResponse, String> {
        // Find user by email
        let user = user::Entity::find()
            .filter(user::Column::Email.eq(&request.email))
            .one(db)
            .await
            .map_err(|e| format!("Database error: {}", e))?
            .ok_or_else(|| "Invalid email or password".to_string())?;

        // Verify password
        let is_valid = Self::verify_password(&request.password, &user.password_hash)
            .map_err(|e| format!("Password verification error: {}", e))?;

        if !is_valid {
            return Err("Invalid email or password".to_string());
        }

        // Generate token
        let token = Self::generate_token(&user.id, &user.email, jwt_secret)
            .map_err(|e| format!("Failed to generate token: {}", e))?;

        Ok(AuthResponse {
            token,
            user: UserResponse {
                id: user.id.to_string(),
                email: user.email,
                full_name: user.full_name,
            },
        })
    }
}