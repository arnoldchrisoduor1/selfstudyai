use std::sync::Arc;

use tokio::sync::Mutex;

#[derive(Debug, Clone)]
pub struct ConsoleSender {
    bodies: Arc<Mutex<Vec<String>>>,
}

impl Default for ConsoleSender {
    fn default() -> Self {
        Self::new()
    }
}

impl ConsoleSender {
    pub fn new() -> Self {
        Self {
            bodies: Arc::new(Mutex::new(Vec::new())),
        }
    }

    pub async fn send(&self, to: &str, subject: &str, body: &str) -> Result<(), String> {
        tracing::info!(to, subject, body, "email sent (console)");
        self.bodies.lock().await.push(body.to_owned());
        Ok(())
    }

    pub async fn take_last_body(&self) -> Option<String> {
        self.bodies.lock().await.pop()
    }
}