import { describe, expect, it } from "vitest";
import type {
  RobinhoodMcpReadOnlyClient,
  RobinhoodMcpReadOnlyToolName
} from "@streetspeak-ai/brokers";
import {
  createRobinhoodMcpReadOnlyPanelModel,
  getBrowserRobinhoodMcpReadOnlyClient,
  loadRobinhoodMcpReadOnlyPanelModel
} from "./robinhood-mcp-readonly-panel";

class MemoryStorage {
  readonly #items = new Map<string, string>();

  get snapshot(): readonly [string, string][] {
    return [...this.#items.entries()];
  }

  setItem(key: string, value: string): void {
    this.#items.set(key, value);
  }
}

describe("Robinhood MCP read-only panel model", () => {
  it("surfaces an unconfigured externally managed MCP status without credential fields or order actions", () => {
    const model = createRobinhoodMcpReadOnlyPanelModel({
      now: () => new Date("2026-01-01T00:00:00.000Z")
    });

    expect(model).toMatchObject({
      kind: "real_robinhood_mcp_read_only",
      source: "robinhood_mcp_read_only",
      readOnlyBadge: "Read-Only MCP",
      storagePolicy: "in_memory_only",
      credentialFieldsRequired: [],
      noOrderActions: true,
      status: {
        state: "unconfigured",
        transport: "externally_managed_mcp",
        credentialsManagement: "externally_managed",
        credentialsStoredByStreetSpeak: false,
        liveExecutionAvailable: false,
        orderReviewAvailable: false,
        orderPlacementAvailable: false,
        cancelOrderAvailable: false
      }
    });
    expect(model.actionAuditEvents).toEqual([
      expect.objectContaining({
        type: "robinhood.read_only.action",
        payload: { action: "status_checked" }
      })
    ]);
    expect(model.accountSummaries).toEqual([]);
    expect(model.positions).toEqual([]);
  });

  it("detects an externally injected browser MCP client without asking for credentials", () => {
    const client = createFakeClient([]);

    expect(
      getBrowserRobinhoodMcpReadOnlyClient({
        streetspeakRobinhoodMcpReadOnlyClient: client
      })
    ).toBe(client);
    expect(getBrowserRobinhoodMcpReadOnlyClient({})).toBeUndefined();
    expect(getBrowserRobinhoodMcpReadOnlyClient(null)).toBeUndefined();
  });

  it("loads real read-only panel state through allowed MCP tools and redacts identifiers", async () => {
    const calledTools: RobinhoodMcpReadOnlyToolName[] = [];
    const model = await loadRobinhoodMcpReadOnlyPanelModel({
      client: createFakeClient(calledTools),
      query: {
        quoteSymbol: "hood",
        tradabilitySymbol: "hood",
        searchQuery: "hood"
      },
      now: () => new Date("2026-01-01T00:00:00.000Z")
    });

    expect(calledTools).toEqual([
      "get_accounts",
      "get_portfolio",
      "get_equity_positions",
      "get_equity_quotes",
      "get_equity_orders",
      "get_equity_tradability",
      "search"
    ]);
    expect(model.status).toMatchObject({
      state: "available",
      liveExecutionAvailable: false,
      orderReviewAvailable: false,
      orderPlacementAvailable: false,
      cancelOrderAvailable: false
    });
    expect(model.accountSummaries).toEqual([
      expect.objectContaining({
        accountLabel: "Robinhood account 1 (identifier redacted)",
        source: "robinhood_mcp_read_only",
        accountIdentifierRedacted: true
      })
    ]);
    expect(model.portfolioSnapshot).toMatchObject({
      accountIdentifierRedacted: true,
      totalEquityValue: 1000.5,
      buyingPower: {
        buyingPower: 250.25
      }
    });
    expect(model.positions).toEqual([
      expect.objectContaining({
        symbol: "HOOD",
        marketValue: 44.96,
        source: "robinhood_mcp_read_only"
      })
    ]);
    expect(model.quoteLookup).toMatchObject({
      symbol: "HOOD",
      last: 22.48
    });
    expect(model.orderHistory).toEqual([
      expect.objectContaining({
        id: "redacted-order-1",
        rawOrderIdentifierRedacted: true
      })
    ]);
    expect(model.tradabilityCheck).toMatchObject({
      symbol: "HOOD",
      tradable: true,
      reason: "mcp_tradable"
    });
    expect(model.symbolSearchResults).toEqual([
      {
        symbol: "HOOD",
        name: "Robinhood Markets Inc.",
        assetClass: "equity",
        tradable: true,
        source: "robinhood_mcp_read_only"
      }
    ]);
    expect(model.actionAuditEvents.map((event) => event.payload)).toEqual([
      { action: "status_checked" },
      { action: "accounts_read" },
      { action: "portfolio_read" },
      { action: "positions_read" },
      { action: "quote_read" },
      { action: "order_history_read" },
      { action: "tradability_read" },
      { action: "search_read" }
    ]);

    const serializedModel = JSON.stringify(model);

    expect(serializedModel).not.toContain(
      "raw-identifier-from-client-not-returned"
    );
    expect(serializedModel).not.toContain(
      "raw-number-from-client-not-returned"
    );
    expect(serializedModel).not.toContain(
      "raw-order-reference-from-client-not-returned"
    );
  });

  it("does not persist real read-only MCP data to browser storage by default", async () => {
    const storage = new MemoryStorage();

    storage.setItem("streetspeak-ai:settings:v1", '{"showAuditTimeline":true}');
    const before = storage.snapshot;

    await loadRobinhoodMcpReadOnlyPanelModel({
      client: createFakeClient([]),
      now: () => new Date("2026-01-01T00:00:00.000Z")
    });

    expect(storage.snapshot).toEqual(before);
  });
});

function createFakeClient(
  calledTools: RobinhoodMcpReadOnlyToolName[]
): RobinhoodMcpReadOnlyClient {
  return {
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
                status: "active"
              }
            ]
          };
        case "get_portfolio":
          return {
            portfolio: {
              total_equity_value: "1000.50",
              buying_power: "250.25",
              cash_available: "125.00"
            }
          };
        case "get_equity_positions":
          return {
            positions: [
              {
                symbol: "HOOD",
                quantity: "2",
                average_cost: "10",
                market_value: "44.96"
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
                ask_price: "22.50"
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
                status: "filled"
              }
            ]
          };
        case "get_equity_tradability":
          return {
            tradability: {
              symbol: "HOOD",
              tradable: true
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
    }
  };
}
