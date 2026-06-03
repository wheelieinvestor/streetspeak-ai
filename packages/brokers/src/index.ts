import type { EquityOrderTicket } from "@streetspeak-ai/orders";

export type BrokerAdapterKind = "mock";
export type BrokerAssetClass = "equity";
export type BrokerOrderCapability =
  | "review_order"
  | "submit_mock_order"
  | "view_mock_portfolio"
  | "view_mock_quote";

export type MockTickerSymbol = "HOOD" | "SPY" | "NVDA" | "AAPL" | "SOFI";

export interface MockQuote {
  readonly symbol: MockTickerSymbol;
  readonly last: number;
  readonly bid: number;
  readonly ask: number;
  readonly currency: "USD";
  readonly asOf: string;
  readonly source: "mock_static";
  readonly label: "MOCK STATIC QUOTE - not real market data";
}

export interface MockPosition {
  readonly symbol: MockTickerSymbol;
  readonly quantity: number;
  readonly averageCost: number;
  readonly mockMarketValue: number;
  readonly currency: "USD";
}

export interface MockPortfolio {
  readonly accountLabel: "StreetSpeak Mock Portfolio";
  readonly cash: number;
  readonly buyingPower: number;
  readonly currency: "USD";
  readonly asOf: string;
  readonly source: "mock_static";
  readonly label: "MOCK PORTFOLIO - not a broker account";
  readonly positions: readonly MockPosition[];
}

export type MockQuoteLookupResult =
  | {
      readonly ok: true;
      readonly quote: MockQuote;
    }
  | {
      readonly ok: false;
      readonly symbol: string;
      readonly reason: "unsupported_mock_symbol";
      readonly message: string;
    };

export interface BrokerCapabilities {
  readonly adapter: BrokerAdapterKind;
  readonly mode: "mock";
  readonly liveExecutionAvailable: false;
  readonly supportsLiveExecution: false;
  readonly supportedAssetClasses: readonly BrokerAssetClass[];
  readonly supportedOrderTypes: readonly EquityOrderTicket["type"][];
  readonly capabilities: readonly BrokerOrderCapability[];
}

export interface BrokerOrderReview {
  readonly adapter: BrokerAdapterKind;
  readonly ticket: EquityOrderTicket;
  readonly liveExecutionAvailable: false;
  readonly acceptedForMockSubmission: boolean;
  readonly message: string;
}

export interface MockBrokerSubmission {
  readonly id: string;
  readonly adapter: BrokerAdapterKind;
  readonly ticketId: string;
  readonly submittedAt: string;
  readonly liveExecutionAvailable: false;
  readonly status: "mock_submitted";
  readonly message: string;
}

export interface BrokerAdapter {
  readonly kind: BrokerAdapterKind;
  getCapabilities(): BrokerCapabilities;
  getMockPortfolio(): MockPortfolio;
  getMockQuote(symbol: string): MockQuoteLookupResult;
  reviewOrder(ticket: EquityOrderTicket): Promise<BrokerOrderReview>;
  submitMockOrder(ticket: EquityOrderTicket): Promise<MockBrokerSubmission>;
}

export interface MockBrokerAdapterOptions {
  readonly idFactory?: () => string;
  readonly now?: () => Date;
}

const MOCK_AS_OF = "2026-01-02T14:30:00.000Z";

export const MOCK_QUOTES: Record<MockTickerSymbol, MockQuote> = {
  HOOD: {
    symbol: "HOOD",
    last: 22.48,
    bid: 22.46,
    ask: 22.5,
    currency: "USD",
    asOf: MOCK_AS_OF,
    source: "mock_static",
    label: "MOCK STATIC QUOTE - not real market data"
  },
  SPY: {
    symbol: "SPY",
    last: 522.14,
    bid: 522.1,
    ask: 522.18,
    currency: "USD",
    asOf: MOCK_AS_OF,
    source: "mock_static",
    label: "MOCK STATIC QUOTE - not real market data"
  },
  NVDA: {
    symbol: "NVDA",
    last: 138.72,
    bid: 138.7,
    ask: 138.75,
    currency: "USD",
    asOf: MOCK_AS_OF,
    source: "mock_static",
    label: "MOCK STATIC QUOTE - not real market data"
  },
  AAPL: {
    symbol: "AAPL",
    last: 175.32,
    bid: 175.28,
    ask: 175.36,
    currency: "USD",
    asOf: MOCK_AS_OF,
    source: "mock_static",
    label: "MOCK STATIC QUOTE - not real market data"
  },
  SOFI: {
    symbol: "SOFI",
    last: 8.64,
    bid: 8.63,
    ask: 8.65,
    currency: "USD",
    asOf: MOCK_AS_OF,
    source: "mock_static",
    label: "MOCK STATIC QUOTE - not real market data"
  }
};

export const MOCK_PORTFOLIO: MockPortfolio = {
  accountLabel: "StreetSpeak Mock Portfolio",
  cash: 12_500,
  buyingPower: 12_500,
  currency: "USD",
  asOf: MOCK_AS_OF,
  source: "mock_static",
  label: "MOCK PORTFOLIO - not a broker account",
  positions: [
    {
      symbol: "HOOD",
      quantity: 12,
      averageCost: 18.5,
      mockMarketValue: 269.76,
      currency: "USD"
    },
    {
      symbol: "SOFI",
      quantity: 40,
      averageCost: 7.4,
      mockMarketValue: 345.6,
      currency: "USD"
    },
    {
      symbol: "AAPL",
      quantity: 3,
      averageCost: 150,
      mockMarketValue: 525.96,
      currency: "USD"
    }
  ]
};

export class MockBrokerAdapter implements BrokerAdapter {
  readonly kind = "mock";

  constructor(private readonly options: MockBrokerAdapterOptions = {}) {}

  getCapabilities(): BrokerCapabilities {
    return {
      adapter: this.kind,
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
    };
  }

  getMockPortfolio(): MockPortfolio {
    return MOCK_PORTFOLIO;
  }

  getMockQuote(symbol: string): MockQuoteLookupResult {
    return getMockQuote(symbol);
  }

  async reviewOrder(ticket: EquityOrderTicket): Promise<BrokerOrderReview> {
    return {
      adapter: this.kind,
      ticket,
      liveExecutionAvailable: false,
      acceptedForMockSubmission: ticket.mode === "mock",
      message: "Mock review only. Live broker execution is not implemented."
    };
  }

  async submitMockOrder(
    ticket: EquityOrderTicket
  ): Promise<MockBrokerSubmission> {
    return {
      id: this.options.idFactory?.() ?? createMockId("mock-order"),
      adapter: this.kind,
      ticketId: ticket.id,
      submittedAt: (this.options.now?.() ?? new Date()).toISOString(),
      liveExecutionAvailable: false,
      status: "mock_submitted",
      message: "Mock submission recorded. No live broker order was placed."
    };
  }
}

export function getMockPortfolio(): MockPortfolio {
  return MOCK_PORTFOLIO;
}

export function getMockQuote(symbol: string): MockQuoteLookupResult {
  const normalizedSymbol = symbol.trim().toUpperCase();

  if (isMockTickerSymbol(normalizedSymbol)) {
    return {
      ok: true,
      quote: MOCK_QUOTES[normalizedSymbol]
    };
  }

  return {
    ok: false,
    symbol: normalizedSymbol,
    reason: "unsupported_mock_symbol",
    message:
      "StreetSpeak AI v0.1 only includes mock static quotes for HOOD, SPY, NVDA, AAPL, and SOFI."
  };
}

export function formatMockPortfolio(portfolio: MockPortfolio): string {
  const positions = portfolio.positions
    .map(
      (position) =>
        `${position.quantity} ${position.symbol} ($${position.mockMarketValue.toFixed(
          2
        )} mock value)`
    )
    .join(", ");

  return `${portfolio.accountLabel}: $${portfolio.buyingPower.toLocaleString(
    "en-US",
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }
  )} mock buying power. Positions: ${positions}.`;
}

export function createMockBrokerAdapter(
  options: MockBrokerAdapterOptions = {}
): BrokerAdapter {
  return new MockBrokerAdapter(options);
}

function isMockTickerSymbol(symbol: string): symbol is MockTickerSymbol {
  return Object.hasOwn(MOCK_QUOTES, symbol);
}

function createMockId(prefix: string): string {
  const randomUUID = globalThis.crypto?.randomUUID;

  if (typeof randomUUID === "function") {
    return randomUUID.call(globalThis.crypto);
  }

  return `${prefix}-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 10)}`;
}
