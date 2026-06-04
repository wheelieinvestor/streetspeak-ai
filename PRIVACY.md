# Privacy

StreetSpeak AI is intended to be local-first. The initial scaffold does not collect telemetry, connect to brokers, or transmit voice data to a StreetSpeak server.

Future integrations should minimize data collection, prefer local processing where practical, redact sensitive account details in logs, and avoid storing credentials or secrets in plaintext.

Users should treat transcripts, account data, order tickets, and audit events as sensitive financial information.

## Local Demo Data

The web demo stores only these values in browser local storage:

- First-run safety onboarding acknowledgement.
- Local demo settings for browser voice input and audit timeline visibility.

The web demo does not store API keys, broker credentials, raw audio, real broker account data, real market data, live orders, or trade recommendations.

Optional browser voice input uses browser-native speech recognition when the browser supports it. StreetSpeak AI receives the resulting text transcript, sends that text through the same local mock parser as typed commands, and does not store or upload raw audio.
