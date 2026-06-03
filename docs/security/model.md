# Security Model

The initial security model is conservative:

- No live broker execution.
- No Robinhood MCP integration.
- No Public integration.
- No plaintext secret storage.
- No trade recommendations.
- Mock mode is the default.

Future broker phases should start read-only, require explicit opt-in, and keep confirmation and audit logic separate from adapter implementation.
