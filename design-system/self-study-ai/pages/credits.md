# Credits

Route `/credits/`.

## Layout

- Balance StatCards: balance, reserved, available
- Low balance warning (danger text) when `available` is below threshold
- Mock top-up: amount input + Top up (calls `/credits/topup` with idempotency key)
- Ledger DataTable: amount, kind, reference, created_at

Nav sidebar link "Credits". Requires signed-in session for API data; show ErrorState with link hint to Settings account tab when unauthorized.