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
export type BrokerDataSource =
  | "mock_static"
  | "fixture_static"
  | "robinhood_mcp_read_only";
export type RobinhoodReadOnlyDataSource = Extract<
  BrokerDataSource,
  "fixture_static" | "robinhood_mcp_read_only"
>;
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
export type BrokerConnectionState =
  | "disabled"
  | "fixture_only"
  | "unconfigured"
  | "available"
  | "unavailable";
export type BrokerTransport = "none" | "externally_managed_mcp";
export type BrokerCredentialManagement =
  | "not_applicable"
  | "externally_managed";
export type BrokerAdapterErrorCode =
  | "adapter_disabled"
  | "mcp_unconfigured"
  | "mcp_tool_blocked"
  | "mcp_tool_unavailable"
  | "mcp_normalization_failed"
  | "unsupported_symbol"
  | "fixture_not_found";
export type EquityOrderHistoryStatus =
  | "filled"
  | "cancelled"
  | "rejected"
  | "expired"
  | "queued"
  | "open"
  | "partially_filled"
  | "unknown";
export type TradabilityReason =
  | "fixture_tradable"
  | "mcp_tradable"
  | "mcp_not_tradable"
  | "mcp_read_only"
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
  readonly credentialsManagement: BrokerCredentialManagement;
  readonly credentialsStoredByStreetSpeak: false;
  readonly rawAccountIdentifiersExposed: false;
  readonly transport: BrokerTransport;
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
  readonly accountType: string;
  readonly status: string;
  readonly currency: "USD";
  readonly asOf: string;
  readonly source: RobinhoodReadOnlyDataSource;
  readonly label: string;
  readonly accountIdentifierRedacted: true;
}

export interface BrokerBuyingPower {
  readonly cashAvailable: number;
  readonly buyingPower: number;
  readonly currency: "USD";
  readonly asOf: string;
  readonly source: RobinhoodReadOnlyDataSource;
  readonly label: string;
}

export interface EquityPosition {
  readonly symbol: string;
  readonly quantity: number;
  readonly averageCost: number;
  readonly marketValue: number;
  readonly mockMarketValue: number;
  readonly currency: "USD";
  readonly asOf: string;
  readonly source: RobinhoodReadOnlyDataSource;
}

export interface BrokerPortfolioSnapshot {
  readonly broker: "robinhood";
  readonly accountLabel: string;
  readonly totalEquityValue: number;
  readonly currency: "USD";
  readonly asOf: string;
  readonly source: RobinhoodReadOnlyDataSource;
  readonly label: string;
  readonly accountIdentifierRedacted: true;
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
  readonly source: RobinhoodReadOnlyDataSource;
  readonly label: string;
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
  readonly source: RobinhoodReadOnlyDataSource;
  readonly label: string;
  readonly rawOrderIdentifierRedacted: true;
}

export interface TradabilityResult {
  readonly symbol: string;
  readonly assetClass: "equity";
  readonly tradable: boolean;
  readonly reason: TradabilityReason;
  readonly message: string;
  readonly asOf: string;
  readonly source: RobinhoodReadOnlyDataSource;
}

export interface SymbolSearchResult {
  readonly symbol: string;
  readonly name: string;
  readonly assetClass: "equity";
  readonly tradableInFixture?: boolean;
  readonly tradable: boolean;
  readonly source: RobinhoodReadOnlyDataSource;
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

export type RobinhoodMcpReadOnlyToolName =
  | "get_accounts"
  | "get_portfolio"
  | "get_equity_positions"
  | "get_equity_quotes"
  | "get_equity_orders"
  | "get_equity_tradability"
  | "search";

export type RobinhoodMcpBlockedToolName =
  | "review_equity_order"
  | "place_equity_order"
  | "cancel_equity_order";

export const ROBINHOOD_MCP_READ_ONLY_TOOL_ALLOWLIST: readonly RobinhoodMcpReadOnlyToolName[] =
  [
    "get_accounts",
    "get_portfolio",
    "get_equity_positions",
    "get_equity_quotes",
    "get_equity_orders",
    "get_equity_tradability",
    "search"
  ];

export const ROBINHOOD_MCP_BLOCKED_TOOLS: readonly RobinhoodMcpBlockedToolName[] =
  ["review_equity_order", "place_equity_order", "cancel_equity_order"];

export interface RobinhoodMcpReadOnlyClient {
  readonly label?: string;
  callTool(
    toolName: RobinhoodMcpReadOnlyToolName,
    input?: Readonly<Record<string, unknown>>
  ): Promise<unknown>;
}

export interface RobinhoodMcpReadOnlyAdapterOptions {
  readonly client?: RobinhoodMcpReadOnlyClient;
  readonly now?: () => Date;
}

export interface RobinhoodReadOnlyAdapter {
  readonly kind: "robinhood_read_only";
  getCapabilities(): BrokerCapabilities;
  getStatus(): BrokerAdapterStatus;
  getAccounts(): Promise<BrokerReadResult<readonly BrokerAccountSummary[]>>;
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
    marketValue: 89.92,
    mockMarketValue: 89.92,
    currency: "USD",
    asOf: ROBINHOOD_FIXTURE_AS_OF,
    source: "fixture_static"
  },
  {
    symbol: "AAPL",
    quantity: 2,
    averageCost: 150,
    marketValue: 350.64,
    mockMarketValue: 350.64,
    currency: "USD",
    asOf: ROBINHOOD_FIXTURE_AS_OF,
    source: "fixture_static"
  },
  {
    symbol: "NVDA",
    quantity: 1,
    averageCost: 120,
    marketValue: 138.72,
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
    label: "ROBINHOOD READ-ONLY FIXTURE - not real account data",
    accountIdentifierRedacted: true
  },
  portfolioSnapshot: {
    broker: "robinhood",
    accountLabel: "StreetSpeak Robinhood Read-Only Fixture Account",
    totalEquityValue: 1829.28,
    currency: "USD",
    asOf: ROBINHOOD_FIXTURE_AS_OF,
    source: "fixture_static",
    label: "ROBINHOOD READ-ONLY FIXTURE PORTFOLIO - not a broker account",
    accountIdentifierRedacted: true,
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
      label: "ROBINHOOD READ-ONLY FIXTURE ORDER HISTORY - not a real order",
      rawOrderIdentifierRedacted: true
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
      label: "ROBINHOOD READ-ONLY FIXTURE ORDER HISTORY - not a real order",
      rawOrderIdentifierRedacted: true
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
      tradable: true,
      source: "fixture_static"
    },
    {
      symbol: "AAPL",
      name: "Apple Inc.",
      assetClass: "equity",
      tradableInFixture: true,
      tradable: true,
      source: "fixture_static"
    },
    {
      symbol: "NVDA",
      name: "NVIDIA Corp.",
      assetClass: "equity",
      tradableInFixture: true,
      tradable: true,
      source: "fixture_static"
    },
    {
      symbol: "SPY",
      name: "SPDR S&P 500 ETF Trust",
      assetClass: "equity",
      tradableInFixture: false,
      tradable: false,
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
      credentialsManagement: "not_applicable",
      credentialsStoredByStreetSpeak: false,
      rawAccountIdentifiersExposed: false,
      transport: "none",
      message:
        state === "fixture_only"
          ? "Robinhood read-only scaffold is serving static fixtures only. No MCP transport or broker connection exists."
          : "Robinhood read-only scaffold is disabled by default. Enable fixture reads explicitly for local tests only.",
      errors: state === "fixture_only" ? [] : [createAdapterDisabledError()]
    };
  }

  async getAccounts(): Promise<
    BrokerReadResult<readonly BrokerAccountSummary[]>
  > {
    return this.readFixture([this.fixtures.accountSummary]);
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

export class RobinhoodMcpReadOnlyAdapter implements RobinhoodReadOnlyAdapter {
  readonly kind = "robinhood_read_only";
  private readonly client?: RobinhoodMcpReadOnlyClient;
  private readonly now: () => Date;

  constructor(options: RobinhoodMcpReadOnlyAdapterOptions = {}) {
    this.client = options.client;
    this.now = options.now ?? (() => new Date());
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
    const state: BrokerConnectionState = this.client
      ? "available"
      : "unconfigured";

    return {
      adapter: this.kind,
      mode: "read_only",
      state,
      liveExecutionAvailable: false,
      orderReviewAvailable: false,
      orderPlacementAvailable: false,
      cancelOrderAvailable: false,
      requiresCredentials: false,
      credentialsManagement: "externally_managed",
      credentialsStoredByStreetSpeak: false,
      rawAccountIdentifiersExposed: false,
      transport: "externally_managed_mcp",
      message:
        state === "available"
          ? "Robinhood MCP read-only client is externally configured. StreetSpeak stores no credentials and exposes no order review, placement, cancel, or live execution methods."
          : "Robinhood MCP read-only client is not configured. Configure MCP outside StreetSpeak AI; do not add broker login fields, API keys, tokens, or MCP URLs here.",
      errors: state === "available" ? [] : [createMcpUnconfiguredError()]
    };
  }

  async getAccounts(): Promise<
    BrokerReadResult<readonly BrokerAccountSummary[]>
  > {
    return this.readFromMcp("get_accounts", undefined, normalizeMcpAccounts);
  }

  async getAccountSummary(): Promise<BrokerReadResult<BrokerAccountSummary>> {
    const accounts = await this.getAccounts();

    if (!accounts.ok) {
      return accounts;
    }

    const firstAccount = accounts.data[0];

    if (!firstAccount) {
      return {
        ok: false,
        error: createMcpNormalizationError("get_accounts")
      };
    }

    return {
      ok: true,
      data: firstAccount
    };
  }

  async getPortfolioSnapshot(): Promise<
    BrokerReadResult<BrokerPortfolioSnapshot>
  > {
    return this.readFromMcp(
      "get_portfolio",
      undefined,
      normalizeMcpPortfolioSnapshot
    );
  }

  async getBuyingPower(): Promise<BrokerReadResult<BrokerBuyingPower>> {
    const portfolio = await this.getPortfolioSnapshot();

    if (!portfolio.ok) {
      return portfolio;
    }

    return {
      ok: true,
      data: portfolio.data.buyingPower
    };
  }

  async getPositions(): Promise<BrokerReadResult<readonly EquityPosition[]>> {
    return this.readFromMcp(
      "get_equity_positions",
      undefined,
      normalizeMcpPositions
    );
  }

  async getEquityPosition(
    symbol: string
  ): Promise<BrokerReadResult<EquityPosition>> {
    const normalizedSymbol = normalizeSymbol(symbol);
    const positions = await this.getPositions();

    if (!positions.ok) {
      return positions;
    }

    const position = positions.data.find(
      (candidate) => candidate.symbol === normalizedSymbol
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
    const normalizedSymbol = normalizeSymbol(symbol);

    return this.readFromMcp(
      "get_equity_quotes",
      { symbols: [normalizedSymbol] },
      (raw, asOf) => normalizeMcpQuote(raw, normalizedSymbol, asOf)
    );
  }

  async getOrderHistory(): Promise<
    BrokerReadResult<readonly EquityOrderHistoryItem[]>
  > {
    return this.readFromMcp(
      "get_equity_orders",
      undefined,
      normalizeMcpOrderHistory
    );
  }

  async getTradability(
    symbol: string
  ): Promise<BrokerReadResult<TradabilityResult>> {
    const normalizedSymbol = normalizeSymbol(symbol);

    return this.readFromMcp(
      "get_equity_tradability",
      { symbol: normalizedSymbol },
      (raw, asOf) => normalizeMcpTradability(raw, normalizedSymbol, asOf)
    );
  }

  async searchSymbols(
    query: string
  ): Promise<BrokerReadResult<readonly SymbolSearchResult[]>> {
    return this.readFromMcp(
      "search",
      { query: query.trim() },
      normalizeMcpSymbolSearchResults
    );
  }

  private async readFromMcp<T>(
    toolName: RobinhoodMcpReadOnlyToolName,
    input: Readonly<Record<string, unknown>> | undefined,
    normalize: (raw: unknown, asOf: string) => T
  ): Promise<BrokerReadResult<T>> {
    if (!this.client) {
      return {
        ok: false,
        error: createMcpUnconfiguredError()
      };
    }

    try {
      const raw = await callRobinhoodMcpReadOnlyTool(
        this.client,
        toolName,
        input
      );

      return {
        ok: true,
        data: normalize(raw, this.now().toISOString())
      };
    } catch (error) {
      return {
        ok: false,
        error: createMcpToolError(toolName, error)
      };
    }
  }
}

class RobinhoodMcpBlockedToolError extends Error {
  readonly code = "mcp_tool_blocked" as const;

  constructor(readonly toolName: string) {
    super(
      `Robinhood MCP tool ${toolName} is blocked in StreetSpeak AI read-only mode.`
    );
  }
}

export function isRobinhoodMcpReadOnlyToolName(
  toolName: string
): toolName is RobinhoodMcpReadOnlyToolName {
  return ROBINHOOD_MCP_READ_ONLY_TOOL_ALLOWLIST.includes(
    toolName as RobinhoodMcpReadOnlyToolName
  );
}

export function assertRobinhoodMcpReadOnlyToolName(
  toolName: string
): asserts toolName is RobinhoodMcpReadOnlyToolName {
  if (!isRobinhoodMcpReadOnlyToolName(toolName)) {
    throw new RobinhoodMcpBlockedToolError(toolName);
  }
}

export async function callRobinhoodMcpReadOnlyTool(
  client: RobinhoodMcpReadOnlyClient,
  toolName: string,
  input?: Readonly<Record<string, unknown>>
): Promise<unknown> {
  assertRobinhoodMcpReadOnlyToolName(toolName);

  return client.callTool(toolName, input);
}

export type RobinhoodMcpSmokeToolStatus = "success" | "unavailable" | "failed";

export interface RobinhoodMcpSmokeToolSummary {
  readonly toolName: RobinhoodMcpReadOnlyToolName;
  readonly status: RobinhoodMcpSmokeToolStatus;
  readonly summary: string;
  readonly count?: number;
  readonly identifiersRedacted?: true;
  readonly valuesRedacted?: true;
  readonly pricesRedacted?: true;
  readonly booleanResult?: boolean;
  readonly error?: string;
}

export interface RobinhoodMcpSmokeTestSummary {
  readonly kind: "robinhood_mcp_read_only_smoke_test";
  readonly status: "available" | "unavailable" | "partial_failure";
  readonly source: "robinhood_mcp_read_only";
  readonly liveExecutionAvailable: false;
  readonly orderReviewAvailable: false;
  readonly orderPlacementAvailable: false;
  readonly cancelOrderAvailable: false;
  readonly rawPayloadIncluded: false;
  readonly toolSummaries: readonly RobinhoodMcpSmokeToolSummary[];
  readonly lines: readonly string[];
}

export interface RobinhoodMcpSmokeTestOptions {
  readonly client?: RobinhoodMcpReadOnlyClient;
  readonly quoteSymbol?: string;
  readonly tradabilitySymbol?: string;
  readonly searchQuery?: string;
}

const SENSITIVE_MCP_KEY_PATTERN =
  /^(account|account_id|accountid|account_number|accountnumber|account_url|accounturl|accountIdentifier|brokerAccountId|brokerAccountIdentifier|order_id|orderid|orderId|brokerOrderId|rawOrderIdentifier|portfolio|portfolio_value|portfolioValue|total_equity_value|totalEquityValue|equity|buying_power|buyingPower|cash|cash_available|cashAvailable|holdings|positions|last_price|lastPrice|bid_price|bidPrice|ask_price|askPrice|mark_price|markPrice|price|authorization|accessToken|refreshToken|sessionToken|token|secret|password|credential|apiKey|api_key|raw|rawPayload|mcpPayload)$/i;

export function redactRobinhoodMcpReadOnlyPayload(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => redactRobinhoodMcpReadOnlyPayload(item));
  }

  if (!isUnknownRecord(value)) {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => [
      key,
      SENSITIVE_MCP_KEY_PATTERN.test(key)
        ? "[REDACTED]"
        : redactRobinhoodMcpReadOnlyPayload(entry)
    ])
  );
}

export async function runRobinhoodMcpReadOnlySmokeTest(
  options: RobinhoodMcpSmokeTestOptions = {}
): Promise<RobinhoodMcpSmokeTestSummary> {
  if (!options.client) {
    const toolSummaries = ROBINHOOD_MCP_READ_ONLY_TOOL_ALLOWLIST.map(
      (toolName): RobinhoodMcpSmokeToolSummary => ({
        toolName,
        status: "unavailable",
        summary: `${toolName}: unavailable/unconfigured`
      })
    );

    return createSmokeSummary(toolSummaries);
  }

  const toolSummaries: RobinhoodMcpSmokeToolSummary[] = [];
  toolSummaries.push(await summarizeSmokeCall(options.client, "get_accounts"));
  toolSummaries.push(await summarizeSmokeCall(options.client, "get_portfolio"));
  toolSummaries.push(
    await summarizeSmokeCall(options.client, "get_equity_positions")
  );
  toolSummaries.push(
    await summarizeSmokeCall(options.client, "get_equity_quotes", {
      symbol: normalizeSmokeSymbol(options.quoteSymbol ?? "HOOD")
    })
  );
  toolSummaries.push(
    await summarizeSmokeCall(options.client, "get_equity_orders")
  );
  toolSummaries.push(
    await summarizeSmokeCall(options.client, "get_equity_tradability", {
      symbol: normalizeSmokeSymbol(options.tradabilitySymbol ?? "HOOD")
    })
  );
  toolSummaries.push(
    await summarizeSmokeCall(options.client, "search", {
      query: (options.searchQuery ?? "hood").trim()
    })
  );

  return createSmokeSummary(toolSummaries);
}

async function summarizeSmokeCall(
  client: RobinhoodMcpReadOnlyClient,
  toolName: RobinhoodMcpReadOnlyToolName,
  input?: Readonly<Record<string, unknown>>
): Promise<RobinhoodMcpSmokeToolSummary> {
  try {
    const raw = await callRobinhoodMcpReadOnlyTool(client, toolName, input);
    const redacted = redactRobinhoodMcpReadOnlyPayload(raw);
    return createSmokeToolSuccessSummary(toolName, redacted);
  } catch (error) {
    return {
      toolName,
      status: "failed",
      summary: `${toolName}: failed, error redacted`,
      error: error instanceof Error ? error.name : "UnknownError"
    };
  }
}

function createSmokeToolSuccessSummary(
  toolName: RobinhoodMcpReadOnlyToolName,
  redactedPayload: unknown
): RobinhoodMcpSmokeToolSummary {
  const count = countSmokeRecords(redactedPayload);

  switch (toolName) {
    case "get_accounts":
      return {
        toolName,
        status: "success",
        count,
        identifiersRedacted: true,
        summary: `get_accounts: success, count=${count}, identifiers redacted`
      };
    case "get_portfolio":
      return {
        toolName,
        status: "success",
        valuesRedacted: true,
        summary: "get_portfolio: success, values redacted"
      };
    case "get_equity_positions":
      return {
        toolName,
        status: "success",
        count,
        valuesRedacted: true,
        summary: `get_equity_positions: success, count=${count}, values redacted`
      };
    case "get_equity_quotes":
      return {
        toolName,
        status: "success",
        pricesRedacted: true,
        summary:
          "get_equity_quotes: success, sample symbol checked, prices redacted"
      };
    case "get_equity_orders":
      return {
        toolName,
        status: "success",
        count,
        identifiersRedacted: true,
        summary: `get_equity_orders: success, count=${count}, identifiers redacted`
      };
    case "get_equity_tradability":
      return {
        toolName,
        status: "success",
        booleanResult: readSmokeTradabilityBoolean(redactedPayload),
        summary: "get_equity_tradability: success, boolean result only if safe"
      };
    case "search":
      return {
        toolName,
        status: "success",
        count,
        summary: `search: success, count=${count}`
      };
  }
}

function createSmokeSummary(
  toolSummaries: readonly RobinhoodMcpSmokeToolSummary[]
): RobinhoodMcpSmokeTestSummary {
  const failed = toolSummaries.some((summary) => summary.status === "failed");
  const available = toolSummaries.some(
    (summary) => summary.status === "success"
  );

  return {
    kind: "robinhood_mcp_read_only_smoke_test",
    status: failed
      ? "partial_failure"
      : available
        ? "available"
        : "unavailable",
    source: "robinhood_mcp_read_only",
    liveExecutionAvailable: false,
    orderReviewAvailable: false,
    orderPlacementAvailable: false,
    cancelOrderAvailable: false,
    rawPayloadIncluded: false,
    toolSummaries,
    lines: toolSummaries.map((summary) => summary.summary)
  };
}

function countSmokeRecords(redactedPayload: unknown): number {
  const records = extractRecords(redactedPayload, [
    "accounts",
    "positions",
    "quotes",
    "orders",
    "results",
    "data",
    "items"
  ]);

  return records.length;
}

function readSmokeTradabilityBoolean(
  redactedPayload: unknown
): boolean | undefined {
  const record = extractFirstRecord(redactedPayload, [
    "tradability",
    "result",
    "data"
  ]);
  const value = findValue(record, ["tradable", "is_tradable", "can_trade"]);

  return typeof value === "boolean" ? value : undefined;
}

function normalizeSmokeSymbol(symbol: string): string {
  return symbol.trim().toUpperCase();
}

function normalizeMcpAccounts(
  raw: unknown,
  fallbackAsOf: string
): readonly BrokerAccountSummary[] {
  const records = extractRecords(raw, ["accounts", "results", "data", "items"]);

  return records.map((record, index) => ({
    broker: "robinhood",
    accountLabel: `Robinhood account ${index + 1} (identifier redacted)`,
    accountType:
      readString(record, ["account_type", "type", "accountType"]) ?? "unknown",
    status: readString(record, ["status", "state"]) ?? "read_only_available",
    currency: "USD",
    asOf: readDate(record, fallbackAsOf),
    source: "robinhood_mcp_read_only",
    label:
      "ROBINHOOD MCP READ-ONLY ACCOUNT - account identifier redacted by StreetSpeak AI",
    accountIdentifierRedacted: true
  }));
}

function normalizeMcpPortfolioSnapshot(
  raw: unknown,
  fallbackAsOf: string
): BrokerPortfolioSnapshot {
  const record = extractFirstRecord(raw, [
    "portfolio",
    "portfolios",
    "result",
    "data"
  ]);
  const totalEquityValue =
    readNumber(record, [
      "total_equity_value",
      "total_equity",
      "equity",
      "equity_value",
      "portfolio_value",
      "market_value",
      "total_market_value"
    ]) ?? 0;
  const cashAvailable =
    readNumber(record, [
      "cash_available",
      "cash",
      "withdrawable_cash",
      "cashHeldForOrders"
    ]) ?? 0;
  const buyingPower =
    readNumber(record, [
      "buying_power",
      "buyingPower",
      "equity_buying_power",
      "available_buying_power"
    ]) ?? cashAvailable;
  const positionsRecord = findValue(record, ["positions", "equity_positions"]);
  const positions =
    positionsRecord === undefined
      ? []
      : normalizeMcpPositions(positionsRecord, fallbackAsOf);
  const asOf = readDate(record, fallbackAsOf);

  return {
    broker: "robinhood",
    accountLabel: "Robinhood portfolio (account identifier redacted)",
    totalEquityValue,
    currency: "USD",
    asOf,
    source: "robinhood_mcp_read_only",
    label:
      "ROBINHOOD MCP READ-ONLY PORTFOLIO - account identifier redacted; values are in-memory only",
    accountIdentifierRedacted: true,
    buyingPower: {
      cashAvailable,
      buyingPower,
      currency: "USD",
      asOf,
      source: "robinhood_mcp_read_only",
      label: "ROBINHOOD MCP READ-ONLY BUYING POWER - in-memory display only"
    },
    positions
  };
}

function normalizeMcpPositions(
  raw: unknown,
  fallbackAsOf: string
): readonly EquityPosition[] {
  const records = extractRecords(raw, [
    "positions",
    "equity_positions",
    "results",
    "data",
    "items"
  ]);

  return records.flatMap((record) => {
    const symbol = readSymbol(record);

    if (!symbol) {
      return [];
    }

    const marketValue =
      readNumber(record, [
        "market_value",
        "marketValue",
        "equity_value",
        "value",
        "current_value"
      ]) ?? 0;

    return [
      {
        symbol,
        quantity:
          readNumber(record, ["quantity", "shares", "shares_held"]) ?? 0,
        averageCost:
          readNumber(record, [
            "average_cost",
            "averageCost",
            "avg_cost",
            "average_buy_price",
            "cost_basis"
          ]) ?? 0,
        marketValue,
        mockMarketValue: marketValue,
        currency: "USD",
        asOf: readDate(record, fallbackAsOf),
        source: "robinhood_mcp_read_only"
      }
    ];
  });
}

function normalizeMcpQuote(
  raw: unknown,
  requestedSymbol: string,
  fallbackAsOf: string
): EquityQuote {
  const records = extractRecords(raw, [
    "quotes",
    "equity_quotes",
    "results",
    "data",
    "items"
  ]);
  const record =
    records.find((candidate) => readSymbol(candidate) === requestedSymbol) ??
    records[0] ??
    {};

  return {
    symbol: readSymbol(record) ?? requestedSymbol,
    last:
      readNumber(record, [
        "last",
        "last_price",
        "lastTradePrice",
        "last_trade_price",
        "mark_price",
        "price"
      ]) ?? 0,
    bid: readNumber(record, ["bid", "bid_price", "bidPrice"]) ?? 0,
    ask: readNumber(record, ["ask", "ask_price", "askPrice"]) ?? 0,
    currency: "USD",
    asOf: readDate(record, fallbackAsOf),
    source: "robinhood_mcp_read_only",
    label:
      "ROBINHOOD MCP READ-ONLY QUOTE - real read-only market data, in-memory only"
  };
}

function normalizeMcpOrderHistory(
  raw: unknown,
  fallbackAsOf: string
): readonly EquityOrderHistoryItem[] {
  const records = extractRecords(raw, [
    "orders",
    "equity_orders",
    "results",
    "data",
    "items"
  ]);

  return records.flatMap((record, index) => {
    const symbol = readSymbol(record);

    if (!symbol) {
      return [];
    }

    const averageFillPrice = readNumber(record, [
      "average_fill_price",
      "averageFillPrice",
      "avg_fill_price",
      "filled_avg_price",
      "price"
    ]);
    const item: EquityOrderHistoryItem = {
      id: `redacted-order-${index + 1}`,
      symbol,
      side: normalizeOrderSide(readString(record, ["side", "direction"])),
      quantity:
        readNumber(record, [
          "quantity",
          "cumulative_quantity",
          "filled_quantity",
          "shares"
        ]) ?? 0,
      type: normalizeOrderType(readString(record, ["type", "order_type"])),
      status: normalizeOrderStatus(readString(record, ["status", "state"])),
      submittedAt: readDate(
        record,
        fallbackAsOf,
        "submitted_at",
        "created_at",
        "createdAt",
        "updated_at"
      ),
      currency: "USD",
      source: "robinhood_mcp_read_only",
      label:
        "ROBINHOOD MCP READ-ONLY ORDER HISTORY - raw order identifier redacted",
      rawOrderIdentifierRedacted: true
    };
    const filledAt = readDateOrUndefined(record, [
      "filled_at",
      "filledAt",
      "last_transaction_at"
    ]);

    return [
      {
        ...item,
        ...(filledAt === undefined ? {} : { filledAt }),
        ...(averageFillPrice === undefined ? {} : { averageFillPrice })
      }
    ];
  });
}

function normalizeMcpTradability(
  raw: unknown,
  requestedSymbol: string,
  fallbackAsOf: string
): TradabilityResult {
  const record =
    extractRecords(raw, ["tradability", "results", "data", "items"])[0] ?? {};
  const tradable =
    readBoolean(record, [
      "tradable",
      "is_tradable",
      "can_trade",
      "fractional_tradability"
    ]) ?? false;

  return {
    symbol: readSymbol(record) ?? requestedSymbol,
    assetClass: "equity",
    tradable,
    reason: tradable ? "mcp_tradable" : "mcp_not_tradable",
    message:
      "Robinhood MCP read-only tradability check. This does not enable order review, order placement, cancel order, or live execution.",
    asOf: readDate(record, fallbackAsOf),
    source: "robinhood_mcp_read_only"
  };
}

function normalizeMcpSymbolSearchResults(
  raw: unknown,
  fallbackAsOf: string
): readonly SymbolSearchResult[] {
  void fallbackAsOf;
  const records = extractRecords(raw, [
    "results",
    "symbols",
    "instruments",
    "data",
    "items"
  ]);

  return records.flatMap((record) => {
    const symbol = readSymbol(record);

    if (!symbol) {
      return [];
    }

    return [
      {
        symbol,
        name:
          readString(record, ["name", "simple_name", "simpleName"]) ??
          "Name unavailable",
        assetClass: "equity",
        tradable:
          readBoolean(record, ["tradable", "is_tradable", "can_trade"]) ??
          false,
        source: "robinhood_mcp_read_only"
      }
    ];
  });
}

function extractFirstRecord(
  raw: unknown,
  keys: readonly string[]
): UnknownRecord {
  return extractRecords(raw, keys)[0] ?? {};
}

function extractRecords(
  raw: unknown,
  keys: readonly string[]
): readonly UnknownRecord[] {
  const payload = unwrapMcpResponse(raw);

  if (Array.isArray(payload)) {
    return payload.flatMap((item) => extractRecordsFromValue(item, keys));
  }

  return extractRecordsFromValue(payload, keys);
}

function extractRecordsFromValue(
  value: unknown,
  keys: readonly string[]
): readonly UnknownRecord[] {
  if (Array.isArray(value)) {
    return value.flatMap((item) => extractRecordsFromValue(item, keys));
  }

  if (!isUnknownRecord(value)) {
    return [];
  }

  for (const key of keys) {
    const child = findValue(value, [key]);

    if (child !== undefined) {
      const childRecords = extractRecordsFromValue(child, keys);

      if (childRecords.length > 0) {
        return childRecords;
      }
    }
  }

  return [value];
}

function unwrapMcpResponse(raw: unknown): unknown {
  if (!isUnknownRecord(raw)) {
    return raw;
  }

  const structuredContent = raw.structuredContent;

  if (structuredContent !== undefined) {
    return structuredContent;
  }

  const content = raw.content;

  if (Array.isArray(content)) {
    const parsed = content.flatMap((item) => {
      if (!isUnknownRecord(item) || typeof item.text !== "string") {
        return [];
      }

      return [parseMaybeJson(item.text)];
    });

    if (parsed.length === 1) {
      return parsed[0];
    }

    if (parsed.length > 1) {
      return parsed;
    }
  }

  if (raw.result !== undefined) {
    return raw.result;
  }

  return raw;
}

function parseMaybeJson(value: string): unknown {
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return value;
  }
}

type UnknownRecord = Record<string, unknown>;

function isUnknownRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function findValue(
  record: UnknownRecord,
  keys: readonly string[]
): unknown | undefined {
  const normalizedKeys = keys.map(normalizeRecordKey);

  for (const [key, value] of Object.entries(record)) {
    if (normalizedKeys.includes(normalizeRecordKey(key))) {
      return value;
    }
  }

  for (const wrapperKey of ["instrument", "asset", "security", "quote"]) {
    const nested = record[wrapperKey];

    if (isUnknownRecord(nested)) {
      const value = findValue(nested, keys);

      if (value !== undefined) {
        return value;
      }
    }
  }

  return undefined;
}

function normalizeRecordKey(key: string): string {
  return key.toLowerCase().replaceAll("_", "").replaceAll("-", "");
}

function readString(
  record: UnknownRecord,
  keys: readonly string[]
): string | undefined {
  const value = findValue(record, keys);

  if (typeof value === "string") {
    const trimmed = value.trim();

    return trimmed ? trimmed : undefined;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  return undefined;
}

function readSymbol(record: UnknownRecord): string | undefined {
  const symbol = readString(record, [
    "symbol",
    "ticker",
    "trading_symbol",
    "tradingSymbol"
  ]);

  return symbol?.trim().toUpperCase();
}

function readNumber(
  record: UnknownRecord,
  keys: readonly string[]
): number | undefined {
  const value = findValue(record, keys);

  return coerceNumber(value);
}

function coerceNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number.parseFloat(value.replace(/[$,]/gu, ""));

    return Number.isFinite(parsed) ? parsed : undefined;
  }

  if (isUnknownRecord(value)) {
    return coerceNumber(value.amount ?? value.value);
  }

  return undefined;
}

function readBoolean(
  record: UnknownRecord,
  keys: readonly string[]
): boolean | undefined {
  const value = findValue(record, keys);

  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();

    if (["true", "yes", "tradable", "active"].includes(normalized)) {
      return true;
    }

    if (["false", "no", "not_tradable", "inactive"].includes(normalized)) {
      return false;
    }
  }

  return undefined;
}

function readDate(
  record: UnknownRecord,
  fallbackAsOf: string,
  ...preferredKeys: readonly string[]
): string {
  return (
    readDateOrUndefined(record, [
      ...preferredKeys,
      "as_of",
      "asOf",
      "updated_at",
      "updatedAt",
      "created_at",
      "createdAt"
    ]) ?? fallbackAsOf
  );
}

function readDateOrUndefined(
  record: UnknownRecord,
  keys: readonly string[]
): string | undefined {
  const value = readString(record, keys);

  if (!value) {
    return undefined;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return undefined;
  }

  return date.toISOString();
}

function normalizeOrderSide(value: string | undefined): EquityOrderSide {
  return value?.trim().toLowerCase() === "sell" ? "sell" : "buy";
}

function normalizeOrderType(value: string | undefined): EquityOrderType {
  return value?.trim().toLowerCase() === "limit" ? "limit" : "market";
}

function normalizeOrderStatus(
  value: string | undefined
): EquityOrderHistoryStatus {
  const normalized = value?.trim().toLowerCase().replaceAll("-", "_");

  if (normalized === "cancelled" || normalized === "canceled") {
    return "cancelled";
  }

  if (
    normalized === "filled" ||
    normalized === "rejected" ||
    normalized === "expired" ||
    normalized === "queued" ||
    normalized === "open" ||
    normalized === "partially_filled"
  ) {
    return normalized;
  }

  return "unknown";
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

export function createRobinhoodMcpReadOnlyAdapter(
  options: RobinhoodMcpReadOnlyAdapterOptions = {}
): RobinhoodReadOnlyAdapter {
  return new RobinhoodMcpReadOnlyAdapter(options);
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

function createMcpUnconfiguredError(): BrokerAdapterError {
  return {
    code: "mcp_unconfigured",
    message:
      "Robinhood MCP read-only client is not configured. StreetSpeak AI stores no MCP URL, token, broker credential, or Robinhood login state.",
    retryable: false
  };
}

function createMcpToolError(
  toolName: RobinhoodMcpReadOnlyToolName,
  error: unknown
): BrokerAdapterError {
  if (error instanceof RobinhoodMcpBlockedToolError) {
    return {
      code: "mcp_tool_blocked",
      message:
        "Robinhood MCP mutation/order tools are blocked in StreetSpeak AI read-only mode.",
      retryable: false
    };
  }

  return {
    code: "mcp_tool_unavailable",
    message: `Robinhood MCP read-only tool ${toolName} is unavailable or returned an unreadable response. Raw broker data was not retained.`,
    retryable: false
  };
}

function createMcpNormalizationError(
  toolName: RobinhoodMcpReadOnlyToolName
): BrokerAdapterError {
  return {
    code: "mcp_normalization_failed",
    message: `Robinhood MCP read-only tool ${toolName} returned no normalizable redacted data. Raw broker data was not retained.`,
    retryable: false
  };
}

function createUnsupportedSymbolError(
  symbol: string,
  fixtureKind: "position" | "quote"
): BrokerAdapterError {
  return {
    code: "unsupported_symbol",
    message: `${symbol} is not present in the Robinhood read-only ${fixtureKind} data. No order review, order placement, cancel order, or live execution was attempted.`,
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
