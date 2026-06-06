# Optional ElevenLabs CLI TTS

StreetSpeak AI supports ElevenLabs only as an optional local CLI speak-back provider. It is BYO key, disabled unless selected, and not required for mock mode.

## Setup

Use local environment variables. Do not commit `.env` files.

```sh
export ELEVENLABS_API_KEY="your-local-key"
export ELEVENLABS_VOICE_ID="your-local-voice-id"
export ELEVENLABS_MODEL_ID="eleven_multilingual_v2" # optional default
```

Run an explicit one-off speak command:

```sh
pnpm streetspeak:dev speak "StreetSpeak AI is ready." --provider elevenlabs
```

Run an interactive session with ElevenLabs selected:

```sh
pnpm streetspeak:dev session --speak --tts elevenlabs
STREETSPEAK_TTS_PROVIDER=elevenlabs pnpm streetspeak:dev session --speak
```

If `ELEVENLABS_API_KEY` or `ELEVENLABS_VOICE_ID` is missing, StreetSpeak prints the missing variable name and falls back safely to local macOS `say` or stdout. It never prints the API key value.

## What Text Is Sent

One-off `speak "text" --provider elevenlabs` sends the provided text after basic redaction and length limiting.

Session speak-back sends short safe summaries by default. For example:

- Status: live trading, order review, order placement, and cancel order remain unavailable.
- Mock ticket: exact mock confirmation is required before mock submission.
- Handoff: handoff prompt is ready.
- Smoke: read-only smoke status is ready and raw MCP output was not spoken.

Do not send broker credentials, API keys, account identifiers, portfolio values, raw MCP output, tokens, full Robinhood Agent handoff prompts, real account data, generated audio, or secrets to ElevenLabs.

## Local Playback And Cleanup

The CLI calls ElevenLabs with `fetch`, writes returned audio to a temporary file only when needed for local playback, plays it locally on macOS with `afplay`, and deletes the temp file after playback. If playback is unavailable or the request fails, the CLI falls back safely to local `say` or stdout.

Generated audio must not be committed.

## Safety Boundary

This feature does not add live trading, order review, order placement, cancel order, broker login UI, broker secrets, analytics, speech-to-text, raw audio storage by default, deployment, or investment advice.

Tests must mock fetch/network and must not use a real ElevenLabs API key.
