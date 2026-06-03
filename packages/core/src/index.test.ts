import { describe, expect, it } from "vitest";
import {
  createMockSession,
  createMockUserCommand,
  parseUserCommand,
  routeCommand
} from "./index.js";

describe("core command routing", () => {
  it("starts in mock mode with live trading disabled", () => {
    expect(
      createMockSession({
        userId: "user-1",
        now: new Date("2026-01-01T00:00:00.000Z")
      })
    ).toEqual({
      mode: "mock",
      liveTradingEnabled: false,
      userId: "user-1",
      startedAt: "2026-01-01T00:00:00.000Z"
    });
  });

  it("routes order-ticket language without executing anything", () => {
    expect(routeCommand("Build a buy ticket for AAPL")).toMatchObject({
      intent: "order_ticket",
      advisoryBoundary: "non_advisory",
      orderTicketRequested: true
    });
  });

  it("parses user commands without adding recommendations", () => {
    const parsed = parseUserCommand(
      createMockUserCommand("what is the price of MSFT", {
        id: "cmd-1",
        now: new Date("2026-01-01T00:00:00.000Z")
      })
    );

    expect(parsed.command.sessionMode).toBe("mock");
    expect(parsed.route.intent).toBe("market_question");
    expect(parsed.route.advisoryBoundary).toBe("non_advisory");
  });
});
