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

- `show my portfolio`
- `how much mock buying power do I have`
- `show me a quote for NVDA`
- `buy 5 HOOD`
- `sell 2 SOFI`
- `build a limit order to buy 3 AAPL at 175`
- `sell 1 SPY at market`

For order commands, copy the exact confirmation phrase/code shown by the app. A phrase without the code, an expired challenge, or generic text will not submit even the mock order.

## Unsupported Today

StreetSpeak AI v0.1 does not support notional/dollar-based final tickets. A command such as `buy $500 of HOOD` is returned as unsupported instead of being converted to shares. Future notional support must perform quote lookup, explicit share conversion, and user confirmation before creating a final ticket.

## Planned Broker Support

Robinhood Agentic Trading through MCP is planned for a future phase, starting with a read-only adapter. It is not implemented yet.

Public adapter support is also planned for a later phase. It is not implemented yet.

StreetSpeak AI is not affiliated with Robinhood, Public, ElevenLabs, or any broker or voice provider.

## Safety Position

- No investment advice.
- No trade recommendations.
- No live trading in this scaffold.
- No plaintext secret storage.
- Explicit opt-in will be required before any future live execution work.
- Future live execution must require specific confirmation phrases, not generic responses like "yes" or "do it".

## Development

Install dependencies:

```sh
pnpm install
```

Run checks:

```sh
pnpm build
pnpm test
pnpm lint
pnpm typecheck
```

Start the web app shell:

```sh
pnpm --filter @streetspeak-ai/web dev
```
