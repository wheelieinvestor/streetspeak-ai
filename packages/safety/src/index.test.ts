import { describe, expect, it } from "vitest";
import {
  buildConfirmationPhrase,
  isSpecificConfirmation,
  reviewOrderTicket
} from "./index.js";

const ticket = {
  symbol: "AAPL",
  side: "buy",
  quantity: 1,
  type: "market"
} as const;

describe("safety gates", () => {
  it("keeps live trading blocked in the initial scaffold", () => {
    const review = reviewOrderTicket(ticket);

    expect(review.liveTradingEnabled).toBe(false);
    expect(review.blocks).toContain(
      "live trading is not implemented in this scaffold"
    );
  });

  it("rejects generic confirmations", () => {
    expect(isSpecificConfirmation("yes", buildConfirmationPhrase(ticket))).toBe(
      false
    );
    expect(
      isSpecificConfirmation("do it", buildConfirmationPhrase(ticket))
    ).toBe(false);
  });
});
