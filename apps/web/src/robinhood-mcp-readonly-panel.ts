import {
  createRobinhoodMcpReadOnlyAdapter,
  type BrokerAccountSummary,
  type BrokerAdapterStatus,
  type BrokerPortfolioSnapshot,
  type BrokerReadResult,
  type EquityOrderHistoryItem,
  type EquityPosition,
  type EquityQuote,
  type RobinhoodMcpReadOnlyClient,
  type SymbolSearchResult,
  type TradabilityResult
} from "@streetspeak-ai/brokers";
import {
  createRobinhoodReadOnlyAuditEvent,
  type AuditEvent,
  type RobinhoodReadOnlyAuditAction
} from "@streetspeak-ai/audit";

export interface BrowserRobinhoodMcpReadOnlyClientHost {
  readonly streetspeakRobinhoodMcpReadOnlyClient?: RobinhoodMcpReadOnlyClient;
}

export interface RobinhoodMcpReadOnlyPanelQuery {
  readonly quoteSymbol: string;
  readonly tradabilitySymbol: string;
  readonly searchQuery: string;
}

export interface RobinhoodMcpReadOnlyPanelModel {
  readonly kind: "real_robinhood_mcp_read_only";
  readonly source: "robinhood_mcp_read_only";
  readonly title: "Real Robinhood MCP Read-Only Connection";
  readonly readOnlyBadge: "Read-Only MCP";
  readonly storagePolicy: "in_memory_only";
  readonly credentialFieldsRequired: readonly [];
  readonly noOrderActions: true;
  readonly smokeStatus:
    | "unavailable_unconfigured"
    | "not_run"
    | "redacted_refresh_completed";
  readonly status: BrokerAdapterStatus;
  readonly query: RobinhoodMcpReadOnlyPanelQuery;
  readonly accountSummaries: readonly BrokerAccountSummary[];
  readonly portfolioSnapshot?: BrokerPortfolioSnapshot;
  readonly positions: readonly EquityPosition[];
  readonly quoteLookup?: EquityQuote;
  readonly orderHistory: readonly EquityOrderHistoryItem[];
  readonly tradabilityCheck?: TradabilityResult;
  readonly symbolSearchResults: readonly SymbolSearchResult[];
  readonly actionAuditEvents: readonly AuditEvent[];
  readonly errors: readonly string[];
}

export interface RobinhoodMcpReadOnlyPanelOptions {
  readonly client?: RobinhoodMcpReadOnlyClient;
  readonly query?: Partial<RobinhoodMcpReadOnlyPanelQuery>;
  readonly now?: () => Date;
}

const DEFAULT_QUERY: RobinhoodMcpReadOnlyPanelQuery = {
  quoteSymbol: "HOOD",
  tradabilitySymbol: "HOOD",
  searchQuery: "hood"
};

export function getBrowserRobinhoodMcpReadOnlyClient(
  host: BrowserRobinhoodMcpReadOnlyClientHost | null
): RobinhoodMcpReadOnlyClient | undefined {
  const client = host?.streetspeakRobinhoodMcpReadOnlyClient;

  if (!client || typeof client.callTool !== "function") {
    return undefined;
  }

  return client;
}

export function createRobinhoodMcpReadOnlyPanelModel(
  options: RobinhoodMcpReadOnlyPanelOptions = {}
): RobinhoodMcpReadOnlyPanelModel {
  const adapter = createRobinhoodMcpReadOnlyAdapter({
    client: options.client,
    now: options.now
  });
  const status = adapter.getStatus();
  const query = normalizeQuery(options.query);

  return {
    kind: "real_robinhood_mcp_read_only",
    source: "robinhood_mcp_read_only",
    title: "Real Robinhood MCP Read-Only Connection",
    readOnlyBadge: "Read-Only MCP",
    storagePolicy: "in_memory_only",
    credentialFieldsRequired: [],
    noOrderActions: true,
    smokeStatus: options.client ? "not_run" : "unavailable_unconfigured",
    status,
    query,
    accountSummaries: [],
    positions: [],
    orderHistory: [],
    symbolSearchResults: [],
    actionAuditEvents: [
      createPanelAuditEvent("status_checked", options.now?.() ?? new Date(), 1)
    ],
    errors: status.errors.map((error) => error.message)
  };
}

export async function loadRobinhoodMcpReadOnlyPanelModel(
  options: RobinhoodMcpReadOnlyPanelOptions = {}
): Promise<RobinhoodMcpReadOnlyPanelModel> {
  const now = options.now ?? (() => new Date());
  const adapter = createRobinhoodMcpReadOnlyAdapter({
    client: options.client,
    now
  });
  const status = adapter.getStatus();
  const query = normalizeQuery(options.query);
  const actionAuditEvents: AuditEvent[] = [
    createPanelAuditEvent("status_checked", now(), 1)
  ];
  const errors = status.errors.map((error) => error.message);

  if (!options.client) {
    return {
      ...createRobinhoodMcpReadOnlyPanelModel(options),
      actionAuditEvents,
      errors
    };
  }

  const accounts = await collectReadOnlyResult(
    adapter.getAccounts(),
    "accounts_read",
    actionAuditEvents,
    errors,
    now
  );
  const portfolio = await collectReadOnlyResult(
    adapter.getPortfolioSnapshot(),
    "portfolio_read",
    actionAuditEvents,
    errors,
    now
  );
  const positions = await collectReadOnlyResult(
    adapter.getPositions(),
    "positions_read",
    actionAuditEvents,
    errors,
    now
  );
  const quote = await collectReadOnlyResult(
    adapter.getEquityQuote(query.quoteSymbol),
    "quote_read",
    actionAuditEvents,
    errors,
    now
  );
  const orderHistory = await collectReadOnlyResult(
    adapter.getOrderHistory(),
    "order_history_read",
    actionAuditEvents,
    errors,
    now
  );
  const tradability = await collectReadOnlyResult(
    adapter.getTradability(query.tradabilitySymbol),
    "tradability_read",
    actionAuditEvents,
    errors,
    now
  );
  const searchResults = await collectReadOnlyResult(
    adapter.searchSymbols(query.searchQuery),
    "search_read",
    actionAuditEvents,
    errors,
    now
  );

  return {
    kind: "real_robinhood_mcp_read_only",
    source: "robinhood_mcp_read_only",
    title: "Real Robinhood MCP Read-Only Connection",
    readOnlyBadge: "Read-Only MCP",
    storagePolicy: "in_memory_only",
    credentialFieldsRequired: [],
    noOrderActions: true,
    smokeStatus: "redacted_refresh_completed",
    status,
    query,
    accountSummaries: accounts ?? [],
    ...(portfolio === undefined ? {} : { portfolioSnapshot: portfolio }),
    positions: positions ?? [],
    ...(quote === undefined ? {} : { quoteLookup: quote }),
    orderHistory: orderHistory ?? [],
    ...(tradability === undefined ? {} : { tradabilityCheck: tradability }),
    symbolSearchResults: searchResults ?? [],
    actionAuditEvents,
    errors
  };
}

function normalizeQuery(
  query: Partial<RobinhoodMcpReadOnlyPanelQuery> | undefined
): RobinhoodMcpReadOnlyPanelQuery {
  return {
    quoteSymbol: normalizeSymbol(
      query?.quoteSymbol ?? DEFAULT_QUERY.quoteSymbol
    ),
    tradabilitySymbol: normalizeSymbol(
      query?.tradabilitySymbol ?? DEFAULT_QUERY.tradabilitySymbol
    ),
    searchQuery: (query?.searchQuery ?? DEFAULT_QUERY.searchQuery).trim()
  };
}

async function collectReadOnlyResult<T>(
  pending: Promise<BrokerReadResult<T>>,
  action: RobinhoodReadOnlyAuditAction,
  actionAuditEvents: AuditEvent[],
  errors: string[],
  now: () => Date
): Promise<T | undefined> {
  const result = await pending;

  if (!result.ok) {
    errors.push(result.error.message);

    return undefined;
  }

  actionAuditEvents.push(
    createPanelAuditEvent(action, now(), actionAuditEvents.length + 1)
  );

  return result.data;
}

function createPanelAuditEvent(
  action: RobinhoodReadOnlyAuditAction,
  now: Date,
  sequence: number
): AuditEvent {
  return createRobinhoodReadOnlyAuditEvent(action, {
    id: `robinhood-readonly-${sequence}-${action}`,
    now
  });
}

function normalizeSymbol(symbol: string): string {
  return symbol.trim().toUpperCase();
}
