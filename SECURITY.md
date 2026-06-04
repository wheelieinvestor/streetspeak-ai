# Security

Report security issues privately before public disclosure. This repository is early-stage, so please include clear reproduction steps and affected files or commands.

Security principles:

- Mock mode is the default.
- Live trading is unavailable in this scaffold.
- There is no live trading path, broker login path, or broker order placement path. The Robinhood MCP boundary is read-only and externally managed.
- Live trading must remain disabled by default in future phases.
- Secrets, API keys, broker credentials, account identifiers, and session tokens must not be stored in plaintext.
- Confirmation gates must not be bypassed.
- Generic confirmations must never authorize trades.
- First-run onboarding acknowledgement, local demo settings, and redacted audit events may be stored only in browser local storage.
- Receipt and audit exports must remain local-only and must not create public URLs or upload data.
- Browser-native voice input must not add external speech API keys, raw-audio storage, or StreetSpeak raw-audio uploads.
- The Robinhood fixture explorer is fixture-only and has no MCP transport, broker login, credentials, real account data, real market data, order review, order placement, or cancel-order methods.
- The Robinhood MCP adapter boundary supports only externally managed read-only calls. It stores no MCP URL, tokens, credentials, raw account identifiers, portfolio values, holdings, order IDs, or raw MCP output.
- ElevenLabs, Public, order review, order placement, cancel order, and live broker execution are not implemented in this scaffold.

Future broker integration requirements:

- Start with the separately approved read-only connection before any order review work.
- Keep order review separate from live execution.
- Require separate explicit approval before any live execution implementation.
- Never log raw broker account IDs or store broker secrets in plaintext.
- Require the exact challenge phrase and unique code before any order placement.
- Never allow generic confirmations like `yes`, `do it`, `confirmed`, `send it`, `execute`, `looks good`, or `okay`.

See [docs/security/model.md](docs/security/model.md) for the initial security model.
