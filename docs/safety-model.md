# Safety Model

StreetSpeak AI is a self-directed trading utility, not an investment adviser. It does not recommend trades.

## Hard Boundaries

- Live trading is disabled by default.
- Order review is unavailable.
- Order placement is unavailable.
- Cancel order is unavailable.
- Options execution is unsupported and future-gated.
- Generic confirmations such as `yes`, `do it`, `confirmed`, or `execute` are rejected.
- Exact confirmation phrase and code remain required for mock submission and future execution readiness.
- The execution kill switch is active by default.
- No plaintext API keys, broker credentials, MCP URLs, account IDs, raw MCP output, or auth config are committed.

## Safety Gates

The execution package includes reusable gates for future readiness:

- Live trading false default.
- Per-order notional placeholder.
- Ticker/symbol ambiguity.
- Quote freshness placeholder.
- Buying power placeholder.
- Tradability placeholder.
- Market-hours warning placeholder.
- Supported asset class.
- Unsupported options gate.
- Generic confirmation rejection.
- Exact confirmation phrase/code.
- Kill switch/emergency disable.
- Terms accepted placeholder.
- Live mode opt-in placeholder.
- Market orders disabled by default for future live execution.

All gates currently block live execution. Some gates allow dry-run/manual handoff so developers can inspect the workflow without enabling broker writes.

## Audit And Receipts

Audit and receipt outputs must stay redacted. They may include plan IDs, ticket IDs, lifecycle state, safe gate IDs, and non-sensitive command summaries. They must not include:

- Real account IDs or account numbers.
- Real order IDs or raw broker identifiers.
- Portfolio values, holdings, buying power, or raw positions from real accounts.
- Raw MCP output, MCP URLs, tokens, auth config, API keys, or credentials.
- Raw audio or generated audio artifacts.

Every dry-run, mock receipt, and blocked live event must state: `No live broker order was placed.`
