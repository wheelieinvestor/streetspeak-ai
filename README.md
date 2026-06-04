# StreetSpeak AI

Voice-native trading desk for AI agents.

StreetSpeak AI is a local-first, open-source workspace for self-directed traders who want to ask portfolio and market questions, assemble mock order tickets by voice, and review risk before any future execution workflow.

This first scaffold is mock-only. It does not implement live trading, Robinhood MCP integration, broker login flows, trade recommendations, or any system that can place orders.

## Who It Is For

StreetSpeak AI is for developers and self-directed investors who want a transparent local trading-desk interface they can inspect, extend, and run on their own machine.

It is not an investment adviser, broker, signal service, or recommendation engine. Users are responsible for every trading decision.

## Current Version

StreetSpeak AI v0.1 is a local mock trading desk demo. It can:

- Route typed mock portfolio, quote, and share-quantity equity order commands.
- Optionally capture browser-native speech transcripts when the user's browser supports it.
- Require first-run local safety onboarding before the demo flow opens.
- Store onboarding acknowledgement and demo settings in local browser storage only.
- Show a static/fake mock portfolio and static/fake mock quotes for `HOOD`, `SPY`, `NVDA`, `AAPL`, and `SOFI`.
- Build mock market or limit equity order tickets for supported share-quantity commands.
- Run every ticket through a safety review.
- Require an exact confirmation phrase with a short unique code before mock submission.
- Reject generic confirmations like `yes`, `do it`, or `confirmed`.
- Record an in-memory audit timeline for command, routing, ticket, safety, confirmation, and mock execution events.

Mock mode is the default first experience. Live execution is unavailable and must remain disabled by default in future phases.

## Run the Mock Demo

Install dependencies:

```sh
pnpm install
```

Start the local web app:

```sh
pnpm --filter @streetspeak-ai/web dev
```

Open the local Vite URL and try commands such as:

- `buy 5 HOOD`
- `sell 2 SOFI`
- `build a limit order to buy 3 AAPL at 175`
- `show my portfolio`
- `what is HOOD trading at`
- `how much mock buying power do I have`
- `show me a quote for NVDA`
- `sell 1 SPY at market`
- `buy $500 of HOOD`

For order commands, copy the exact confirmation phrase/code shown by the app. A phrase without the code, an expired challenge, or generic text will not submit even the mock order.

See [docs/demo-script.md](docs/demo-script.md) for a 2-minute reviewer walkthrough.

## Browser Voice Input

Browser voice input is optional and local to the web app. When enabled in the local settings panel, StreetSpeak AI feature-detects the browser's built-in speech recognition support. If the browser does not expose a compatible speech recognition API, the app shows an unsupported status and typed input remains the reliable path.

When supported, the browser produces a text transcript and StreetSpeak AI sends that transcript through the same mock command parser used by typed input. StreetSpeak AI does not use ElevenLabs, does not require speech API keys, does not store raw audio, and does not upload raw audio to a StreetSpeak server. Browser-native speech behavior can vary by browser and device.

## First-Run Onboarding And Local Settings

The local web app requires a first-run safety acknowledgement before using the demo flow. The acknowledgement states that StreetSpeak AI is not investment advice, is not affiliated with Robinhood, Public, ElevenLabs, or any broker, is mock-only today, will not place a live broker order, can make parsing or transcription mistakes, and requires the user to review every ticket and confirmation.

The acknowledgement is stored only in browser local storage. The settings panel can reset the acknowledgement for demos or testing.

The local settings panel includes:

- Mock mode status, locked on.
- Live trading status, unavailable and disabled.
- Browser voice input enable/disable.
- Audit timeline show/hide.
- Reset demo state.
- Reset onboarding acknowledgement.

No accounts are created. Nothing is sent to a StreetSpeak server by the local demo.

## Local Data Storage

Stored locally in browser storage:

- First-run onboarding acknowledgement.
- Local demo settings for browser voice input and audit timeline visibility.

Not stored:

- API keys, broker credentials, account credentials, or session tokens.
- Raw audio.
- Real broker account data.
- Real market data.
- Live orders.
- Trade recommendations.

## Unsupported Today

StreetSpeak AI v0.1 does not support notional/dollar-based final tickets. A command such as `buy $500 of HOOD` is returned as unsupported instead of being converted to shares. Future notional support must perform quote lookup, explicit share conversion, and user confirmation before creating a final ticket.

## Planned Broker Support

Robinhood Agentic Trading through MCP is planned for a future phase, starting with a read-only adapter. It is not implemented yet.

Public adapter support is also planned for a later phase. It is not implemented yet.

ElevenLabs voice support is also not implemented yet.

StreetSpeak AI is not affiliated with Robinhood, Public, ElevenLabs, or any broker or voice provider.

## Safety Position

- No investment advice.
- No trade recommendations.
- No live trading in this scaffold.
- No plaintext secret storage.
- Explicit opt-in will be required before any future live execution work.
- Future live execution must require specific confirmation phrases, not generic responses like "yes" or "do it".

## Local Setup

Install dependencies:

```sh
pnpm install
```

Configure environment variables:

```sh
cp .env.example .env.local
```

StreetSpeak AI starts in mock mode and should not require real secrets for local development. Keep real credentials out of git. Add placeholder variable names to `.env.example` only when new environment variables are introduced.

Run locally:

```sh
pnpm --filter @streetspeak-ai/web dev
```

Run tests and typechecks in a clean checkout after building workspace package outputs:

```sh
pnpm build
pnpm typecheck
pnpm test
```

Run lint:

```sh
pnpm lint
```

Useful project structure:

- `apps/web` - Vite web app shell for the mock trading desk.
- `packages/core` - command routing, quote/portfolio mocks, and desk orchestration.
- `packages/orders` - order ticket types and validation.
- `packages/safety` - safety review and confirmation contracts.
- `packages/audit` - audit event types and redaction helpers.
- `packages/brokers` - mock-only broker adapter interfaces.
- `packages/voice` - voice transcript and provider interfaces.
- `docs` - architecture, legal, security, and collaboration notes.
