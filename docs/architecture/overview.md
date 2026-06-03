# Architecture Overview

StreetSpeak AI is organized as a TypeScript pnpm monorepo.

- `apps/web`: local mock trading desk dashboard.
- `packages/core`: shared session, command routing, parsed-intent contracts, and mock desk orchestration.
- `packages/orders`: equity order ticket lifecycle types, validation, and creation helpers.
- `packages/safety`: safety reviews, explicit confirmation challenges, and generic-confirmation rejection.
- `packages/audit`: audit event types, redaction helpers, and local in-memory sink.
- `packages/voice`: voice transcript and provider abstraction for browser speech, local STT, and future ElevenLabs support.
- `packages/brokers`: mock-only broker adapter, static/fake portfolio fixtures, and static/fake quote fixtures.

The first scaffold is mock-only. Robinhood MCP and Public adapters are planned but not implemented. There is no live broker execution method in the current broker interface.

## v0.1 mock trading desk flow

The local demo flow is intentionally in-memory and mock-only:

1. `command.received`: typed transcript is accepted by the dashboard. Browser voice input is a visible placeholder only; raw audio is not captured or stored.
2. `command.routed`: the command is routed as a portfolio question, quote question, order ticket request, unsupported command, or invalid command.
3. Portfolio and quote questions are answered from static fake fixtures only. These are labeled `MOCK PORTFOLIO` or `MOCK STATIC QUOTE` and are not real account or market data.
4. Share-quantity equity commands create mock order tickets for supported symbols. Every ticket goes through safety review before confirmation.
5. `confirmation.challenge.created`: the safety layer creates an exact phrase with order details and a short code, for example `CONFIRM MOCK BUY 5 HOOD MARKET CODE 4827`.
6. `confirmation.accepted` or `confirmation.rejected`: exact phrase plus code is required. Generic confirmations and phrases without the code are rejected.
7. `mock.execution.requested` and `mock.execution.submitted`: the mock broker records a fake submission and explicitly reports that no live broker order was placed.

Durable local audit storage is a future task. v0.1 keeps the audit timeline local and in memory.

## Supported mock commands

The parser supports typed commands such as:

- `show my portfolio`
- `what positions do I have`
- `how much mock buying power do I have`
- `what is HOOD trading at`
- `show me a quote for NVDA`
- `buy 5 HOOD`
- `sell 2 SOFI`
- `create a ticket to buy 1 NVDA`
- `build a limit order to buy 3 AAPL at 175`
- `sell 1 SPY at market`

It does not give recommendations or personalized investment advice. It only builds self-directed mock tickets from user-provided intent.

## Order contract scope

The v0.1 order contracts support share-quantity equity tickets only. Spoken notional commands such as `Buy $500 of HOOD` should be parsed as user intent in a future task, then require quote lookup plus explicit conversion and confirmation before they become a final order ticket. v0.1 does not silently convert dollars into shares.

## Mock-only boundaries

There is no Robinhood MCP, Public integration, real broker login, live broker execution, real order placement, real market data API, deployment, payment, database migration, Discord/X automation, raw audio storage, or autonomous trading behavior in v0.1.
