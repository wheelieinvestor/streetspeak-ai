import { describe, expect, it } from "vitest";
import { createEquityOrderTicket } from "@streetspeak-ai/orders";
import {
  buildConfirmationPhrase,
  createConfirmationChallenge,
  evaluateConfirmationChallenge,
  isSpecificConfirmation,
  reviewOrderTicket
} from "./index.js";

const ticketResult = createEquityOrderTicket(
  {
    symbol: "AAPL",
    side: "buy",
    quantity: 1,
    type: "market"
  },
  {
    id: "ticket-1",
    now: new Date("2026-01-01T00:00:00.000Z")
  }
);

if (!ticketResult.ok) {
  throw new Error("test ticket should be valid");
}

const ticket = ticketResult.ticket;

describe("safety gates", () => {
  it("keeps live trading blocked in the initial scaffold", () => {
    const review = reviewOrderTicket(ticket);

    expect(review.liveTradingEnabled).toBe(false);
    expect(review.blocks).toContain(
      "live trading is not implemented in this scaffold"
    );
    expect(review.ticketId).toBe("ticket-1");
  });

  it("rejects generic confirmations", () => {
    expect(isSpecificConfirmation("yes", buildConfirmationPhrase(ticket))).toBe(
      false
    );
    expect(
      isSpecificConfirmation("do it", buildConfirmationPhrase(ticket))
    ).toBe(false);
  });

  it("creates a time-bound confirmation challenge for a specific mock phrase", () => {
    const challenge = createConfirmationChallenge(ticket, {
      id: "challenge-1",
      now: new Date("2026-01-01T00:00:00.000Z"),
      expiresAt: new Date("2026-01-01T00:05:00.000Z")
    });

    expect(challenge).toEqual({
      id: "challenge-1",
      ticketId: "ticket-1",
      requiredPhrase: "CONFIRM MOCK BUY 1 AAPL MARKET",
      createdAt: "2026-01-01T00:00:00.000Z",
      expiresAt: "2026-01-01T00:05:00.000Z",
      status: "open"
    });
  });

  it("accepts only the exact confirmation phrase for mock submission", () => {
    const challenge = createConfirmationChallenge(ticket, {
      id: "challenge-1",
      now: new Date("2026-01-01T00:00:00.000Z"),
      expiresAt: new Date("2026-01-01T00:05:00.000Z")
    });

    expect(
      evaluateConfirmationChallenge(
        challenge,
        "CONFIRM MOCK BUY 1 AAPL MARKET",
        new Date("2026-01-01T00:01:00.000Z")
      )
    ).toEqual({
      accepted: true,
      status: "accepted_for_mock_only",
      normalizedSpokenText: "confirm mock buy 1 aapl market"
    });
  });

  it("reports generic confirmation rejection reasons", () => {
    const challenge = createConfirmationChallenge(ticket, {
      expiresAt: new Date("2026-01-01T00:05:00.000Z")
    });

    expect(
      evaluateConfirmationChallenge(
        challenge,
        "confirmed",
        new Date("2026-01-01T00:01:00.000Z")
      )
    ).toEqual({
      accepted: false,
      status: "rejected",
      reason: "generic_confirmation",
      normalizedSpokenText: "confirmed"
    });
  });
});
