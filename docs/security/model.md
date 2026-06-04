# Security Model

The initial security model is conservative:

- No live broker execution.
- No Robinhood MCP integration.
- No Public integration.
- No plaintext secret storage.
- No trade recommendations.
- Mock mode is the default.
- First-run onboarding is required before the local demo flow opens.
- Onboarding acknowledgement, demo settings, and redacted audit events are stored only in browser local storage.
- Audit and receipt exports are generated locally and are not uploaded or turned into public URLs.
- Browser-native voice input is optional and feature-detected.
- Browser voice transcripts flow into the same mock parser as typed commands.
- Raw audio is not stored and is not uploaded to a StreetSpeak server.
- ElevenLabs and external speech API keys are not implemented.
- Confirmation challenges require a specific phrase and reject generic responses.
- Audit event payloads redact common secret-like fields before storage.
- The mock broker adapter exposes mock review and mock submission only.
- The Robinhood read-only scaffold is disabled by default, fixture-only, and exposes no order review, placement, staging, submission, or cancel methods.

Future broker phases should start with a separately approved read-only connection, require explicit opt-in, and keep confirmation and audit logic separate from adapter implementation. No future broker work should store broker secrets in plaintext, log raw account IDs, skip order review before live execution, or allow generic confirmation phrases.
