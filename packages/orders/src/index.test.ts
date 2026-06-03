import { describe, expect, it } from "vitest";
import { validateEquityOrderTicket } from "./index.js";

describe("order ticket validation", () => {
  it("accepts a minimal mock market ticket", () => {
    expect(
      validateEquityOrderTicket({
        symbol: "AAPL",
        side: "buy",
        quantity: 1,
        type: "market"
      }).valid
    ).toBe(true);
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
});
