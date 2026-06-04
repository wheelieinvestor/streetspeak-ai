# Robinhood Readiness

StreetSpeak AI v0.1 is mock-only. This document describes future readiness work only. It does not implement Robinhood MCP, broker login, broker API calls, live order placement, real market data, or live execution.

## Future Read-Only Phase

The first Robinhood-facing phase must be read-only. It may inspect:

- Portfolio snapshot.
- Equity positions.
- Equity quotes.
- Order history.
- Tradability checks.

The read-only phase must not place orders, stage live execution, store broker secrets in plaintext, log raw broker account identifiers, or make trade recommendations.

## Gated Broker Phases

Future broker work must move through separate approval gates:

1. Read-only only: portfolio, positions, quotes, order history, and tradability checks.
2. Order review only: construct reviewable tickets and safety checks without live execution.
3. Live execution: only after separate explicit approval for live trading work.

Each phase must preserve mock mode and typed fallback behavior. Live trading must remain unavailable until an explicitly approved live-execution task changes that boundary.

## Broker Capability Matrix

| Capability              | Status                                                 | Scope                                                                                               |
| ----------------------- | ------------------------------------------------------ | --------------------------------------------------------------------------------------------------- |
| Mock adapter            | Current                                                | Static mock portfolio, static mock quotes, mock ticket review, and mock submission only.            |
| Robinhood read-only     | Future                                                 | Portfolio snapshot, equity positions, equity quotes, order history, and tradability checks only.    |
| Robinhood order review  | Future                                                 | Reviewable order tickets and safety checks only; no live execution.                                 |
| Robinhood live equities | Future gated                                           | Requires separate explicit approval, exact challenge phrase/code, and live-execution safety review. |
| Public                  | Future                                                 | No implementation in v0.1. Must start read-only if added.                                           |
| Options                 | Future ticket parsing only unless officially supported | No live options execution unless a future officially supported broker path is explicitly approved.  |

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

Current StreetSpeak AI behavior remains mock-only:

- No Robinhood MCP.
- No Public integration.
- No live broker execution.
- No real broker APIs.
- No real broker login.
- No real market data APIs.
- No broker credentials or API keys.
- No raw audio storage by StreetSpeak AI.
- No deployment or production service.
