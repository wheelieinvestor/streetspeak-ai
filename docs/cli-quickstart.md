# StreetSpeak CLI Quickstart

The StreetSpeak CLI is a local mock trading desk utility. It does not place trades, review Robinhood orders, cancel orders, store credentials, or print raw MCP output.

## Install And Build

```sh
pnpm install
pnpm build
```

For quick local development, run the TypeScript source directly through the dev wrapper:

```sh
pnpm streetspeak:dev
pnpm streetspeak:dev session --speak
pnpm streetspeak:dev session --transcript-file ./transcript.txt
pnpm streetspeak:dev status
pnpm streetspeak:dev transcript "buy 5 HOOD"
pnpm streetspeak:dev demo "buy 5 HOOD"
pnpm streetspeak:dev robinhood handoff "buy 5 HOOD"
pnpm streetspeak:dev speak "StreetSpeak AI is ready."
pnpm streetspeak:dev speak "StreetSpeak AI is ready." --voice Samantha
pnpm streetspeak:dev speak "StreetSpeak AI is ready." --provider elevenlabs
pnpm streetspeak:dev session --speak --tts elevenlabs
```

The dev wrapper uses the minimal `tsx` dev dependency so Dean can run CLI commands without first generating `dist/` output.

For built usage, run the production path:

```sh
pnpm build
pnpm streetspeak
pnpm streetspeak session --speak
pnpm streetspeak session --transcript-file ./transcript.txt
pnpm streetspeak status
pnpm streetspeak transcript "buy 5 HOOD"
```

After `pnpm build`, the CLI package also exposes a `streetspeak` bin from `apps/cli`.

StreetSpeak CLI does not place real trades. Robinhood Agent handoff is manual only.

## Interactive Session

Launching the CLI with no command opens the interactive StreetSpeak terminal:

```sh
pnpm streetspeak:dev
# or, after pnpm build:
pnpm streetspeak
```

The startup screen shows the StreetSpeak AI banner, `Voice-native trading desk for AI agents`, mock desk status, Robinhood read-only unavailable/unconfigured status, live trading unavailable status, and the manual-handoff-only safety boundary.

Useful session commands:

```text
help
status
show my portfolio
what is HOOD trading at
buy 5 HOOD
buy $500 of HOOD
confirm <exact phrase>
yes
receipt
handoff
smoke
speak on
speak off
clear
exit
```

Session state is in memory only. The CLI remembers the latest transcript, parsed mock intent, mock ticket, safety review, exact confirmation challenge, mock confirmation result, mock broker response, receipt, and local speak-back setting only until the process exits. It does not persist session state, raw audio, broker credentials, real account data, raw MCP output, or live orders. Speak-back and other CLI preferences are per-session only; there is no persistent CLI config file.

`buy 5 HOOD` creates a mock ticket and exact confirmation challenge only. `yes` is rejected as a generic confirmation. To complete a mock submission, type:

```text
confirm CONFIRM MOCK BUY 5 HOOD MARKET CODE <code>
```

Use the exact phrase/code printed in your terminal. The result is a mock receipt only, and every receipt states `No live broker order was placed.`

After a mock submission, run:

```text
receipt
handoff
```

`receipt` prints a copy-friendly mock-only receipt. It does not include broker credentials, account IDs, raw MCP output, raw audio, or real account data. `handoff` prints a manual Robinhood Agent prompt for the latest mock equity ticket.

## Status

```sh
pnpm streetspeak:dev status
# or, after pnpm build:
pnpm streetspeak status
```

Expected safety state:

- Mock trading desk: available.
- Robinhood fixture explorer: available in the web app.
- Robinhood MCP read-only boundary: unavailable/unconfigured by default.
- Live trading: unavailable.
- Order review: unavailable.
- Order placement: unavailable.
- Cancel order: unavailable.
- Credentials stored by StreetSpeak: false.
- Raw MCP output printed: false.

## Mock Demo Commands

```sh
pnpm streetspeak:dev demo "show my portfolio"
pnpm streetspeak:dev demo "what is HOOD trading at"
pnpm streetspeak:dev demo "buy 5 HOOD"
pnpm streetspeak:dev demo "buy $500 of HOOD"
```

Built path after `pnpm build`:

```sh
pnpm streetspeak demo "show my portfolio"
pnpm streetspeak demo "what is HOOD trading at"
pnpm streetspeak demo "buy 5 HOOD"
pnpm streetspeak demo "buy $500 of HOOD"
```

`buy 5 HOOD` builds a mock ticket only. It prints a safety review and an exact mock confirmation phrase/code, but no live broker order is placed. Actual Robinhood trade approval happens outside StreetSpeak for now.

`buy $500 of HOOD` remains unsupported and creates no final ticket. StreetSpeak does not convert notional amounts into shares.

## Text To Speech

```sh
pnpm streetspeak:dev speak "mock ticket only"
pnpm streetspeak:dev demo "show my portfolio" --speak
```

Built path after `pnpm build`:

```sh
pnpm streetspeak speak "mock ticket only"
pnpm streetspeak demo "show my portfolio" --speak
```

On macOS, the CLI uses the local `say` command. On other platforms, it falls back to stdout. Optional ElevenLabs is available only when explicitly selected and configured with local BYO env vars. StreetSpeak does not store raw audio.

`session --speak` starts the interactive session with speak-back enabled. Inside a session, `speak on` and `speak off` toggle only the current process.

Session speak-back uses short safe summaries by default. It must not speak or send broker credentials, API keys, account identifiers, portfolio values, raw MCP output, tokens, full Robinhood Agent handoff prompts, real account data, or generated audio. The `handoff` command may speak only a summary such as `Handoff prompt is ready.`

## TTS Providers

The CLI-local TTS provider order is:

- Explicit flags such as `--provider elevenlabs`, `--tts elevenlabs`, `--provider macos`, or `--provider stdout`.
- `STREETSPEAK_TTS_PROVIDER=elevenlabs`.
- Local macOS `say` on macOS, otherwise stdout fallback.

macOS voice selection:

```sh
pnpm streetspeak:dev speak "StreetSpeak AI is ready." --voice Samantha
STREETSPEAK_MACOS_VOICE=Samantha pnpm streetspeak:dev session --speak
```

ElevenLabs is optional and uses Dean's own local key only:

```sh
export ELEVENLABS_API_KEY="your-local-key"
export ELEVENLABS_VOICE_ID="your-local-voice-id"
export ELEVENLABS_MODEL_ID="eleven_multilingual_v2" # optional default

pnpm streetspeak:dev speak "StreetSpeak AI is ready." --provider elevenlabs
pnpm streetspeak:dev session --speak --tts elevenlabs
STREETSPEAK_TTS_PROVIDER=elevenlabs pnpm streetspeak:dev session --speak
```

If `ELEVENLABS_API_KEY` or `ELEVENLABS_VOICE_ID` is missing, the CLI prints the missing variable name and falls back safely to local macOS `say` or stdout. It never prints the API key value. ElevenLabs audio is written only to a temp file when needed for local playback, then deleted after playback. Do not commit `.env` files or generated audio.

## Text Transcript Bridge

The CLI voice bridge accepts text transcripts, not raw audio:

```sh
pnpm streetspeak:dev transcript "buy 5 HOOD"
pnpm streetspeak:dev transcript "buy 5 HOOD" --speak
pnpm streetspeak:dev session --transcript-file ./transcript.txt
```

Built path after `pnpm build`:

```sh
pnpm streetspeak transcript "buy 5 HOOD"
pnpm streetspeak transcript "buy 5 HOOD" --speak
pnpm streetspeak session --transcript-file ./transcript.txt
```

Use macOS Dictation, Wispr Flow, or another local dictation tool to enter text into the terminal. You can paste the dictated text into an interactive session, pass it as a `transcript` argument, or write a short local `transcript.txt` file and feed it to `session --transcript-file`.

Transcript input routes through the same mock-only command handling as typed input. It can build mock tickets, require the exact mock confirmation phrase/code, reject generic confirmations like `yes`, print a mock receipt, and produce a manual Robinhood Agent handoff. It does not create live broker orders.

StreetSpeak does not bundle Whisper, `whisper.cpp`, or any speech-to-text model. It does not require voice API keys, upload audio to a StreetSpeak server, store raw audio, or persist transcript copies by default. Do not paste secrets, account IDs, tokens, MCP URLs, auth config, raw MCP output, raw audio paths, or real account data into transcript commands, docs, screenshots, PRs, or handoffs.

## Robinhood Read-Only Smoke

```sh
pnpm streetspeak:dev robinhood smoke
# or, after pnpm build:
pnpm streetspeak robinhood smoke
```

The default result is unavailable/unconfigured. If an external MCP client is provided at runtime, the CLI prints only redacted summary lines. Never paste credentials, tokens, account IDs, MCP URLs, auth config, or raw MCP output into CLI commands, docs, screenshots, PRs, or handoffs.

## Robinhood Agent Handoff

```sh
pnpm streetspeak:dev robinhood handoff "buy 5 HOOD"
# or, after pnpm build:
pnpm streetspeak robinhood handoff "buy 5 HOOD"
```

The CLI prints a manual prompt for Dean's connected Robinhood Agent. StreetSpeak does not send the prompt to Robinhood, does not review the order, and does not place an order. Any quote lookup, cost estimate, buying-power impact, warning review, and trade approval must happen inside the separate Robinhood Agent flow.

The handoff output is copy-friendly and sectioned. It says the prompt is manual only, tells Robinhood Agent not to place anything unless separately confirmed inside that Agent flow, and repeats that StreetSpeak did not send, review, place, or cancel an order. Actual trade review and approval happen only inside Robinhood Agent, not inside StreetSpeak.

Options handoff is unsupported/future. Live trading, order review, order placement, cancel order, autonomous trading, broker login UI, analytics, payments, Discord/X automation, and trade recommendations are not CLI features.

## Voice Input

Typed CLI input is primary. The CLI can accept pasted text transcripts from any local dictation tool. Browser-native voice remains in the web app. Future local speech-to-text support can be evaluated later, but this CLI adds no speech-to-text dependency, model, external voice service, API key, sample audio, or StreetSpeak server upload path.
