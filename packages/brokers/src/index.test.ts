import { describe, expect, it } from "vitest";
import { createEquityOrderTicket } from "@streetspeak-ai/orders";
import {
  createMockBrokerAdapter,
  createRobinhoodReadOnlyAdapter,
  createRobinhoodReadOnlyFixtureAdapter,
  formatMockPortfolio,
  getMockPortfolio,
  getMockQuote,
  type BrokerReadResult
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
