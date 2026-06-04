import {
  createRobinhoodReadOnlyAdapter,
  createRobinhoodReadOnlyFixtureAdapter,
  ROBINHOOD_READ_ONLY_FIXTURES,
  type BrokerAccountSummary,
  type BrokerAdapterStatus,
  type BrokerBuyingPower,
  type BrokerPortfolioSnapshot,
  type BrokerReadResult,
  type EquityOrderHistoryItem,
  type EquityPosition,
  type EquityQuote,
  type SymbolSearchResult,
  type TradabilityResult
} from "@streetspeak-ai/brokers";

export interface V01MockDemoStatusItem {
  readonly label: string;
  readonly status: string;
  readonly detail: string;
}

export interface RobinhoodFixtureExplorerModel {
  readonly disabledStatus: BrokerAdapterStatus;
  readonly fixtureStatus: BrokerAdapterStatus;
  readonly credentialFieldsRequired: readonly string[];
  readonly accountSummary: BrokerAccountSummary;
  readonly buyingPower: BrokerBuyingPower;
  readonly portfolioSnapshot: BrokerPortfolioSnapshot;
  readonly positions: readonly EquityPosition[];
  readonly quoteLookup: {
    readonly query: string;
    readonly quote: EquityQuote;
  };
  readonly orderHistory: readonly EquityOrderHistoryItem[];
  readonly tradabilityChecks: readonly TradabilityResult[];
  readonly symbolSearch: {
    readonly query: string;
    readonly results: readonly SymbolSearchResult[];
  };
  readonly education: readonly string[];
}

export const V01_MOCK_DEMO_STATUS: readonly V01MockDemoStatusItem[] = [
  {
    label: "Mock trading desk",
    status: "available",
    detail: "Typed and optional browser-native voice transcripts use mock data."
  },
  {
    label: "Browser voice input",
    status: "optional/browser-native",
    detail: "No StreetSpeak raw-audio storage or external voice API is used."
  },
  {
    label: "Audit timeline",
    status: "local browser storage",
    detail: "Redacted events stay in local browser storage."
  },
  {
    label: "Receipt export",
    status: "local only",
    detail: "Markdown and JSON exports are generated in the browser."
  },
  {
    label: "Robinhood fixture explorer",
    status: "fixture-only",
    detail: "Static read-only fixtures are shown without a broker connection."
  },
  {
    label: "Real Robinhood connection",
    status: "not active",
    detail: "Future read-only MCP support is a separate gated phase."
  },
  {
    label: "Order review",
    status: "not active",
    detail: "Robinhood order review is not implemented."
  },
  {
    label: "Live trading",
    status: "unavailable",
    detail: "No live broker order can be placed."
  }
];

const ROBINHOOD_FIXTURE_EDUCATION: readonly string[] = [
  "StreetSpeak AI is currently mock-first.",
  "The Robinhood panel is fixture-only and static.",
  "Real Robinhood read-only MCP connection is a future gated phase.",
  "Order review and live execution are separate future phases.",
  "No live broker order can be placed."
];

const DEFAULT_QUOTE_LOOKUP_SYMBOL = "HOOD";
const DEFAULT_SYMBOL_SEARCH_QUERY = "hood";
const TRADABILITY_FIXTURE_SYMBOLS = ["HOOD", "SPY"] as const;

export function createRobinhoodFixtureExplorerModel(): RobinhoodFixtureExplorerModel {
  const fixtureStatus = createRobinhoodReadOnlyFixtureAdapter().getStatus();
  const disabledStatus = createRobinhoodReadOnlyAdapter().getStatus();

  return {
    disabledStatus,
    fixtureStatus,
    credentialFieldsRequired: [],
    accountSummary: ROBINHOOD_READ_ONLY_FIXTURES.accountSummary,
    buyingPower: ROBINHOOD_READ_ONLY_FIXTURES.portfolioSnapshot.buyingPower,
    portfolioSnapshot: ROBINHOOD_READ_ONLY_FIXTURES.portfolioSnapshot,
    positions: ROBINHOOD_READ_ONLY_FIXTURES.portfolioSnapshot.positions,
    quoteLookup: {
      query: DEFAULT_QUOTE_LOOKUP_SYMBOL,
      quote: findFixtureQuote(DEFAULT_QUOTE_LOOKUP_SYMBOL)
    },
    orderHistory: ROBINHOOD_READ_ONLY_FIXTURES.orderHistory,
    tradabilityChecks: TRADABILITY_FIXTURE_SYMBOLS.map((symbol) =>
      findFixtureTradability(symbol)
    ),
    symbolSearch: {
      query: DEFAULT_SYMBOL_SEARCH_QUERY,
      results: searchFixtureSymbols(DEFAULT_SYMBOL_SEARCH_QUERY)
    },
    education: ROBINHOOD_FIXTURE_EDUCATION
  };
}

export function isSafeReadOnlyFixtureStatus(
  status: BrokerAdapterStatus
): boolean {
  return (
    status.transport === "none" &&
    status.requiresCredentials === false &&
    status.liveExecutionAvailable === false &&
    status.orderReviewAvailable === false &&
    status.orderPlacementAvailable === false &&
    status.cancelOrderAvailable === false
  );
}

export async function lookupRobinhoodFixtureQuote(
  symbol: string
): Promise<BrokerReadResult<EquityQuote>> {
  return createRobinhoodReadOnlyFixtureAdapter().getEquityQuote(symbol);
}

export async function checkRobinhoodFixtureTradability(
  symbol: string
): Promise<BrokerReadResult<TradabilityResult>> {
  return createRobinhoodReadOnlyFixtureAdapter().getTradability(symbol);
}

export async function searchRobinhoodFixtureSymbols(
  query: string
): Promise<BrokerReadResult<readonly SymbolSearchResult[]>> {
  return createRobinhoodReadOnlyFixtureAdapter().searchSymbols(query);
}

function findFixtureQuote(symbol: string): EquityQuote {
  const quote = ROBINHOOD_READ_ONLY_FIXTURES.quotes.find(
    (candidate) => candidate.symbol === symbol
  );

  if (!quote) {
    throw new Error(`Missing Robinhood fixture quote for ${symbol}`);
  }

  return quote;
}

function findFixtureTradability(symbol: string): TradabilityResult {
  const tradability = ROBINHOOD_READ_ONLY_FIXTURES.tradability.find(
    (candidate) => candidate.symbol === symbol
  );

  if (!tradability) {
    throw new Error(`Missing Robinhood fixture tradability for ${symbol}`);
  }

  return tradability;
}

function searchFixtureSymbols(query: string): readonly SymbolSearchResult[] {
  const normalizedQuery = query.trim().toUpperCase();

  if (!normalizedQuery) {
    return [];
  }

  return ROBINHOOD_READ_ONLY_FIXTURES.symbolSearchResults.filter(
    (result) =>
      result.symbol.includes(normalizedQuery) ||
      result.name.toUpperCase().includes(normalizedQuery)
  );
}
