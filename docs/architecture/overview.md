# Architecture Overview

StreetSpeak AI is organized as a TypeScript pnpm monorepo.

- `apps/web`: local mock trading desk dashboard.
- `packages/core`: shared session, command routing, parsed-intent contracts, and mock desk orchestration.
- `packages/orders`: equity order ticket lifecycle types, validation, and creation helpers.
- `packages/safety`: safety reviews, explicit confirmation challenges, and generic-confirmation rejection.
- `packages/audit`: audit event types, redaction helpers, local in-memory sink, local audit exports, and mock receipt exports.
- `packages/voice`: voice transcript and provider abstraction for browser speech and mock/local development providers. ElevenLabs is not implemented.
- `packages/brokers`: mock-only broker adapter, Robinhood fixture read-only adapter, and Robinhood MCP read-only adapter boundary.

The app remains mock-first. Robinhood MCP support is read-only only, externally managed, and unavailable by default unless a runtime client is injected. Public adapters are planned but not implemented. There is no live broker execution method in the current broker interface.

## v0.1 mock trading desk flow

The local demo flow is intentionally local-first and mock-only:

1. `command.received`: typed transcript is accepted by the dashboard. Browser-native speech input can provide a text transcript when supported; raw audio is not stored by StreetSpeak AI or sent to a StreetSpeak server.
2. `command.routed`: the command is routed as a portfolio question, quote question, order ticket request, unsupported command, or invalid command.
3. Portfolio and quote questions are answered from static fake fixtures only. These are labeled `MOCK PORTFOLIO` or `MOCK STATIC QUOTE` and are not real account or market data.
4. Share-quantity equity commands create mock order tickets for supported symbols. Every ticket goes through safety review before confirmation.
5. `confirmation.challenge.created`: the safety layer creates an exact phrase with order details and a short code, for example `CONFIRM MOCK BUY 5 HOOD MARKET CODE 4827`.
6. `confirmation.accepted` or `confirmation.rejected`: exact phrase plus code is required. Generic confirmations and phrases without the code are rejected.
7. `mock.execution.requested` and `mock.execution.submitted`: the mock broker records a fake submission and explicitly reports that no live broker order was placed.

The web app persists redacted audit events in browser `localStorage` only. Local controls can clear the audit timeline, export a redacted audit JSON file, copy a mock receipt Markdown summary, download receipt JSON, reset onboarding, reset transient demo state, or reset all local demo data. Receipt exports explicitly state `No live broker order was placed.` No export is uploaded or turned into a public URL.

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

There is no Public integration, real broker login, live broker execution, real order review, real order placement, cancel order, deployment, payment, database migration, Discord/X automation, raw audio storage, or autonomous trading behavior in v0.1. The only real Robinhood path is the externally managed MCP read-only boundary for account, portfolio, position, quote, order-history, tradability, and search reads.
