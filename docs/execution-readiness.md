# Execution Readiness

StreetSpeak AI now has execution-ready order infrastructure for planning, dry-runs, manual handoff, and future broker gates. It still has no live trading path.

## Current Capabilities

- Execution lifecycle states cover draft, parsed, ticket creation, safety review, confirmation challenge, confirmation accepted/rejected, dry-run, manual handoff, blocked live execution, future broker review, and future live execution.
- `DryRunExecutionGateway` can build a plan, run safety checks, create an exact confirmation challenge, evaluate confirmation text, and record a dry-run submission.
- `ManualHandoffExecutionGateway` can build the same safe plan and create a manual Robinhood Agent prompt.
- `BlockedLiveExecutionGateway` fails closed for every method with `Live execution is unavailable in this build.`

No gateway calls Robinhood order review, order placement, cancel order, options review, options placement, or options cancel tools.

## Safe CLI Commands

```sh
pnpm streetspeak:dev execute status
pnpm streetspeak:dev execute plan "buy 5 HOOD"
pnpm streetspeak:dev execute dry-run "buy 5 HOOD"
pnpm streetspeak:dev execute handoff "buy 5 HOOD"
```

Expected behavior:

- `execute status` reports live execution, order review, order placement, and cancel order as unavailable; dry-run and manual handoff as available; kill switch as active.
- `execute plan` creates an inspectable execution plan and prints the safety gates.
- `execute dry-run` records only a dry-run submission and states that no live broker order was placed.
- `execute handoff` prints a manual Robinhood Agent prompt only. StreetSpeak does not send it anywhere.

Forbidden commands such as `execute live`, `execute place`, `execute review`, and `execute cancel` fail safely.

## Configuration Defaults

Execution config defaults:

- `liveTradingEnabled: false`
- `orderReviewEnabled: false`
- `cancelOrderEnabled: false`
- `requireExactConfirmation: true`
- `allowMarketOrders: false`
- `maxOrderNotionalUsd: null`
- `killSwitchEnabled: true`
- `executionMode: dry_run`

The config model does not read live trading secrets, broker credentials, MCP URLs, account IDs, or live env values.

## Lifecycle Separation

Dry-run, manual handoff, future broker review, and future live execution are separate lifecycle paths:

- Dry-run records a simulated submission only.
- Manual handoff creates copy/paste text only.
- Future broker review is represented as a required future state, not implemented behavior.
- Future live execution is represented as blocked/future-gated state, not implemented behavior.

No lifecycle state triggers real broker execution.

## Audit Events

Execution emits redacted audit event types:

- `execution.plan.created`
- `execution.safety.blocked`
- `execution.confirmation.required`
- `execution.dry_run.submitted`
- `execution.manual_handoff.created`
- `execution.live.blocked`

Audit payloads redact account identifiers, broker order IDs, raw MCP output, MCP URLs, auth config, tokens, credentials, portfolio values, buying power, holdings, positions, and raw audio fields.
