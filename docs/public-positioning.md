# Public Positioning

StreetSpeak AI is an open-source, local-first mock trading desk for self-directed users who want to test voice-native command flows, exact confirmation gates, and auditable receipt exports before any future broker execution work.

The v0.1 public demo is mock-only. It is not investment advice, not a broker, not a trade recommendation system, and not affiliated with Robinhood, Public, ElevenLabs, or any broker or voice provider.

## GitHub Description

Voice-native mock trading desk with exact confirmation gates, local receipts, fixture data, and a read-only Robinhood MCP boundary.

## Taglines

- Voice-native trading workflows, mocked safely first.
- Mock tickets. Exact confirmations. Local receipts. No live trading.
- A safety-first local desk for self-directed trading experiments.

## What It Is

- A local mock trading desk for typed commands and optional browser-native voice transcripts where supported.
- A public demo of exact phrase/code confirmation, generic confirmation rejection, redacted audit events, and local receipt exports.
- A fixture-only Robinhood explorer backed by static data committed in the repo.
- A separate Robinhood MCP read-only panel that is unavailable by default unless an externally managed runtime client is injected.
- A redacted smoke harness for the read-only MCP boundary.

## What It Is Not

- Not investment advice.
- Not a broker, adviser, signal service, or recommendation engine.
- Not live trading software in v0.1.
- Not connected to Robinhood, Public, ElevenLabs, or a live market data API by default.
- Not a broker login UI or credential vault.
- Not an autonomous, scheduled, social, Discord, X, payment, or deployment product.

## Current Status Language

Use:

- Mock trading desk is working locally.
- Browser voice works where the browser supports native speech recognition; typed input remains the reliable fallback.
- Onboarding/settings, local audit logs, and local receipt exports are working.
- Robinhood fixture explorer is working with static fixture data only.
- Robinhood MCP read-only boundary is scaffolded and unavailable by default.
- Redacted smoke harness is available; real read-only Robinhood verification should not be claimed unless the smoke test was actually run with an external client.
- Robinhood order review and live execution are not implemented.

Avoid:

- Real Robinhood is connected.
- Live quotes are available.
- Order review works.
- Orders can be placed, staged, submitted, executed, or canceled.
- The app recommends trades.
- The app is affiliated with Robinhood, Public, ElevenLabs, or any broker.

## Core Safety Message

StreetSpeak AI starts with mock mode locked on. Order-like commands create mock tickets only. Generic confirmations are rejected. Mock submission requires the exact challenge phrase and code. Receipts and audit exports state that no live broker order was placed.

## Robinhood Readiness Message

Robinhood support is split into two clearly separated surfaces:

- Fixture explorer: static fixture data only, no transport, no credentials, and no live connection.
- MCP read-only panel: externally managed, unavailable by default, in-memory only by default, and limited to read-only account, portfolio, positions, quotes, order history, tradability, and search.

Future phases must stay separate:

1. Read-only MCP connection.
2. Order review.
3. Live execution, only if separately approved.

## Screenshot Candidates

- Onboarding acknowledgement.
- Mock trading desk with a portfolio response.
- HOOD mock quote response.
- Exact confirmation challenge for `buy 5 HOOD`.
- Generic confirmation rejection after `yes`.
- Mock receipt export controls and receipt preview.
- `v0.1 Mock Demo` status panel and safety checklist.
- `Robinhood Read-Only Fixture Explorer`.
- `Real Robinhood MCP Read-Only Connection` only when it shows unavailable/unconfigured or redacted data.

## Screenshot Boundaries

Never screenshot or publish:

- Real account IDs or account numbers.
- Real portfolio values, buying power, cash, holdings, positions, or order history.
- Raw order IDs.
- Raw quote prices from a live account connection.
- Raw MCP output.
- Credentials, tokens, authorization headers, API keys, MCP URLs, or auth config.

## Public Copy Guardrails

- Say `mock-only`, `mock-first`, `local-first`, `fixture-only`, `read-only boundary`, and `future-gated`.
- Say `self-directed trading workflows`, not advice or recommendations.
- Say `no live broker execution`.
- Say `no real Robinhood verification unless a redacted read-only smoke test was actually run`.
- Say `no real market data by default`.
- Avoid wording that implies account linking, broker login, live quotes, live order review, live execution, or automated trading.
