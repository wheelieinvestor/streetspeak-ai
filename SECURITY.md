# Security

Report security issues privately before public disclosure. This repository is early-stage, so please include clear reproduction steps and affected files or commands.

Security principles:

- Mock mode is the default.
- Live trading is unavailable in this scaffold.
- Live trading must remain disabled by default in future phases.
- Secrets, API keys, broker credentials, and session tokens must not be stored in plaintext.
- Confirmation gates must not be bypassed.
- Generic confirmations must never authorize trades.

See [docs/security/model.md](docs/security/model.md) for the initial security model.
