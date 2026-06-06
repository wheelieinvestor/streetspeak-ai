# Tomorrow Safe Use

Use this flow when running StreetSpeak locally from a terminal.

## 1. Confirm Safety State

```sh
pnpm streetspeak:dev status
```

For built usage, run:

```sh
pnpm build
pnpm streetspeak status
```

Confirm the output says live trading, order review, order placement, and cancel order are unavailable. If it does not, stop.

## 2. Run Mock Commands

Quick local development path:

```sh
pnpm streetspeak:dev demo "show my portfolio"
pnpm streetspeak:dev demo "what is HOOD trading at"
pnpm streetspeak:dev demo "buy 5 HOOD"
```

Built path after `pnpm build`:

```sh
pnpm streetspeak demo "show my portfolio"
pnpm streetspeak demo "what is HOOD trading at"
pnpm streetspeak demo "buy 5 HOOD"
```

The portfolio and quote outputs are mock/static. The buy command creates a mock ticket only, prints a safety review, and prints an exact mock confirmation phrase/code. No live broker order is placed.

Unsupported commands should stay blocked:

```sh
pnpm streetspeak:dev demo "buy $500 of HOOD"
# or, after pnpm build:
pnpm streetspeak demo "buy $500 of HOOD"
```

That command should remain unsupported/needs-clarification and should not create a final ticket.

## 3. Optional Safe Speech Output

```sh
pnpm streetspeak:dev demo "show my portfolio" --speak
pnpm streetspeak:dev speak "StreetSpeak mock mode is active"
pnpm streetspeak:dev speak "StreetSpeak AI is ready." --voice Samantha
pnpm streetspeak:dev speak "StreetSpeak AI is ready." --provider elevenlabs
```

Built path after `pnpm build`:

```sh
pnpm streetspeak demo "show my portfolio" --speak
pnpm streetspeak speak "StreetSpeak mock mode is active"
```

On macOS this uses local `say`. Elsewhere it prints to stdout. `--voice Samantha` or `STREETSPEAK_MACOS_VOICE=Samantha` selects a local macOS voice. Optional ElevenLabs uses `ELEVENLABS_API_KEY`, `ELEVENLABS_VOICE_ID`, optional `ELEVENLABS_MODEL_ID`, and either `--provider elevenlabs`, `--tts elevenlabs`, or `STREETSPEAK_TTS_PROVIDER=elevenlabs`.

If ElevenLabs setup is missing, the CLI must print only the missing variable name and fall back to local `say` or stdout. Never print or commit the key. Never send broker credentials, account IDs, tokens, raw MCP output, portfolio values, real account data, full handoff prompts, or generated audio to TTS. Session speak-back should speak short safe summaries only.

## 4. Redacted Robinhood Read-Only Smoke

```sh
pnpm streetspeak:dev robinhood smoke
# or, after pnpm build:
pnpm streetspeak robinhood smoke
```

Default expected state is unavailable/unconfigured. If using an externally managed read-only MCP client, copy only redacted summary lines. Do not copy or commit raw account data, raw portfolio values, raw order IDs, raw quote prices, credentials, tokens, MCP URLs, auth config, or raw MCP output.

## 5. Manual Robinhood Agent Handoff

```sh
pnpm streetspeak:dev robinhood handoff "buy 5 HOOD"
# or, after pnpm build:
pnpm streetspeak robinhood handoff "buy 5 HOOD"
```

Paste the printed prompt into Dean's connected Robinhood Agent only if you intend to continue manually. StreetSpeak does not send anything to Robinhood. StreetSpeak does not place, review, or cancel orders.

Inside the Robinhood Agent flow, request the current quote, estimated cost, buying-power impact, and pre-trade warnings first. Any real trade approval happens separately inside that Robinhood Agent flow, not in StreetSpeak.

## Do Not Use StreetSpeak For

- Live trading.
- Order review, placement, or cancellation.
- Real order submission.
- Autonomous or scheduled trading.
- Broker login UI.
- Trade recommendations or investment advice.
- Options handoff.
- Notional/dollar final tickets.
- Storing or sharing secrets, tokens, credentials, account IDs, MCP URLs, auth config, real account data, or raw MCP output.
- Committing `.env` files, ElevenLabs keys, or generated audio.

Typed terminal input is the primary CLI path. Browser-native voice remains in the web app, and the CLI can accept pasted transcripts. Local Whisper or `whisper.cpp` can be considered later, but no speech-to-text dependency or model is added here.
