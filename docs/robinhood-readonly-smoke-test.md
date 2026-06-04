# Robinhood Read-Only MCP Smoke Test

StreetSpeak AI includes a redacted smoke harness for the Robinhood MCP read-only boundary. It is safe by default and prints only summarized status lines.

## Safe default run

```bash
pnpm smoke:robinhood:readonly
```

Without an externally managed local MCP client module, the expected result is unavailable/unconfigured:

```text
get_accounts: unavailable/unconfigured
get_portfolio: unavailable/unconfigured
get_equity_positions: unavailable/unconfigured
get_equity_quotes: unavailable/unconfigured
get_equity_orders: unavailable/unconfigured
get_equity_tradability: unavailable/unconfigured
search: unavailable/unconfigured
status: unavailable
raw payload included: false
live execution available: false
order review available: false
order placement available: false
cancel order available: false
```

## Optional externally managed client

If a developer has an external MCP runtime already configured, provide a local ignored client module at run time:

```bash
STREETSPEAK_ROBINHOOD_MCP_CLIENT_MODULE=/absolute/path/to/local-client.mjs pnpm smoke:robinhood:readonly
```

The module must export `default`, `client`, or `robinhoodMcpReadOnlyClient` with a `callTool(toolName, input)` function. Do not commit that module, credentials, URLs, auth config, tokens, account IDs, or raw MCP output.

## Allowed output

Only these redacted summary shapes are allowed in GitHub, PRs, handoffs, release notes, or screenshots:

```text
get_accounts: success, count=N, identifiers redacted
get_portfolio: success, values redacted
get_equity_positions: success, count=N, values redacted
get_equity_quotes: success, sample symbol checked, prices redacted
get_equity_orders: success, count=N, identifiers redacted
get_equity_tradability: success, boolean result only if safe
search: success, count=N
```

## Never copy or commit

Never copy into GitHub, PRs, screenshots, docs, tests, or Foundry handoffs:

- raw account IDs or account numbers
- raw portfolio values, buying power, cash, holdings, or position values
- raw order IDs
- raw quote prices
- raw MCP payloads
- credentials, tokens, authorization headers, API keys, MCP URLs, or auth config
- screenshots containing real account data

## Manual QA checklist

- Run `pnpm build`, `pnpm test`, `pnpm lint`, and `pnpm typecheck` first.
- Run the smoke harness in default unavailable mode and confirm no raw values print.
- If using an external client, copy only the redacted summary lines above.
- Verify the real Robinhood MCP panel says read-only and shows no live trading, no order review, no order placement, and no cancel order.
- Verify the panel has no buy, sell, review, place, execute, or cancel buttons.
- Verify mock trading desk still rejects generic confirmations and requires the exact mock confirmation phrase/code.
- Verify the fixture explorer still loads fixture-only data.
- Prepare launch screenshots only from mock/fixture data or from the read-only panel with real data absent/redacted.
