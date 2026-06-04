# Robinhood Readiness

StreetSpeak AI v0.1 is still a mock-first trading desk. The current repository includes a disabled-by-default Robinhood read-only scaffold in `packages/brokers`, but it is fixture-only and has no active Robinhood connection.

The scaffold does not implement Robinhood MCP, broker login, broker API calls, credential configuration, real account data, real market data, order review, cancel order, live order placement, or live execution.

## Current Read-Only Scaffold

The Robinhood read-only scaffold is limited to TypeScript contracts, capability metadata, status/error results, and static fixture data. It may model:

- Broker account summary.
- Portfolio snapshot.
- Buying power.
- Equity positions.
- Equity quotes.
- Equity order history items.
- Tradability checks.
- Symbol search results.
- Adapter status and read errors.

The default Robinhood factory returns a disabled adapter. Fixture reads require an explicit fixture factory and still use only local static data. No secrets, API keys, session tokens, broker account identifiers, MCP server URLs, or Robinhood credentials are configured or required.

The read-only adapter surface intentionally has no methods for order review, order placement, order staging, order submission, mock submission, routing, or canceling orders.

## Web Fixture Explorer

The v0.1 web app includes a section titled `Robinhood Read-Only Fixture Explorer`. It is a future-readiness demo panel, not a connection surface.

The panel may show only static fixture data from `packages/brokers`:

- Account summary fixture.
- Buying power fixture.
- Portfolio snapshot fixture.
- Positions fixture.
- Quote lookup fixture.
- Order history fixture.
- Tradability check fixture.
- Symbol search fixture.

The panel must keep the adapter status visibly safe:

| Field                     | Required value |
| ------------------------- | -------------- |
| `transport`               | `none`         |
| `requiresCredentials`     | `false`        |
| `liveExecutionAvailable`  | `false`        |
| `orderReviewAvailable`    | `false`        |
| `orderPlacementAvailable` | `false`        |
| `cancelOrderAvailable`    | `false`        |
| Credential fields         | none           |
| Connection actions        | none           |
| Order actions             | none           |

The default adapter state remains `disabled`. The web explorer uses the explicit fixture factory to render static local fixtures and must label them as not real account data, broker data, or market data.

## Gated Broker Phases

Future broker work must move through separate approval gates:

1. Read-only connection: account, portfolio, positions, buying power, quotes, order history, tradability, and symbol search only.
2. Order review: reviewable tickets and safety checks only; no live execution.
3. Live execution: only after separate explicit approval for live trading work.

Each phase must preserve mock mode and typed fallback behavior. Live trading must remain unavailable until an explicitly approved live-execution task changes that boundary.

## Broker Capability Matrix

| Capability              | Status                                                 | Scope                                                                                                                  |
| ----------------------- | ------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------- |
| Mock adapter            | Current                                                | Static mock portfolio, static mock quotes, mock ticket review, and mock submission only.                               |
| Robinhood read-only     | Current scaffold, fixture-only                         | Disabled by default; static account, portfolio, position, quote, order history, tradability, and search fixtures only. |
| Robinhood connection    | Future gated                                           | Separately approved real read-only connection only; no order review or live execution.                                 |
| Robinhood order review  | Future gated                                           | Reviewable order tickets and safety checks only; no live execution.                                                    |
| Robinhood live equities | Future gated                                           | Requires separate explicit approval, exact challenge phrase/code, and live-execution safety review.                    |
| Public                  | Future                                                 | No implementation in v0.1. Must start read-only if added.                                                              |
| Options                 | Future ticket parsing only unless officially supported | No live options execution unless a future officially supported broker path is explicitly approved.                     |

## Safety Requirements

Future Robinhood work must keep these requirements:

- No broker secrets in plaintext.
- No raw account IDs in logs, audit events, receipts, or exports.
- Read-only broker data before any order review.
- Order review before any live execution.
- Exact challenge phrase and unique code before any order placement.
- Generic confirmations such as `yes`, `do it`, `confirmed`, `send it`, `execute`, `looks good`, or `okay` must never place trades.
- No hidden background trading.
- No scheduled or autonomous trading.
- No investment advice or trade recommendation behavior.

## Current Boundary

Current StreetSpeak AI behavior remains mock-first and non-live:

- No Robinhood MCP.
- No Public integration.
- No live broker execution.
- No real broker APIs.
- No real broker login.
- No real market data APIs.
- No broker credentials or API keys.
- No order review or cancel-order implementation for Robinhood.
- No raw audio storage by StreetSpeak AI.
- No deployment or production service.
