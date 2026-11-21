# Payments (out of scope for Phase 5)

Phase 5 wires `MockPaymentProvider` and an admin credit-adjust endpoint. Real money collection is **not** integrated.

## Before Stripe or M-Pesa

- Merchant account and KYC per region.
- Webhook URL on public HTTPS with signature verification (`PaymentProvider::verify_webhook`).
- Idempotency store keyed by provider event id (same table pattern as `credits_ledger` references).
- PCI: never pass card numbers through this API; use provider-hosted checkout.
- Refund and dispute flows mapped to `CreditKind::Refund` ledger entries.

## Env (future)

| Variable | Purpose |
| --- | --- |
| `STRIPE_SECRET_KEY` | Server-side Stripe API |
| `STRIPE_WEBHOOK_SECRET` | Signature verification |
| `MPESA_*` | Daraja credentials when added |

See `crates/api/src/payment.rs` for the trait boundary.