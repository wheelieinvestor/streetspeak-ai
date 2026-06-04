# Robinhood Readiness

StreetSpeak AI v0.1 is still a mock-first trading desk. The current repository includes a Robinhood fixture explorer and a strictly read-only Robinhood MCP adapter boundary in `packages/brokers`.

The scaffold does not implement broker login, credential configuration, order review, cancel order, live order placement, or live execution. The real Robinhood MCP path is read-only, externally managed, unavailable by default, and limited to read-only account, portfolio, position, quote, order-history, tradability, and search calls.

## Current Read-Only Surfaces

The Robinhood read-only surfaces are limited to TypeScript contracts, capability metadata, status/error results, static fixture data, and an externally managed MCP read-only client boundary. They may model:

- Broker account summary.
- Portfolio snapshot.
- Buying power.
- Equity positions.
- Equity quotes.
- Equity order history items.
- Tradability checks.
- Symbol search results.
- Adapter status and read errors.

The default Robinhood factory returns a disabled adapter. Fixture reads require an explicit fixture factory and still use only local static data. The MCP adapter requires a runtime client supplied outside StreetSpeak AI. No secrets, API keys, session tokens, broker account identifiers, MCP server URLs, or Robinhood credentials are configured, required, stored, or committed by StreetSpeak AI.

The read-only adapter surface intentionally has no methods for order review, order placement, order staging, order submission, mock submission, routing, live execution, or canceling orders.

## Real Robinhood MCP Read-Only Panel

The web app includes a section titled `Real Robinhood MCP Read-Only Connection`. It is separate from both the mock trading desk and the fixture explorer.

The panel is unavailable/unconfigured unless a host environment injects an externally managed `streetspeakRobinhoodMcpReadOnlyClient` at runtime. StreetSpeak AI does not provide broker login UI, API key fields, token fields, MCP URL fields, or credential storage.

Allowed read-only tool concepts:

- `get_accounts`
- `get_portfolio`
- `get_equity_positions`
- `get_equity_quotes`
- `get_equity_orders`
- `get_equity_tradability`
- `search`

Blocked/future-only tool concepts:

- `review_equity_order`
- `place_equity_order`
- `cancel_equity_order`

The MCP panel must show `liveExecutionAvailable: false`, `orderReviewAvailable: false`, `orderPlacementAvailable: false`, and `cancelOrderAvailable: false`. It must not render buy, sell, review, place, execute, or cancel actions for Robinhood.

Real read-only data is in-memory only by default. Audit events may record read action names and timestamps, but must not persist raw account identifiers, portfolio values, holdings, order IDs, or raw MCP output.

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

| Capability                  | Status                      | Scope                                                                                                                    |
| --------------------------- | --------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Mock adapter                | Current                     | Static mock portfolio, static mock quotes, mock ticket review, and mock submission only.                                 |
| Robinhood fixture read-only | Current                     | Static account, portfolio, position, quote, order history, tradability, and search fixtures only.                        |
| Robinhood MCP read-only     | Current, externally managed | Real read-only MCP boundary only; no stored credentials, order review, order placement, cancel order, or live execution. |
| Robinhood order review      | Future gated                | Reviewable order tickets and safety checks only; no live execution.                                                      |
| Robinhood live equities     | Future gated                | Requires separate explicit approval, exact challenge phrase/code, and live-execution safety review.                      |
| Public                      | Future                      | No implementation in v0.1. Must start read-only if added.                                                                |
| Options                     | Future ticket parsing only  | No live options execution unless a future officially supported broker path is explicitly approved.                       |

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

- Robinhood MCP read-only boundary only; unavailable by default unless externally configured at runtime.
- No Public integration.
- No live broker execution.
- No real broker API path outside the externally managed MCP read-only client boundary.
- No real broker login.
- No real market data APIs outside read-only MCP quote reads.
- No broker credentials or API keys.
- No order review or cancel-order implementation for Robinhood.
- No raw audio storage by StreetSpeak AI.
- No deployment or production service.
