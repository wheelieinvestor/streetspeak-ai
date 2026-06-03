# Security Model

The initial security model is conservative:

- No live broker execution.
- No Robinhood MCP integration.
- No Public integration.
- No plaintext secret storage.
- No trade recommendations.
- Mock mode is the default.
- Confirmation challenges require a specific phrase and reject generic responses.
- Audit event payloads redact common secret-like fields before storage.
- Broker adapters expose mock review and mock submission only.

Future broker phases should start read-only, require explicit opt-in, and keep confirmation and audit logic separate from adapter implementation.
