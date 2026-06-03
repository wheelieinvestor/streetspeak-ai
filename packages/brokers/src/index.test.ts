import { describe, expect, it } from "vitest";
import { createEquityOrderTicket } from "@streetspeak-ai/orders";
import {
  createMockBrokerAdapter,
  formatMockPortfolio,
  getMockPortfolio,
  getMockQuote
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
      liveExecutionAvailable: false,
      supportsLiveExecution: false,
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
});

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
