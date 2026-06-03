# AGENTS.md

Future coding agents working on StreetSpeak AI must follow these rules:

- Keep live execution disabled by default.
- Never add live trading unless the task explicitly asks for it.
- Never bypass confirmation gates.
- Never allow generic confirmations like "yes" or "do it" to place trades.
- Add tests for order ticket, confirmation, safety, and audit logic.
- Do not store API keys, broker credentials, or secrets in plaintext.
- Keep mock mode working at all times.
- Run build, test, lint, and typecheck before finishing.
- Clearly summarize all files changed and checks run.

StreetSpeak AI is a self-directed trading utility, not an investment adviser. Do not add trade recommendation behavior.
