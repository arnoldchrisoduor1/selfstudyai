#[derive(Debug, thiserror::Error)]
#[error("{message}")]
pub struct AiError {
    message: String,
}

impl AiError {
    pub fn config(message: impl Into<String>) -> Self {
        Self {
            message: message.into(),
        }
    }

    pub fn request(message: impl Into<String>) -> Self {
        Self {
            message: message.into(),
        }
    }

    pub fn redact_message(message: impl Into<String>, api_key: Option<&str>) -> String {
        let mut msg = message.into();
        if let Some(key) = api_key {
            if !key.is_empty() && msg.contains(key) {
                msg = msg.replace(key, &crate::mask::mask_api_key(key));
            }
        }
        msg
    }
}
