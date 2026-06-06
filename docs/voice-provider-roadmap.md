# Voice Provider Roadmap

StreetSpeak AI keeps voice provider work local-first, optional, and separate from trading capability.

## Current Providers

- `stdout_fallback`: prints one-off `speak` text and reports speak-back status.
- `macos_say`: uses the local macOS `say` command, with optional `--voice Samantha` or `STREETSPEAK_MACOS_VOICE=Samantha`.
- `elevenlabs`: optional BYO-key CLI speak-back provider selected by `--provider elevenlabs`, `--tts elevenlabs`, or `STREETSPEAK_TTS_PROVIDER=elevenlabs`.

ElevenLabs is CLI-only today. The web app still uses browser-native speech recognition for optional transcript input and does not use ElevenLabs.

## Provider Rules

- Keep mock mode working without any voice provider key.
- Never store API keys, broker credentials, account data, tokens, raw MCP output, generated audio, or secrets in plaintext.
- Never commit `.env` files or generated audio.
- Use short safe summaries for session speak-back.
- Never speak full Robinhood Agent handoff prompts, broker-like data, raw MCP output, or account/portfolio values.
- Keep tests on mocked fetch/network only.
- Keep provider failures non-blocking with local `say` or stdout fallback.

## Open-Source Voice Caution

Future open-source voice models or playback tools need license review before inclusion. Check model license, commercial restrictions, attribution, redistribution terms, privacy posture, and whether sample voices or generated audio can be committed. Do not add large frameworks, model weights, or sample audio unless a separate task explicitly approves them.

## Trading Boundary

Voice providers must not add live trading, order review, order placement, cancel order, autonomous trading, broker login UI, analytics, deployment, or investment advice. Future broker work still requires separate read-only, review, and execution gates with exact confirmation requirements.
