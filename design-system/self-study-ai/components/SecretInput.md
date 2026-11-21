# SecretInput

Password-style field for API keys. Never displays a saved raw key; shows a masked hint when one exists.

## Anatomy

- Label
- Input `type="password"` (toggle to text optional)
- Optional hint text for masked saved key

## Security

- Placeholder only for new keys
- Do not echo saved secrets into the value prop after load
