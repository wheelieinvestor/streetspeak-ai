# v0.1 Launch Post Draft

Use this as a public launch-copy scratchpad. Keep all claims aligned with the v0.1 boundary: mock-only trading desk, fixture-only explorer, read-only MCP boundary unavailable by default, no live trading, no order review, no investment advice.

## GitHub Description

Voice-native mock trading desk with exact confirmation gates, local receipts, fixture data, and a read-only Robinhood MCP boundary.

## Short Taglines

- Mock tickets. Exact confirmations. Local receipts. No live trading.
- Voice-native trading workflows, mocked safely first.
- A local-first trading desk demo for self-directed workflows.

## X Launch Post

StreetSpeak AI v0.1 is public.

It is a local-first mock trading desk for self-directed workflows: typed or browser-native voice commands, mock tickets, exact confirmation codes, local audit logs, and receipt exports.

No live trading. No advice. No broker login.

Repo: https://github.com/wheelieinvestor/streetspeak-ai

## Longer X Thread

1. StreetSpeak AI v0.1 is public: a local-first mock trading desk for testing voice-native trading workflows before any future broker execution work.

2. What works today: onboarding, typed commands, browser-native voice where supported, mock portfolio/quotes, mock order tickets, safety review, exact confirmation codes, local audit logs, and receipt exports.

3. The demo rejects generic confirmations like `yes` or `do it`. Even mock submission requires the exact phrase and unique code shown by the app.

4. Robinhood readiness is split into safe surfaces: a fixture-only explorer with static data and a separate read-only MCP boundary that is unavailable by default unless externally configured.

5. What is not built: live trading, order review, order placement, cancel order, broker login, real account persistence, analytics, payments, Discord/X automation, recommendations, or investment advice.

6. The goal is to make the safety model visible before adding power: local-first, mock-first, audit-friendly, and explicit about what it cannot do.

Repo: https://github.com/wheelieinvestor/streetspeak-ai

## LinkedIn-Style Announcement

I published StreetSpeak AI v0.1, an open-source local demo for voice-native trading workflows.

The first release is intentionally mock-only. It lets a user run typed or browser-native voice commands, inspect a static mock portfolio and mock quote responses, create mock share-quantity order tickets, reject generic confirmations, require an exact confirmation phrase/code, and export local-only receipts and redacted audit logs.

The Robinhood work is deliberately separated: a fixture-only explorer uses static committed data, and a read-only MCP boundary is scaffolded but unavailable by default unless an external runtime client is supplied. There is no broker login UI, no order review, no order placement, no cancel order, no live execution, and no investment advice.

The point of v0.1 is to make the safety gates visible before adding any future broker capability.

Repo: https://github.com/wheelieinvestor/streetspeak-ai

## Demo Script Summary

- Accept the first-run mock-only onboarding.
- Run `show my portfolio`.
- Run `what is HOOD trading at`.
- Run `buy 5 HOOD`.
- Enter `yes` and show the generic confirmation rejection.
- Enter the exact confirmation phrase and code.
- Export the local receipt.
- Show the fixture explorer.
- Show the read-only MCP panel unavailable/unconfigured by default.
- Run `pnpm smoke:robinhood:readonly` only in safe default mode for public demo prep.

## Claims To Avoid

- Do not claim live trading.
- Do not claim real Robinhood verification unless a redacted read-only smoke test was actually run with an external client.
- Do not claim broker login, account linking, order review, order placement, execution, or cancel-order support.
- Do not claim live market data by default.
- Do not imply recommendations, advice, signals, autonomous trading, or managed money.
- Do not imply affiliation with Robinhood, Public, ElevenLabs, or any broker or voice provider.
- Do not post screenshots containing real account data, holdings, portfolio values, order IDs, raw MCP output, credentials, tokens, API keys, or MCP URLs.
