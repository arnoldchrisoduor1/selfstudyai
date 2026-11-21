#[derive(Debug, Clone)]
pub struct TopUpResult {
    pub reference: String,
    pub credits: i64,
}

#[derive(Debug, Default, Clone)]
pub struct MockPaymentProvider;

impl MockPaymentProvider {
    pub async fn start_topup(
        &self,
        user_id: &str,
        amount_credits: i64,
        idempotency_key: &str,
    ) -> Result<TopUpResult, String> {
        Ok(TopUpResult {
            reference: format!("mock:{user_id}:{idempotency_key}"),
            credits: amount_credits,
        })
    }
}