import type {
  EquityOrderSide,
  EquityOrderTicket,
  EquityOrderType
} from "@streetspeak-ai/orders";

export type BrokerAdapterKind = "mock" | "robinhood_read_only";
export type BrokerAdapterMode = "mock" | "read_only";
export type BrokerCapabilityScope =
  | "mock"
  | "read_only"
  | "future_order_review"
  | "future_live_execution";
export type BrokerAssetClass = "equity";
export type BrokerDataSource = "mock_static" | "fixture_static";
export type BrokerMockCapability = "view_mock_portfolio" | "view_mock_quote";
export type BrokerOrderCapability = "review_order" | "submit_mock_order";
export type BrokerReadOnlyCapability =
  | "view_account_summary"
  | "view_portfolio"
  | "view_buying_power"
  | "view_positions"
  | "view_equity_quote"
  | "view_order_history"
  | "check_tradability"
  | "search_symbols";
export type BrokerCapability =
  | BrokerMockCapability
  | BrokerOrderCapability
  | BrokerReadOnlyCapability;
export type BrokerConnectionState = "disabled" | "fixture_only";
export type BrokerAdapterErrorCode =
  | "adapter_disabled"
  | "unsupported_symbol"
  | "fixture_not_found";
export type EquityOrderHistoryStatus =
  | "filled"
  | "cancelled"
  | "rejected"
  | "expired";
export type TradabilityReason =
  | "fixture_tradable"
  | "read_only_scope"
  | "symbol_not_found";

export interface BrokerAdapterError {
  readonly code: BrokerAdapterErrorCode;
  readonly message: string;
  readonly retryable: false;
}

export interface BrokerAdapterStatus {
  readonly adapter: BrokerAdapterKind;
  readonly mode: BrokerAdapterMode;
  readonly state: BrokerConnectionState;
  readonly liveExecutionAvailable: false;
  readonly orderReviewAvailable: false;
  readonly orderPlacementAvailable: false;
  readonly cancelOrderAvailable: false;
  readonly requiresCredentials: false;
  readonly transport: "none";
  readonly message: string;
  readonly errors: readonly BrokerAdapterError[];
}

export type BrokerReadResult<T> =
  | {
      readonly ok: true;
      readonly data: T;
    }
  | {
      readonly ok: false;
      readonly error: BrokerAdapterError;
    };

export interface BrokerAccountSummary {
  readonly broker: "robinhood";
  readonly accountLabel: string;
  readonly accountType: "fixture_individual";
  readonly status: "fixture_only";
  readonly currency: "USD";
  readonly asOf: string;
  readonly source: "fixture_static";
  readonly label: "ROBINHOOD READ-ONLY FIXTURE - not real account data";
}

export interface BrokerBuyingPower {
  readonly cashAvailable: number;
  readonly buyingPower: number;
  readonly currency: "USD";
  readonly asOf: string;
  readonly source: "fixture_static";
  readonly label: "ROBINHOOD READ-ONLY FIXTURE - not real buying power";
}

export interface EquityPosition {
  readonly symbol: string;
  readonly quantity: number;
  readonly averageCost: number;
  readonly mockMarketValue: number;
  readonly currency: "USD";
  readonly asOf: string;
  readonly source: "fixture_static";
}

export interface BrokerPortfolioSnapshot {
  readonly broker: "robinhood";
  readonly accountLabel: string;
  readonly totalEquityValue: number;
  readonly currency: "USD";
  readonly asOf: string;
  readonly source: "fixture_static";
  readonly label: "ROBINHOOD READ-ONLY FIXTURE PORTFOLIO - not a broker account";
  readonly buyingPower: BrokerBuyingPower;
  readonly positions: readonly EquityPosition[];
}

export interface EquityQuote {
  readonly symbol: string;
  readonly last: number;
  readonly bid: number;
  readonly ask: number;
  readonly currency: "USD";
  readonly asOf: string;
  readonly source: "fixture_static";
  readonly label: "ROBINHOOD READ-ONLY FIXTURE QUOTE - not real market data";
}

export interface EquityOrderHistoryItem {
  readonly id: string;
  readonly symbol: string;
  readonly side: EquityOrderSide;
  readonly quantity: number;
  readonly type: EquityOrderType;
  readonly status: EquityOrderHistoryStatus;
  readonly submittedAt: string;
  readonly filledAt?: string;
  readonly averageFillPrice?: number;
  readonly currency: "USD";
  readonly source: "fixture_static";
  readonly label: "ROBINHOOD READ-ONLY FIXTURE ORDER HISTORY - not a real order";
}

export interface TradabilityResult {
  readonly symbol: string;
  readonly assetClass: "equity";
  readonly tradable: boolean;
  readonly reason: TradabilityReason;
  readonly message: string;
  readonly asOf: string;
  readonly source: "fixture_static";
}

export interface SymbolSearchResult {
  readonly symbol: string;
  readonly name: string;
  readonly assetClass: "equity";
  readonly tradableInFixture: boolean;
  readonly source: "fixture_static";
}

export interface RobinhoodReadOnlyFixtures {
  readonly accountSummary: BrokerAccountSummary;
  readonly portfolioSnapshot: BrokerPortfolioSnapshot;
  readonly quotes: readonly EquityQuote[];
  readonly orderHistory: readonly EquityOrderHistoryItem[];
  readonly tradability: readonly TradabilityResult[];
  readonly symbolSearchResults: readonly SymbolSearchResult[];
}

export interface RobinhoodReadOnlyAdapterOptions {
  readonly fixtureReadsEnabled?: boolean;
  readonly fixtures?: RobinhoodReadOnlyFixtures;
}

export interface RobinhoodReadOnlyAdapter {
  readonly kind: "robinhood_read_only";
  getCapabilities(): BrokerCapabilities;
  getStatus(): BrokerAdapterStatus;
  getAccountSummary(): Promise<BrokerReadResult<BrokerAccountSummary>>;
  getPortfolioSnapshot(): Promise<BrokerReadResult<BrokerPortfolioSnapshot>>;
  getBuyingPower(): Promise<BrokerReadResult<BrokerBuyingPower>>;
  getPositions(): Promise<BrokerReadResult<readonly EquityPosition[]>>;
  getEquityPosition(symbol: string): Promise<BrokerReadResult<EquityPosition>>;
  getEquityQuote(symbol: string): Promise<BrokerReadResult<EquityQuote>>;
  getOrderHistory(): Promise<
    BrokerReadResult<readonly EquityOrderHistoryItem[]>
  >;
  getTradability(symbol: string): Promise<BrokerReadResult<TradabilityResult>>;
  searchSymbols(
    query: string
  ): Promise<BrokerReadResult<readonly SymbolSearchResult[]>>;
}

export type MockBrokerCapability = BrokerMockCapability | BrokerOrderCapability;

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
  readonly mode: BrokerAdapterMode;
  readonly activeScopes: readonly BrokerCapabilityScope[];
  readonly unavailableScopes: readonly BrokerCapabilityScope[];
  readonly liveExecutionAvailable: false;
  readonly supportsLiveExecution: false;
  readonly requiresCredentials: false;
  readonly supportedAssetClasses: readonly BrokerAssetClass[];
  readonly supportedOrderTypes: readonly EquityOrderTicket["type"][];
  readonly capabilities: readonly BrokerCapability[];
}

export interface BrokerOrderReview {
  readonly adapter: "mock";
  readonly ticket: EquityOrderTicket;
  readonly liveExecutionAvailable: false;
  readonly acceptedForMockSubmission: boolean;
  readonly message: string;
}

export interface MockBrokerSubmission {
  readonly id: string;
  readonly adapter: "mock";
  readonly ticketId: string;
  readonly submittedAt: string;
  readonly liveExecutionAvailable: false;
  readonly status: "mock_submitted";
  readonly message: string;
}

export interface BrokerAdapter {
  readonly kind: "mock";
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

const ROBINHOOD_FIXTURE_AS_OF = "2026-01-02T14:30:00.000Z";

const ROBINHOOD_FIXTURE_BUYING_POWER: BrokerBuyingPower = {
  cashAvailable: 1250,
  buyingPower: 1250,
  currency: "USD",
  asOf: ROBINHOOD_FIXTURE_AS_OF,
  source: "fixture_static",
  label: "ROBINHOOD READ-ONLY FIXTURE - not real buying power"
};

const ROBINHOOD_FIXTURE_POSITIONS: readonly EquityPosition[] = [
  {
    symbol: "HOOD",
    quantity: 4,
    averageCost: 18.5,
    mockMarketValue: 89.92,
    currency: "USD",
    asOf: ROBINHOOD_FIXTURE_AS_OF,
    source: "fixture_static"
  },
  {
    symbol: "AAPL",
    quantity: 2,
    averageCost: 150,
    mockMarketValue: 350.64,
    currency: "USD",
    asOf: ROBINHOOD_FIXTURE_AS_OF,
    source: "fixture_static"
  },
  {
    symbol: "NVDA",
    quantity: 1,
    averageCost: 120,
    mockMarketValue: 138.72,
    currency: "USD",
    asOf: ROBINHOOD_FIXTURE_AS_OF,
    source: "fixture_static"
  }
];

export const ROBINHOOD_READ_ONLY_FIXTURES: RobinhoodReadOnlyFixtures = {
  accountSummary: {
    broker: "robinhood",
    accountLabel: "StreetSpeak Robinhood Read-Only Fixture Account",
    accountType: "fixture_individual",
    status: "fixture_only",
    currency: "USD",
    asOf: ROBINHOOD_FIXTURE_AS_OF,
    source: "fixture_static",
    label: "ROBINHOOD READ-ONLY FIXTURE - not real account data"
  },
  portfolioSnapshot: {
    broker: "robinhood",
    accountLabel: "StreetSpeak Robinhood Read-Only Fixture Account",
    totalEquityValue: 1829.28,
    currency: "USD",
    asOf: ROBINHOOD_FIXTURE_AS_OF,
    source: "fixture_static",
    label: "ROBINHOOD READ-ONLY FIXTURE PORTFOLIO - not a broker account",
    buyingPower: ROBINHOOD_FIXTURE_BUYING_POWER,
    positions: ROBINHOOD_FIXTURE_POSITIONS
  },
  quotes: [
    {
      symbol: "HOOD",
      last: 22.48,
      bid: 22.46,
      ask: 22.5,
      currency: "USD",
      asOf: ROBINHOOD_FIXTURE_AS_OF,
      source: "fixture_static",
      label: "ROBINHOOD READ-ONLY FIXTURE QUOTE - not real market data"
    },
    {
      symbol: "AAPL",
      last: 175.32,
      bid: 175.28,
      ask: 175.36,
      currency: "USD",
      asOf: ROBINHOOD_FIXTURE_AS_OF,
      source: "fixture_static",
      label: "ROBINHOOD READ-ONLY FIXTURE QUOTE - not real market data"
    },
    {
      symbol: "NVDA",
      last: 138.72,
      bid: 138.7,
      ask: 138.75,
      currency: "USD",
      asOf: ROBINHOOD_FIXTURE_AS_OF,
      source: "fixture_static",
      label: "ROBINHOOD READ-ONLY FIXTURE QUOTE - not real market data"
    },
    {
      symbol: "SPY",
      last: 522.14,
      bid: 522.1,
      ask: 522.18,
      currency: "USD",
      asOf: ROBINHOOD_FIXTURE_AS_OF,
      source: "fixture_static",
      label: "ROBINHOOD READ-ONLY FIXTURE QUOTE - not real market data"
    }
  ],
  orderHistory: [
    {
      id: "fixture-order-1",
      symbol: "HOOD",
      side: "buy",
      quantity: 4,
      type: "market",
      status: "filled",
      submittedAt: "2025-12-15T15:35:00.000Z",
      filledAt: "2025-12-15T15:35:02.000Z",
      averageFillPrice: 18.5,
      currency: "USD",
      source: "fixture_static",
      label: "ROBINHOOD READ-ONLY FIXTURE ORDER HISTORY - not a real order"
    },
    {
      id: "fixture-order-2",
      symbol: "AAPL",
      side: "buy",
      quantity: 2,
      type: "limit",
      status: "filled",
      submittedAt: "2025-12-20T16:05:00.000Z",
      filledAt: "2025-12-20T16:08:12.000Z",
      averageFillPrice: 150,
      currency: "USD",
      source: "fixture_static",
      label: "ROBINHOOD READ-ONLY FIXTURE ORDER HISTORY - not a real order"
    }
  ],
  tradability: [
    {
      symbol: "HOOD",
      assetClass: "equity",
      tradable: true,
      reason: "fixture_tradable",
      message:
        "HOOD is tradable in the static read-only fixture. This is not real broker availability.",
      asOf: ROBINHOOD_FIXTURE_AS_OF,
      source: "fixture_static"
    },
    {
      symbol: "AAPL",
      assetClass: "equity",
      tradable: true,
      reason: "fixture_tradable",
      message:
        "AAPL is tradable in the static read-only fixture. This is not real broker availability.",
      asOf: ROBINHOOD_FIXTURE_AS_OF,
      source: "fixture_static"
    },
    {
      symbol: "NVDA",
      assetClass: "equity",
      tradable: true,
      reason: "fixture_tradable",
      message:
        "NVDA is tradable in the static read-only fixture. This is not real broker availability.",
      asOf: ROBINHOOD_FIXTURE_AS_OF,
      source: "fixture_static"
    },
    {
      symbol: "SPY",
      assetClass: "equity",
      tradable: false,
      reason: "read_only_scope",
      message:
        "SPY appears in quote fixtures only. Read-only checks do not enable order review or execution.",
      asOf: ROBINHOOD_FIXTURE_AS_OF,
      source: "fixture_static"
    }
  ],
  symbolSearchResults: [
    {
      symbol: "HOOD",
      name: "Robinhood Markets Inc.",
      assetClass: "equity",
      tradableInFixture: true,
      source: "fixture_static"
    },
    {
      symbol: "AAPL",
      name: "Apple Inc.",
      assetClass: "equity",
      tradableInFixture: true,
      source: "fixture_static"
    },
    {
      symbol: "NVDA",
      name: "NVIDIA Corp.",
      assetClass: "equity",
      tradableInFixture: true,
      source: "fixture_static"
    },
    {
      symbol: "SPY",
      name: "SPDR S&P 500 ETF Trust",
      assetClass: "equity",
      tradableInFixture: false,
      source: "fixture_static"
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

export class RobinhoodReadOnlyFixtureAdapter implements RobinhoodReadOnlyAdapter {
  readonly kind = "robinhood_read_only";
  private readonly fixtureReadsEnabled: boolean;
  private readonly fixtures: RobinhoodReadOnlyFixtures;

  constructor(options: RobinhoodReadOnlyAdapterOptions = {}) {
    this.fixtureReadsEnabled = options.fixtureReadsEnabled ?? false;
    this.fixtures = options.fixtures ?? ROBINHOOD_READ_ONLY_FIXTURES;
  }

  getCapabilities(): BrokerCapabilities {
    return {
      adapter: this.kind,
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
    };
  }

  getStatus(): BrokerAdapterStatus {
    const state = this.fixtureReadsEnabled ? "fixture_only" : "disabled";

    return {
      adapter: this.kind,
      mode: "read_only",
      state,
      liveExecutionAvailable: false,
      orderReviewAvailable: false,
      orderPlacementAvailable: false,
      cancelOrderAvailable: false,
      requiresCredentials: false,
      transport: "none",
      message:
        state === "fixture_only"
          ? "Robinhood read-only scaffold is serving static fixtures only. No MCP transport or broker connection exists."
          : "Robinhood read-only scaffold is disabled by default. Enable fixture reads explicitly for local tests only.",
      errors: state === "fixture_only" ? [] : [createAdapterDisabledError()]
    };
  }

  async getAccountSummary(): Promise<BrokerReadResult<BrokerAccountSummary>> {
    return this.readFixture(this.fixtures.accountSummary);
  }

  async getPortfolioSnapshot(): Promise<
    BrokerReadResult<BrokerPortfolioSnapshot>
  > {
    return this.readFixture(this.fixtures.portfolioSnapshot);
  }

  async getBuyingPower(): Promise<BrokerReadResult<BrokerBuyingPower>> {
    return this.readFixture(this.fixtures.portfolioSnapshot.buyingPower);
  }

  async getPositions(): Promise<BrokerReadResult<readonly EquityPosition[]>> {
    return this.readFixture(this.fixtures.portfolioSnapshot.positions);
  }

  async getEquityPosition(
    symbol: string
  ): Promise<BrokerReadResult<EquityPosition>> {
    if (!this.fixtureReadsEnabled) {
      return disabledReadResult();
    }

    const normalizedSymbol = normalizeSymbol(symbol);
    const position = this.fixtures.portfolioSnapshot.positions.find(
      (fixturePosition) => fixturePosition.symbol === normalizedSymbol
    );

    if (!position) {
      return {
        ok: false,
        error: createUnsupportedSymbolError(normalizedSymbol, "position")
      };
    }

    return {
      ok: true,
      data: position
    };
  }

  async getEquityQuote(symbol: string): Promise<BrokerReadResult<EquityQuote>> {
    if (!this.fixtureReadsEnabled) {
      return disabledReadResult();
    }

    const normalizedSymbol = normalizeSymbol(symbol);
    const quote = this.fixtures.quotes.find(
      (fixtureQuote) => fixtureQuote.symbol === normalizedSymbol
    );

    if (!quote) {
      return {
        ok: false,
        error: createUnsupportedSymbolError(normalizedSymbol, "quote")
      };
    }

    return {
      ok: true,
      data: quote
    };
  }

  async getOrderHistory(): Promise<
    BrokerReadResult<readonly EquityOrderHistoryItem[]>
  > {
    return this.readFixture(this.fixtures.orderHistory);
  }

  async getTradability(
    symbol: string
  ): Promise<BrokerReadResult<TradabilityResult>> {
    if (!this.fixtureReadsEnabled) {
      return disabledReadResult();
    }

    const normalizedSymbol = normalizeSymbol(symbol);
    const tradability = this.fixtures.tradability.find(
      (fixtureTradability) => fixtureTradability.symbol === normalizedSymbol
    );

    if (tradability) {
      return {
        ok: true,
        data: tradability
      };
    }

    return {
      ok: true,
      data: {
        symbol: normalizedSymbol,
        assetClass: "equity",
        tradable: false,
        reason: "symbol_not_found",
        message:
          "Symbol is not present in the Robinhood read-only fixture set. No live tradability lookup was attempted.",
        asOf: ROBINHOOD_FIXTURE_AS_OF,
        source: "fixture_static"
      }
    };
  }

  async searchSymbols(
    query: string
  ): Promise<BrokerReadResult<readonly SymbolSearchResult[]>> {
    if (!this.fixtureReadsEnabled) {
      return disabledReadResult();
    }

    const normalizedQuery = query.trim().toUpperCase();

    if (!normalizedQuery) {
      return {
        ok: true,
        data: []
      };
    }

    return {
      ok: true,
      data: this.fixtures.symbolSearchResults.filter(
        (result) =>
          result.symbol.includes(normalizedQuery) ||
          result.name.toUpperCase().includes(normalizedQuery)
      )
    };
  }

  private readFixture<T>(data: T): BrokerReadResult<T> {
    if (!this.fixtureReadsEnabled) {
      return disabledReadResult();
    }

    return {
      ok: true,
      data
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

export function createRobinhoodReadOnlyAdapter(
  options: RobinhoodReadOnlyAdapterOptions = {}
): RobinhoodReadOnlyAdapter {
  return new RobinhoodReadOnlyFixtureAdapter(options);
}

export function createRobinhoodReadOnlyFixtureAdapter(
  options: Omit<RobinhoodReadOnlyAdapterOptions, "fixtureReadsEnabled"> = {}
): RobinhoodReadOnlyAdapter {
  return new RobinhoodReadOnlyFixtureAdapter({
    ...options,
    fixtureReadsEnabled: true
  });
}

function isMockTickerSymbol(symbol: string): symbol is MockTickerSymbol {
  return Object.hasOwn(MOCK_QUOTES, symbol);
}

function normalizeSymbol(symbol: string): string {
  return symbol.trim().toUpperCase();
}

function disabledReadResult<T>(): BrokerReadResult<T> {
  return {
    ok: false,
    error: createAdapterDisabledError()
  };
}

function createAdapterDisabledError(): BrokerAdapterError {
  return {
    code: "adapter_disabled",
    message:
      "Robinhood read-only scaffold is disabled by default and has no MCP transport, broker login, or live connection.",
    retryable: false
  };
}

function createUnsupportedSymbolError(
  symbol: string,
  fixtureKind: "position" | "quote"
): BrokerAdapterError {
  return {
    code: "unsupported_symbol",
    message: `${symbol} is not present in the Robinhood read-only ${fixtureKind} fixtures. No live broker or market data lookup was attempted.`,
    retryable: false
  };
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
