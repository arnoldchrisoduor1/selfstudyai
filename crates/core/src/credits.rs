use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum CreditKind {
    Topup,
    Usage,
    Refund,
    Adjustment,
}

impl CreditKind {
    pub fn as_str(self) -> &'static str {
        match self {
            Self::Topup => "topup",
            Self::Usage => "usage",
            Self::Refund => "refund",
            Self::Adjustment => "adjustment",
        }
    }

    pub fn parse(value: &str) -> Result<Self, &'static str> {
        match value {
            "topup" => Ok(Self::Topup),
            "usage" => Ok(Self::Usage),
            "refund" => Ok(Self::Refund),
            "adjustment" => Ok(Self::Adjustment),
            _ => Err("invalid credit kind"),
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct CreditsLedgerEntry {
    pub id: String,
    pub user_id: String,
    pub amount: i64,
    pub kind: String,
    pub reference: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct CreditsBalance {
    pub balance: i64,
    pub reserved: i64,
    pub available: i64,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct CreditPricingEstimate {
    pub model: String,
    pub feature: String,
    pub input_tokens: u32,
    pub output_tokens: u32,
    pub estimated_credits: i64,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct TopUpRequest {
    pub amount_credits: i64,
    pub idempotency_key: String,
}