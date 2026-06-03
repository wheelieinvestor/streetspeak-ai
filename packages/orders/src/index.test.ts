import { describe, expect, it } from "vitest";
import {
  createEquityOrderTicket,
  transitionOrderTicket,
  validateEquityOrderTicket
} from "./index.js";

describe("order ticket validation", () => {
  it("creates a valid mock market ticket with lifecycle metadata", () => {
    const result = createEquityOrderTicket(
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

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("expected valid order ticket");
    }

    expect(result.ticket).toEqual({
      id: "ticket-1",
      symbol: "AAPL",
      side: "buy",
      quantity: 1,
      type: "market",
      timeInForce: "day",
      mode: "mock",
      lifecycleState: "safety_review_required",
      createdAt: "2026-01-01T00:00:00.000Z"
    });
  });

  it("rejects invalid quantities", () => {
    const result = validateEquityOrderTicket({
      symbol: "AAPL",
      side: "buy",
      quantity: 0,
      type: "market"
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toContain("quantity must be greater than zero");
  });

  it("rejects ambiguous fractional and notional equity tickets", () => {
    const result = validateEquityOrderTicket({
      symbol: "AAPL",
      side: "buy",
      quantity: 1.5,
      notional: 250,
      type: "market"
    });

    expect(result.valid).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toEqual([
      "ambiguous_fractional_quantity",
      "ambiguous_notional_order"
    ]);
  });

  it("rejects limit tickets without a positive limit price", () => {
    const result = validateEquityOrderTicket({
      symbol: "AAPL",
      side: "buy",
      quantity: 1,
      type: "limit"
    });

    expect(result.valid).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toContain(
      "missing_limit_price"
    );
  });

  it("rejects market tickets with a limit price", () => {
    const result = validateEquityOrderTicket({
      symbol: "AAPL",
      side: "buy",
      quantity: 1,
      type: "market",
      limitPrice: 200
    });

    expect(result.valid).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toContain(
      "unexpected_limit_price"
    );
  });

  it("transitions ticket lifecycle state without mutating the original", () => {
    const result = createEquityOrderTicket(
      {
        symbol: "MSFT",
        side: "sell",
        quantity: 2,
        type: "limit",
        limitPrice: 450
      },
      {
        id: "ticket-2",
        now: new Date("2026-01-01T00:00:00.000Z")
      }
    );

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("expected valid order ticket");
    }

    const transitioned = transitionOrderTicket(
      result.ticket,
      "confirmation_required"
    );

    expect(result.ticket.lifecycleState).toBe("safety_review_required");
    expect(transitioned.lifecycleState).toBe("confirmation_required");
  });
});
