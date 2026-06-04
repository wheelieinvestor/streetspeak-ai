import { describe, expect, it } from "vitest";
import {
  checkRobinhoodFixtureTradability,
  createRobinhoodFixtureExplorerModel,
  isSafeReadOnlyFixtureStatus,
  lookupRobinhoodFixtureQuote,
  searchRobinhoodFixtureSymbols,
  V01_MOCK_DEMO_STATUS
} from "./robinhood-fixture-explorer";

describe("Robinhood fixture explorer model", () => {
  it("surfaces disabled and fixture-only adapter status without credentials or live capabilities", () => {
    const model = createRobinhoodFixtureExplorerModel();

    expect(model.disabledStatus).toMatchObject({
      adapter: "robinhood_read_only",
      mode: "read_only",
      state: "disabled",
      transport: "none",
      requiresCredentials: false,
      liveExecutionAvailable: false,
      orderReviewAvailable: false,
      orderPlacementAvailable: false,
      cancelOrderAvailable: false
    });
    expect(model.fixtureStatus).toMatchObject({
      adapter: "robinhood_read_only",
      mode: "read_only",
      state: "fixture_only",
      transport: "none",
      requiresCredentials: false,
      liveExecutionAvailable: false,
      orderReviewAvailable: false,
      orderPlacementAvailable: false,
      cancelOrderAvailable: false
    });
    expect(isSafeReadOnlyFixtureStatus(model.disabledStatus)).toBe(true);
    expect(isSafeReadOnlyFixtureStatus(model.fixtureStatus)).toBe(true);
    expect(model.credentialFieldsRequired).toEqual([]);
  });

  it("models every fixture explorer section as static fixture data", () => {
    const model = createRobinhoodFixtureExplorerModel();

    expect(model.accountSummary).toMatchObject({
      status: "fixture_only",
      source: "fixture_static",
      label: "ROBINHOOD READ-ONLY FIXTURE - not real account data"
    });
    expect(model.buyingPower).toMatchObject({
      buyingPower: 1250,
      source: "fixture_static",
      label: "ROBINHOOD READ-ONLY FIXTURE - not real buying power"
    });
    expect(model.portfolioSnapshot).toMatchObject({
      source: "fixture_static",
      label: "ROBINHOOD READ-ONLY FIXTURE PORTFOLIO - not a broker account"
    });
    expect(model.positions.map((position) => position.source)).toEqual([
      "fixture_static",
      "fixture_static",
      "fixture_static"
    ]);
    expect(model.orderHistory).toHaveLength(2);
    expect(model.orderHistory[0]?.label).toContain("not a real order");
    expect(model.quoteLookup).toMatchObject({
      query: "HOOD",
      quote: {
        symbol: "HOOD",
        source: "fixture_static",
        label: "ROBINHOOD READ-ONLY FIXTURE QUOTE - not real market data"
      }
    });
    expect(model.tradabilityChecks.map((check) => check.symbol)).toEqual([
      "HOOD",
      "SPY"
    ]);
    expect(model.symbolSearch).toMatchObject({
      query: "hood",
      results: [
        {
          symbol: "HOOD",
          source: "fixture_static"
        }
      ]
    });
  });

  it("keeps v0.1 status copy mock-first and non-live", () => {
    expect(V01_MOCK_DEMO_STATUS).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          label: "Mock trading desk",
          status: "available"
        }),
        expect.objectContaining({
          label: "Robinhood fixture explorer",
          status: "fixture-only"
        }),
        expect.objectContaining({
          label: "Real Robinhood connection",
          status: "not active"
        }),
        expect.objectContaining({
          label: "Order review",
          status: "not active"
        }),
        expect.objectContaining({
          label: "Live trading",
          status: "unavailable"
        })
      ])
    );
  });

  it("looks up fixture quotes without real market data", async () => {
    await expect(lookupRobinhoodFixtureQuote("hood")).resolves.toEqual({
      ok: true,
      data: expect.objectContaining({
        symbol: "HOOD",
        source: "fixture_static",
        label: "ROBINHOOD READ-ONLY FIXTURE QUOTE - not real market data"
      })
    });

    await expect(lookupRobinhoodFixtureQuote("MSFT")).resolves.toEqual({
      ok: false,
      error: expect.objectContaining({
        code: "unsupported_symbol",
        retryable: false
      })
    });
  });

  it("searches symbols and checks tradability from fixtures only", async () => {
    await expect(searchRobinhoodFixtureSymbols("hood")).resolves.toEqual({
      ok: true,
      data: [
        {
          symbol: "HOOD",
          name: "Robinhood Markets Inc.",
          assetClass: "equity",
          tradableInFixture: true,
          tradable: true,
          source: "fixture_static"
        }
      ]
    });

    await expect(checkRobinhoodFixtureTradability("SPY")).resolves.toEqual({
      ok: true,
      data: expect.objectContaining({
        symbol: "SPY",
        tradable: false,
        reason: "read_only_scope",
        source: "fixture_static"
      })
    });

    await expect(checkRobinhoodFixtureTradability("MSFT")).resolves.toEqual({
      ok: true,
      data: expect.objectContaining({
        symbol: "MSFT",
        tradable: false,
        reason: "symbol_not_found",
        source: "fixture_static"
      })
    });
  });
});
