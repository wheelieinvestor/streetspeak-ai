import { describe, expect, it } from "vitest";
import { createEquityOrderTicket } from "@streetspeak-ai/orders";
import {
  callRobinhoodMcpReadOnlyTool,
  createMockBrokerAdapter,
  createRobinhoodMcpReadOnlyAdapter,
  createRobinhoodReadOnlyAdapter,
  createRobinhoodReadOnlyFixtureAdapter,
  formatMockPortfolio,
  getMockPortfolio,
  getMockQuote,
  redactRobinhoodMcpReadOnlyPayload,
  runRobinhoodMcpReadOnlySmokeTest,
  ROBINHOOD_MCP_BLOCKED_TOOLS,
  ROBINHOOD_MCP_READ_ONLY_TOOL_ALLOWLIST,
  type BrokerReadResult,
  type RobinhoodMcpReadOnlyClient,
  type RobinhoodMcpReadOnlyToolName
} from "./index.js";

describe("broker adapters", () => {
  it("only exposes mock review behavior in the initial scaffold", async () => {
    const adapter = createMockBrokerAdapter();
    const ticket = createTicket();
    const review = await adapter.reviewOrder(ticket);

    expect(review.adapter).toBe("mock");
    expect(review.liveExecutionAvailable).toBe(false);
    expect(review.acceptedForMockSubmission).toBe(true);
  });

  it("reports capabilities without live execution support", () => {
    const adapter = createMockBrokerAdapter();

    expect(adapter.getCapabilities()).toEqual({
      adapter: "mock",
      mode: "mock",
      activeScopes: ["mock"],
      unavailableScopes: [
        "read_only",
        "future_order_review",
        "future_live_execution"
      ],
      liveExecutionAvailable: false,
      supportsLiveExecution: false,
      requiresCredentials: false,
      supportedAssetClasses: ["equity"],
      supportedOrderTypes: ["market", "limit"],
      capabilities: [
        "review_order",
        "submit_mock_order",
        "view_mock_portfolio",
        "view_mock_quote"
      ]
    });
  });

  it("looks up static mock quotes without real market data", () => {
    expect(getMockQuote("nvda")).toEqual({
      ok: true,
      quote: {
        symbol: "NVDA",
        last: 138.72,
        bid: 138.7,
        ask: 138.75,
        currency: "USD",
        asOf: "2026-01-02T14:30:00.000Z",
        source: "mock_static",
        label: "MOCK STATIC QUOTE - not real market data"
      }
    });
  });

  it("rejects unsupported symbols instead of calling market data APIs", () => {
    expect(getMockQuote("MSFT")).toEqual({
      ok: false,
      symbol: "MSFT",
      reason: "unsupported_mock_symbol",
      message:
        "StreetSpeak AI v0.1 only includes mock static quotes for HOOD, SPY, NVDA, AAPL, and SOFI."
    });
  });

  it("returns a static mock portfolio summary", () => {
    const portfolio = getMockPortfolio();

    expect(portfolio).toMatchObject({
      accountLabel: "StreetSpeak Mock Portfolio",
      cash: 12500,
      buyingPower: 12500,
      source: "mock_static",
      label: "MOCK PORTFOLIO - not a broker account"
    });
    expect(formatMockPortfolio(portfolio)).toContain(
      "$12,500.00 mock buying power"
    );
    expect(formatMockPortfolio(portfolio)).toContain("12 HOOD");
  });

  it("can submit only a mock order record", async () => {
    const adapter = createMockBrokerAdapter({
      idFactory: () => "mock-order-1",
      now: () => new Date("2026-01-01T00:00:00.000Z")
    });
    const submission = await adapter.submitMockOrder(createTicket());

    expect(submission).toEqual({
      id: "mock-order-1",
      adapter: "mock",
      ticketId: "ticket-1",
      submittedAt: "2026-01-01T00:00:00.000Z",
      liveExecutionAvailable: false,
      status: "mock_submitted",
      message: "Mock submission recorded. No live broker order was placed."
    });
  });

  it("keeps the Robinhood read-only scaffold disabled by default", async () => {
    const adapter = createRobinhoodReadOnlyAdapter();

    expect(adapter.getCapabilities()).toEqual({
      adapter: "robinhood_read_only",
      mode: "read_only",
      activeScopes: ["read_only"],
      unavailableScopes: ["future_order_review", "future_live_execution"],
      liveExecutionAvailable: false,
      supportsLiveExecution: false,
      requiresCredentials: false,
      supportedAssetClasses: ["equity"],
      supportedOrderTypes: [],
      capabilities: [
        "view_account_summary",
        "view_portfolio",
        "view_buying_power",
        "view_positions",
        "view_equity_quote",
        "view_order_history",
        "check_tradability",
        "search_symbols"
      ]
    });
    expect(adapter.getStatus()).toMatchObject({
      adapter: "robinhood_read_only",
      mode: "read_only",
      state: "disabled",
      liveExecutionAvailable: false,
      orderReviewAvailable: false,
      orderPlacementAvailable: false,
      cancelOrderAvailable: false,
      requiresCredentials: false,
      transport: "none"
    });
    expect(await adapter.getAccountSummary()).toEqual({
      ok: false,
      error: {
        code: "adapter_disabled",
        message:
          "Robinhood read-only scaffold is disabled by default and has no MCP transport, broker login, or live connection.",
        retryable: false
      }
    });
  });

  it("pins the Robinhood MCP read-only tool allowlist and blocks mutation tools", async () => {
    const calls: RobinhoodMcpReadOnlyToolName[] = [];
    const client: RobinhoodMcpReadOnlyClient = {
      async callTool(toolName) {
        calls.push(toolName);
        return {};
      }
    };

    expect(ROBINHOOD_MCP_READ_ONLY_TOOL_ALLOWLIST).toEqual([
      "get_accounts",
      "get_portfolio",
      "get_equity_positions",
      "get_equity_quotes",
      "get_equity_orders",
      "get_equity_tradability",
      "search"
    ]);
    expect(ROBINHOOD_MCP_BLOCKED_TOOLS).toEqual([
      "review_equity_order",
      "place_equity_order",
      "cancel_equity_order"
    ]);

    await expect(
      callRobinhoodMcpReadOnlyTool(client, "review_equity_order", {})
    ).rejects.toThrow("blocked");
    await expect(
      callRobinhoodMcpReadOnlyTool(client, "place_equity_order", {})
    ).rejects.toThrow("blocked");
    await expect(
      callRobinhoodMcpReadOnlyTool(client, "cancel_equity_order", {})
    ).rejects.toThrow("blocked");
    expect(calls).toEqual([]);

    await expect(
      callRobinhoodMcpReadOnlyTool(client, "get_accounts", {})
    ).resolves.toEqual({});
    expect(calls).toEqual(["get_accounts"]);
  });

  it("normalizes Robinhood MCP read-only data without exposing raw account or order identifiers", async () => {
    const calls: readonly RobinhoodMcpReadOnlyToolName[] = [];
    const calledTools: RobinhoodMcpReadOnlyToolName[] = [];
    const client: RobinhoodMcpReadOnlyClient = {
      async callTool(toolName) {
        calledTools.push(toolName);

        switch (toolName) {
          case "get_accounts":
            return {
              accounts: [
                {
                  accountId: "raw-identifier-from-client-not-returned",
                  accountNumber: "raw-number-from-client-not-returned",
                  account_type: "individual",
                  status: "active",
                  updated_at: "2026-01-01T00:00:00.000Z"
                }
              ]
            };
          case "get_portfolio":
            return {
              portfolio: {
                account: "raw-account-reference-from-client-not-returned",
                total_equity_value: "1000.50",
                buying_power: "250.25",
                cash_available: "125.00",
                updated_at: "2026-01-01T00:01:00.000Z"
              }
            };
          case "get_equity_positions":
            return {
              positions: [
                {
                  account_id: "raw-identifier-from-client-not-returned",
                  symbol: "HOOD",
                  quantity: "2",
                  average_cost: "10",
                  market_value: "44.96",
                  updated_at: "2026-01-01T00:02:00.000Z"
                }
              ]
            };
          case "get_equity_quotes":
            return {
              quotes: [
                {
                  symbol: "HOOD",
                  last_price: "22.48",
                  bid_price: "22.46",
                  ask_price: "22.50",
                  updated_at: "2026-01-01T00:03:00.000Z"
                }
              ]
            };
          case "get_equity_orders":
            return {
              orders: [
                {
                  id: "raw-order-reference-from-client-not-returned",
                  symbol: "HOOD",
                  side: "buy",
                  quantity: "2",
                  type: "market",
                  status: "filled",
                  submitted_at: "2026-01-01T00:04:00.000Z",
                  average_fill_price: "22.48"
                }
              ]
            };
          case "get_equity_tradability":
            return {
              tradability: {
                symbol: "HOOD",
                tradable: true,
                updated_at: "2026-01-01T00:05:00.000Z"
              }
            };
          case "search":
            return {
              results: [
                {
                  symbol: "HOOD",
                  name: "Robinhood Markets Inc.",
                  tradable: true
                }
              ]
            };
        }

        return {};
      }
    };
    const adapter = createRobinhoodMcpReadOnlyAdapter({
      client,
      now: () => new Date("2026-01-01T00:06:00.000Z")
    });

    expect(adapter.getStatus()).toMatchObject({
      state: "available",
      transport: "externally_managed_mcp",
      credentialsManagement: "externally_managed",
      credentialsStoredByStreetSpeak: false,
      rawAccountIdentifiersExposed: false,
      liveExecutionAvailable: false,
      orderReviewAvailable: false,
      orderPlacementAvailable: false,
      cancelOrderAvailable: false
    });
    expect(adapter.getCapabilities().supportedOrderTypes).toEqual([]);
    expect(adapter.getCapabilities().capabilities).not.toContain(
      "review_order"
    );
    expect(adapter.getCapabilities().capabilities).not.toContain(
      "submit_mock_order"
    );

    const accounts = unwrap(await adapter.getAccounts());
    expect(accounts).toEqual([
      expect.objectContaining({
        accountLabel: "Robinhood account 1 (identifier redacted)",
        accountType: "individual",
        status: "active",
        source: "robinhood_mcp_read_only",
        accountIdentifierRedacted: true
      })
    ]);

    const portfolio = unwrap(await adapter.getPortfolioSnapshot());
    expect(portfolio).toMatchObject({
      accountLabel: "Robinhood portfolio (account identifier redacted)",
      totalEquityValue: 1000.5,
      accountIdentifierRedacted: true,
      source: "robinhood_mcp_read_only",
      buyingPower: {
        cashAvailable: 125,
        buyingPower: 250.25,
        source: "robinhood_mcp_read_only"
      }
    });

    const positions = unwrap(await adapter.getPositions());
    expect(positions).toEqual([
      expect.objectContaining({
        symbol: "HOOD",
        quantity: 2,
        averageCost: 10,
        marketValue: 44.96,
        source: "robinhood_mcp_read_only"
      })
    ]);

    const quote = unwrap(await adapter.getEquityQuote("hood"));
    expect(quote).toMatchObject({
      symbol: "HOOD",
      last: 22.48,
      bid: 22.46,
      ask: 22.5,
      source: "robinhood_mcp_read_only"
    });

    const orders = unwrap(await adapter.getOrderHistory());
    expect(orders).toEqual([
      expect.objectContaining({
        id: "redacted-order-1",
        symbol: "HOOD",
        side: "buy",
        quantity: 2,
        averageFillPrice: 22.48,
        rawOrderIdentifierRedacted: true,
        source: "robinhood_mcp_read_only"
      })
    ]);

    const tradability = unwrap(await adapter.getTradability("HOOD"));
    expect(tradability).toMatchObject({
      symbol: "HOOD",
      tradable: true,
      reason: "mcp_tradable",
      source: "robinhood_mcp_read_only"
    });

    const searchResults = unwrap(await adapter.searchSymbols("hood"));
    expect(searchResults).toEqual([
      {
        symbol: "HOOD",
        name: "Robinhood Markets Inc.",
        assetClass: "equity",
        tradable: true,
        source: "robinhood_mcp_read_only"
      }
    ]);

    const normalizedJson = JSON.stringify({
      accounts,
      portfolio,
      positions,
      quote,
      orders,
      tradability,
      searchResults
    });
    expect(normalizedJson).not.toContain(
      "raw-identifier-from-client-not-returned"
    );
    expect(normalizedJson).not.toContain("raw-number-from-client-not-returned");
    expect(normalizedJson).not.toContain(
      "raw-order-reference-from-client-not-returned"
    );
    expect(calledTools).toEqual([
      ...calls,
      "get_accounts",
      "get_portfolio",
      "get_equity_positions",
      "get_equity_quotes",
      "get_equity_orders",
      "get_equity_tradability",
      "search"
    ]);
  });

  it("exposes no order review, placement, staging, or cancel methods on the Robinhood read-only scaffold", () => {
    const adapter = createRobinhoodReadOnlyFixtureAdapter();
    const maybeActionAdapter = adapter as unknown as Record<string, unknown>;

    expect(maybeActionAdapter.reviewOrder).toBeUndefined();
    expect(maybeActionAdapter.submitOrder).toBeUndefined();
    expect(maybeActionAdapter.submitMockOrder).toBeUndefined();
    expect(maybeActionAdapter.placeOrder).toBeUndefined();
    expect(maybeActionAdapter.stageOrder).toBeUndefined();
    expect(maybeActionAdapter.cancelOrder).toBeUndefined();
    expect(adapter.getCapabilities().capabilities).not.toContain(
      "review_order"
    );
    expect(adapter.getCapabilities().capabilities).not.toContain(
      "submit_mock_order"
    );
  });

  it("returns Robinhood read-only fixture account, portfolio, position, quote, tradability, and search data", async () => {
    const adapter = createRobinhoodReadOnlyFixtureAdapter();

    expect(adapter.getStatus()).toMatchObject({
      state: "fixture_only",
      liveExecutionAvailable: false,
      orderReviewAvailable: false,
      orderPlacementAvailable: false,
      cancelOrderAvailable: false,
      requiresCredentials: false,
      transport: "none"
    });

    const account = unwrap(await adapter.getAccountSummary());
    expect(account).toMatchObject({
      broker: "robinhood",
      accountLabel: "StreetSpeak Robinhood Read-Only Fixture Account",
      source: "fixture_static",
      label: "ROBINHOOD READ-ONLY FIXTURE - not real account data"
    });

    const portfolio = unwrap(await adapter.getPortfolioSnapshot());
    expect(portfolio.buyingPower).toMatchObject({
      buyingPower: 1250,
      source: "fixture_static"
    });
    expect(portfolio.positions).toHaveLength(3);

    const positions = unwrap(await adapter.getPositions());
    expect(positions.map((position) => position.symbol)).toEqual([
      "HOOD",
      "AAPL",
      "NVDA"
    ]);

    const position = unwrap(await adapter.getEquityPosition("hood"));
    expect(position).toMatchObject({
      symbol: "HOOD",
      quantity: 4,
      source: "fixture_static"
    });

    const quote = unwrap(await adapter.getEquityQuote("aapl"));
    expect(quote).toMatchObject({
      symbol: "AAPL",
      last: 175.32,
      source: "fixture_static",
      label: "ROBINHOOD READ-ONLY FIXTURE QUOTE - not real market data"
    });

    const orderHistory = unwrap(await adapter.getOrderHistory());
    expect(orderHistory).toHaveLength(2);
    const firstOrderHistoryItem = orderHistory[0];
    expect(firstOrderHistoryItem).toBeDefined();
    expect(firstOrderHistoryItem).toMatchObject({
      id: "fixture-order-1",
      symbol: "HOOD",
      status: "filled",
      label: "ROBINHOOD READ-ONLY FIXTURE ORDER HISTORY - not a real order"
    });

    const tradability = unwrap(await adapter.getTradability("HOOD"));
    expect(tradability).toMatchObject({
      symbol: "HOOD",
      tradable: true,
      reason: "fixture_tradable",
      source: "fixture_static"
    });

    const missingTradability = unwrap(await adapter.getTradability("MSFT"));
    expect(missingTradability).toMatchObject({
      symbol: "MSFT",
      tradable: false,
      reason: "symbol_not_found"
    });

    const searchResults = unwrap(await adapter.searchSymbols("hood"));
    expect(searchResults).toEqual([
      {
        symbol: "HOOD",
        name: "Robinhood Markets Inc.",
        assetClass: "equity",
        tradableInFixture: true,
        tradable: true,
        source: "fixture_static"
      }
    ]);
  });

  it("does not require secrets, API keys, credentials, or a Robinhood MCP connection for fixture reads", async () => {
    const adapter = createRobinhoodReadOnlyFixtureAdapter();

    expect(adapter.getCapabilities().requiresCredentials).toBe(false);
    expect(adapter.getStatus()).toMatchObject({
      requiresCredentials: false,
      transport: "none",
      state: "fixture_only"
    });
    expect(unwrap(await adapter.getBuyingPower())).toMatchObject({
      buyingPower: 1250,
      source: "fixture_static"
    });
  });

  it("creates a safe unavailable Robinhood MCP smoke summary by default", async () => {
    const summary = await runRobinhoodMcpReadOnlySmokeTest();

    expect(summary).toMatchObject({
      kind: "robinhood_mcp_read_only_smoke_test",
      status: "unavailable",
      source: "robinhood_mcp_read_only",
      liveExecutionAvailable: false,
      orderReviewAvailable: false,
      orderPlacementAvailable: false,
      cancelOrderAvailable: false,
      rawPayloadIncluded: false
    });
    expect(summary.lines).toHaveLength(7);
    expect(summary.lines[0]).toBe("get_accounts: unavailable/unconfigured");
    expect(JSON.stringify(summary)).not.toContain("account-placeholder-123");
  });

  it("redacts sensitive Robinhood MCP payload fields before smoke summaries", () => {
    const redacted = redactRobinhoodMcpReadOnlyPayload({
      accountId: "account-placeholder-123",
      accountNumber: "account-number-placeholder",
      orderId: "order-placeholder-123",
      portfolioValue: 123456,
      buyingPower: 5000,
      positions: [{ symbol: "HOOD", marketValue: 44.96 }],
      quote: { symbol: "HOOD", last_price: 22.48, bid_price: 22.46 },
      headers: { authorization: "Bearer placeholder" },
      rawPayload: { account_id: "nested-account-placeholder" },
      token: "placeholder"
    });

    expect(redacted).toEqual({
      accountId: "[REDACTED]",
      accountNumber: "[REDACTED]",
      orderId: "[REDACTED]",
      portfolioValue: "[REDACTED]",
      buyingPower: "[REDACTED]",
      positions: "[REDACTED]",
      quote: {
        symbol: "HOOD",
        last_price: "[REDACTED]",
        bid_price: "[REDACTED]"
      },
      headers: { authorization: "[REDACTED]" },
      rawPayload: "[REDACTED]",
      token: "[REDACTED]"
    });
  });

  it("creates redacted smoke summaries for allowed read-only MCP tools only", async () => {
    const calledTools: RobinhoodMcpReadOnlyToolName[] = [];
    const client: RobinhoodMcpReadOnlyClient = {
      async callTool(toolName) {
        calledTools.push(toolName);
        switch (toolName) {
          case "get_accounts":
            return { accounts: [{ accountId: "account-placeholder-123" }] };
          case "get_portfolio":
            return { portfolio: { portfolioValue: 123456, buyingPower: 5000 } };
          case "get_equity_positions":
            return { positions: [{ symbol: "HOOD", marketValue: 44.96 }] };
          case "get_equity_quotes":
            return { quotes: [{ symbol: "HOOD", last_price: 22.48 }] };
          case "get_equity_orders":
            return { orders: [{ orderId: "order-placeholder-123" }] };
          case "get_equity_tradability":
            return { tradability: { symbol: "HOOD", tradable: true } };
          case "search":
            return { results: [{ symbol: "HOOD" }] };
        }
      }
    };

    const summary = await runRobinhoodMcpReadOnlySmokeTest({ client });

    expect(calledTools).toEqual(ROBINHOOD_MCP_READ_ONLY_TOOL_ALLOWLIST);
    expect(summary.status).toBe("available");
    expect(summary.lines).toEqual([
      "get_accounts: success, count=1, identifiers redacted",
      "get_portfolio: success, values redacted",
      "get_equity_positions: success, count=1, values redacted",
      "get_equity_quotes: success, sample symbol checked, prices redacted",
      "get_equity_orders: success, count=1, identifiers redacted",
      "get_equity_tradability: success, boolean result only if safe",
      "search: success, count=1"
    ]);
    expect(JSON.stringify(summary)).not.toContain("account-placeholder-123");
    expect(JSON.stringify(summary)).not.toContain("order-placeholder-123");
    expect(JSON.stringify(summary)).not.toContain("123456");
    expect(summary.liveExecutionAvailable).toBe(false);
    expect(summary.orderReviewAvailable).toBe(false);
    expect(summary.orderPlacementAvailable).toBe(false);
    expect(summary.cancelOrderAvailable).toBe(false);
  });
});

function unwrap<T>(result: BrokerReadResult<T>): T {
  if (!result.ok) {
    throw new Error(result.error.message);
  }

  return result.data;
}

function createTicket() {
  const result = createEquityOrderTicket(
    {
      symbol: "AAPL",
      side: "buy",
      quantity: 1,
      type: "market"
    },
    {
      id: "ticket-1",
      now: new Date("2026-01-01T00:00:00.000Z")
    }
  );

  if (!result.ok) {
    throw new Error("expected valid order ticket");
  }

  return result.ticket;
}
