# Robinhood MCP Read-Only Setup

StreetSpeak AI supports a read-only Robinhood MCP boundary for developers who already have MCP configured outside this repository. The app does not include broker login UI, API key fields, MCP URL fields, token storage, or credential storage.

## Supported read-only tools

The adapter allowlist is limited to these read-only concepts:

- `get_accounts`
- `get_portfolio`
- `get_equity_positions`
- `get_equity_quotes`
- `get_equity_orders`
- `get_equity_tradability`
- `search`

These tools may be used only to render in-memory read-only account, portfolio, position, quote, order-history, tradability, and search views.

## Blocked tools

These concepts are intentionally blocked and future-only:

- `review_equity_order`
- `place_equity_order`
- `cancel_equity_order`

StreetSpeak AI has no Robinhood order review, order placement, cancel order, or live execution method in this phase.

## Runtime configuration

Configure Robinhood MCP outside the StreetSpeak AI repo/app. Do not commit MCP URLs, OAuth tokens, API keys, account IDs, screenshots, raw MCP output, or auth config.

For local experimentation, a host page can provide an externally managed client object at runtime:

```ts
window.streetspeakRobinhoodMcpReadOnlyClient = {
  async callTool(toolName, input) {
    // Forward only allowed read-only calls to an externally configured MCP client.
    // Do not store returned account data in localStorage or commit it to files.
  }
};
```

The web panel stays unavailable/unconfigured when this client is absent.

## Privacy behavior

Real read-only Robinhood data is in-memory only by default. StreetSpeak AI redacts or omits raw account identifiers and raw order identifiers in normalized output. Audit events for real read-only panel actions record action names and timestamps only.

Do not copy real account identifiers, portfolio values, holdings, order IDs, raw market data snapshots, raw MCP responses, screenshots, or smoke-test payloads into tests, fixtures, docs, PR bodies, or Foundry handoffs.

## Phase gates

Future phases remain separate approval gates:

1. Read-only connection: current phase.
2. Order review only: future task, separately approved, still no live execution.
3. Live execution: future task, only after separate explicit approval and safety review.
