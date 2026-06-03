import { describe, expect, it } from "vitest";
import { createMockSession, routeCommand } from "./index.js";

describe("core command routing", () => {
  it("starts in mock mode with live trading disabled", () => {
    expect(createMockSession()).toEqual({
      mode: "mock",
      liveTradingEnabled: false
    });
  });

  it("routes order-ticket language without executing anything", () => {
    expect(routeCommand("Build a buy ticket for AAPL").intent).toBe(
      "order_ticket"
    );
  });
});
