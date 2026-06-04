import { describe, expect, it } from "vitest";
import {
  createMockTradingDeskTurn,
  createMockSession,
  createMockUserCommand,
  parseUserCommand,
  parseMockTradingCommand,
  routeCommand,
  submitMockTradingDeskConfirmation
} from "./index.js";
import { createMockBrokerAdapter } from "@streetspeak-ai/brokers";

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

  it("routes mock portfolio questions", () => {
    expect(routeCommand("how much mock buying power do I have")).toMatchObject({
      intent: "portfolio_question",
      advisoryBoundary: "non_advisory",
      orderTicketRequested: false
    });
  });

  it("routes mock quote questions", () => {
    expect(routeCommand("what is HOOD trading at")).toMatchObject({
      intent: "market_question",
      advisoryBoundary: "non_advisory",
      orderTicketRequested: false
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

  it("parses buy and sell share-quantity commands", () => {
    expect(parseMockTradingCommand("buy 5 HOOD")).toEqual({
      kind: "order_ticket",
      order: {
        side: "buy",
        quantity: 5,
        symbol: "HOOD",
        type: "market",
        timeInForce: "day"
      },
      summary: "BUY 5 HOOD MARKET"
    });

    expect(parseMockTradingCommand("sell 2 SOFI")).toEqual({
      kind: "order_ticket",
      order: {
        side: "sell",
        quantity: 2,
        symbol: "SOFI",
        type: "market",
        timeInForce: "day"
      },
      summary: "SELL 2 SOFI MARKET"
    });
  });

  it("parses limit order commands", () => {
    expect(
      parseMockTradingCommand("build a limit order to buy 3 AAPL at 175")
    ).toEqual({
      kind: "order_ticket",
      order: {
        side: "buy",
        quantity: 3,
        symbol: "AAPL",
        type: "limit",
        limitPrice: 175,
        timeInForce: "day"
      },
      summary: "BUY 3 AAPL LIMIT 175"
    });
  });

  it("rejects unsupported notional commands without converting dollars", () => {
    expect(parseMockTradingCommand("buy $500 of HOOD")).toEqual({
      kind: "unsupported",
      reason: "notional_not_supported",
      message:
        "StreetSpeak AI v0.1 supports share-quantity equity tickets only. Notional commands require quote lookup, share conversion, and explicit user confirmation before a final ticket can be created. No dollar amount was converted into shares."
    });
  });

  it("keeps unsupported notional commands from creating final tickets", async () => {
    const state = await createMockTradingDeskTurn("buy $500 of HOOD", {
      commandId: "cmd-notional",
      now: new Date("2026-01-01T00:00:00.000Z")
    });

    expect(state.status).toBe("unsupported");
    expect(state.ticket).toBeUndefined();
    expect(state.challenge).toBeUndefined();
    expect(state.brokerResponse).toBeUndefined();
    expect(state.session.liveTradingEnabled).toBe(false);
  });

  it("rejects invalid and ambiguous order commands", () => {
    expect(parseMockTradingCommand("buy HOOD")).toMatchObject({
      kind: "invalid",
      reason: "missing_order_details"
    });
    expect(parseMockTradingCommand("buy 1 HOOD and sell 1 SOFI")).toMatchObject(
      {
        kind: "invalid",
        reason: "ambiguous_order"
      }
    );
  });

  it("answers portfolio and quote questions from mock fixtures", async () => {
    const portfolioState = await createMockTradingDeskTurn(
      "show my portfolio",
      {
        commandId: "cmd-portfolio",
        now: new Date("2026-01-01T00:00:00.000Z")
      }
    );

    expect(portfolioState.status).toBe("answered");
    expect(portfolioState.answer).toContain("$12,500.00 mock buying power");
    expect(portfolioState.ticket).toBeUndefined();

    const quoteState = await createMockTradingDeskTurn(
      "show me a quote for NVDA",
      {
        commandId: "cmd-quote",
        now: new Date("2026-01-01T00:00:00.000Z")
      }
    );

    expect(quoteState.status).toBe("answered");
    expect(quoteState.quote).toMatchObject({
      symbol: "NVDA",
      source: "mock_static"
    });
    expect(quoteState.answer).toContain("MOCK STATIC QUOTE");
  });

  it("creates tickets, safety reviews, and confirmation challenges from parsed commands", async () => {
    const state = await createMockTradingDeskTurn("buy 5 HOOD", {
      commandId: "cmd-1",
      ticketId: "ticket-1",
      challengeId: "challenge-1",
      challengeCode: "4827",
      now: new Date("2026-01-01T00:00:00.000Z")
    });

    expect(state.status).toBe("awaiting_confirmation");
    expect(state.ticket).toMatchObject({
      id: "ticket-1",
      symbol: "HOOD",
      side: "buy",
      quantity: 5,
      type: "market",
      lifecycleState: "confirmation_required"
    });
    expect(state.safetyReview).toMatchObject({
      liveTradingEnabled: false,
      requiresExplicitConfirmation: true,
      ticketId: "ticket-1"
    });
    expect(state.challenge).toMatchObject({
      id: "challenge-1",
      ticketId: "ticket-1",
      code: "4827",
      requiredPhrase: "CONFIRM MOCK BUY 5 HOOD MARKET CODE 4827",
      status: "open"
    });
    expect(state.auditTimeline.map((event) => event.type)).toEqual([
      "command.received",
      "command.routed",
      "order.ticket.created",
      "safety.reviewed",
      "confirmation.challenge.created"
    ]);
  });

  it("routes typed and voice transcripts through the same mock parser", async () => {
    const typedState = await createMockTradingDeskTurn("buy 5 HOOD", {
      commandId: "cmd-keyboard",
      ticketId: "ticket-keyboard",
      challengeId: "challenge-keyboard",
      challengeCode: "1111",
      source: "keyboard",
      now: new Date("2026-01-01T00:00:00.000Z")
    });
    const voiceState = await createMockTradingDeskTurn("buy 5 HOOD", {
      commandId: "cmd-voice",
      ticketId: "ticket-voice",
      challengeId: "challenge-voice",
      challengeCode: "2222",
      source: "voice",
      now: new Date("2026-01-01T00:00:00.000Z")
    });

    expect(typedState.parse).toEqual(voiceState.parse);
    expect(typedState.route).toEqual(voiceState.route);
    expect(voiceState.command.source).toBe("voice");
    expect(voiceState.ticket).toMatchObject({
      symbol: "HOOD",
      side: "buy",
      quantity: 5,
      mode: "mock"
    });
    expect(voiceState.session.liveTradingEnabled).toBe(false);
  });

  it("runs the mock desk happy path after exact confirmation", async () => {
    const state = await createMockTradingDeskTurn("buy 5 HOOD", {
      commandId: "cmd-1",
      ticketId: "ticket-1",
      challengeId: "challenge-1",
      challengeCode: "4827",
      now: new Date("2026-01-01T00:00:00.000Z")
    });
    const submitted = await submitMockTradingDeskConfirmation(
      state,
      "CONFIRM MOCK BUY 5 HOOD MARKET CODE 4827",
      {
        now: new Date("2026-01-01T00:01:00.000Z"),
        brokerAdapter: createMockBrokerAdapter({
          idFactory: () => "mock-order-1",
          now: () => new Date("2026-01-01T00:01:00.000Z")
        })
      }
    );

    expect(submitted.status).toBe("mock_submitted");
    expect(submitted.ticket).toMatchObject({
      id: "ticket-1",
      lifecycleState: "mock_submitted"
    });
    expect(submitted.brokerResponse).toEqual({
      id: "mock-order-1",
      adapter: "mock",
      ticketId: "ticket-1",
      submittedAt: "2026-01-01T00:01:00.000Z",
      liveExecutionAvailable: false,
      status: "mock_submitted",
      message: "Mock submission recorded. No live broker order was placed."
    });
    expect(submitted.auditTimeline.map((event) => event.type)).toEqual([
      "command.received",
      "command.routed",
      "order.ticket.created",
      "safety.reviewed",
      "confirmation.challenge.created",
      "confirmation.accepted",
      "mock.execution.requested",
      "mock.execution.submitted"
    ]);
  });

  it("records rejection path without mock submission for generic confirmation", async () => {
    const state = await createMockTradingDeskTurn("sell 1 SPY at market", {
      commandId: "cmd-1",
      ticketId: "ticket-1",
      challengeId: "challenge-1",
      challengeCode: "4827",
      now: new Date("2026-01-01T00:00:00.000Z")
    });
    const rejected = await submitMockTradingDeskConfirmation(state, "yes", {
      now: new Date("2026-01-01T00:01:00.000Z")
    });

    expect(rejected.status).toBe("confirmation_rejected");
    expect(rejected.message).toBe(
      "Confirmation rejected. Generic confirmations never submit an order; use the exact challenge phrase and code for mock-only submission."
    );
    expect(rejected.confirmation).toEqual({
      accepted: false,
      status: "rejected",
      reason: "generic_confirmation",
      normalizedSpokenText: "yes"
    });
    expect(rejected.brokerResponse).toBeUndefined();
    expect(rejected.auditTimeline.map((event) => event.type)).toEqual([
      "command.received",
      "command.routed",
      "order.ticket.created",
      "safety.reviewed",
      "confirmation.challenge.created",
      "confirmation.rejected"
    ]);
  });

  it("requires the full exact confirmation phrase and code before mock submission", async () => {
    const state = await createMockTradingDeskTurn("buy 5 HOOD", {
      commandId: "cmd-1",
      ticketId: "ticket-1",
      challengeId: "challenge-1",
      challengeCode: "4827",
      now: new Date("2026-01-01T00:00:00.000Z")
    });
    const rejected = await submitMockTradingDeskConfirmation(
      state,
      "CONFIRM MOCK BUY 5 HOOD MARKET",
      {
        now: new Date("2026-01-01T00:01:00.000Z")
      }
    );

    expect(rejected.status).toBe("confirmation_rejected");
    expect(rejected.confirmation).toMatchObject({
      accepted: false,
      status: "rejected",
      reason: "phrase_mismatch",
      normalizedSpokenText: "confirm mock buy 5 hood market"
    });
    expect(rejected.brokerResponse).toBeUndefined();
    expect(rejected.session.liveTradingEnabled).toBe(false);
    expect(rejected.auditTimeline.map((event) => event.type)).toEqual([
      "command.received",
      "command.routed",
      "order.ticket.created",
      "safety.reviewed",
      "confirmation.challenge.created",
      "confirmation.rejected"
    ]);
  });
});
