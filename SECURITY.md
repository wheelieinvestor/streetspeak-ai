# Security

Report security issues privately before public disclosure. This repository is early-stage, so please include clear reproduction steps and affected files or commands.

Security principles:

- Mock mode is the default.
- Live trading is unavailable in this scaffold.
- There is no live trading path, real broker API path, broker login path, or broker order placement path.
- Live trading must remain disabled by default in future phases.
- Secrets, API keys, broker credentials, account identifiers, and session tokens must not be stored in plaintext.
- Confirmation gates must not be bypassed.
- Generic confirmations must never authorize trades.
- First-run onboarding acknowledgement, local demo settings, and redacted audit events may be stored only in browser local storage.
- Receipt and audit exports must remain local-only and must not create public URLs or upload data.
- Browser-native voice input must not add external speech API keys, raw-audio storage, or StreetSpeak raw-audio uploads.
- ElevenLabs, Robinhood MCP, Public, and live broker execution are not implemented in this scaffold.

Future broker integration requirements:

- Start with read-only broker data before any order review work.
- Keep order review separate from live execution.
- Require separate explicit approval before any live execution implementation.
- Never log raw broker account IDs or store broker secrets in plaintext.
- Require the exact challenge phrase and unique code before any order placement.
- Never allow generic confirmations like `yes`, `do it`, `confirmed`, `send it`, `execute`, `looks good`, or `okay`.

See [docs/security/model.md](docs/security/model.md) for the initial security model.
