# Privacy

StreetSpeak AI is intended to be local-first. The scaffold does not collect telemetry, store broker credentials, place trades, or transmit voice data to a StreetSpeak server.

Integrations should minimize data collection, prefer local processing where practical, redact sensitive account details in logs, and avoid storing credentials or secrets in plaintext.

Users should treat transcripts, account data, order tickets, and audit events as sensitive financial information.

## Local Demo Data

The web demo stores only these values in browser local storage on the user's device:

- First-run safety onboarding acknowledgement.
- Local demo settings for browser voice input and audit timeline visibility.
- Redacted audit events for mock command, routing, parsed intent, ticket, safety review, confirmation challenge, confirmation result, and mock broker response flows.

The web demo does not store API keys, broker credentials, broker account identifiers, raw audio, real broker account data, real market data snapshots, live orders, or trade recommendations.

The real Robinhood MCP read-only panel, when an external runtime client is configured, keeps returned account, portfolio, position, quote, order-history, tradability, and search data in memory only by default. Its audit events record action names and timestamps, not raw account identifiers, portfolio values, detailed holdings, order IDs, or raw MCP output.

Optional browser voice input uses browser-native speech recognition when the browser supports it. StreetSpeak AI receives the resulting text transcript, sends that text through the same local mock parser as typed commands, and does not store raw audio or send raw audio to a StreetSpeak server.

Receipt and audit exports are generated locally from the current browser state. They can be copied as Markdown or downloaded as JSON. StreetSpeak AI does not upload exports, generate public receipt URLs, or send receipt data to a StreetSpeak server.

Users can clear local demo data inside the app:

- `Reset demo state` clears transient command fields.
- `Reset onboarding` removes the first-run acknowledgement.
- `Clear audit timeline` removes persisted redacted audit events.
- `Reset all local demo data` removes onboarding, settings, transient demo state, and persisted audit events.

Browser site-data controls can also clear the local storage for the local demo origin.
