# StreetSpeak AI

Voice-native trading desk for AI agents.

StreetSpeak AI is a local-first, open-source workspace for self-directed traders who want to ask portfolio and market questions, assemble order tickets by voice, review risk, and execute only after explicit confirmation.

This first scaffold is mock-only. It does not implement live trading, Robinhood MCP integration, broker login flows, trade recommendations, or any system that can place orders.

## Who It Is For

StreetSpeak AI is for developers and self-directed investors who want a transparent local trading-desk interface they can inspect, extend, and run on their own machine.

It is not an investment adviser, broker, signal service, or recommendation engine. Users are responsible for every trading decision.

## Current Version

The current repository foundation includes:

- TypeScript pnpm workspace setup.
- A minimal placeholder web app.
- Shared command-routing types.
- Order ticket validation placeholders.
- Safety and confirmation gate placeholders.
- Audit event types.
- Voice provider interfaces.
- Mock broker adapter interfaces.

Mock mode is the default first experience. Live execution is unavailable in this scaffold and must remain disabled by default in future phases.

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

Start the placeholder web app:

```sh
pnpm --filter @streetspeak-ai/web dev
```
