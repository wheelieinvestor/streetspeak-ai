import { describe, expect, it } from "vitest";
import { createMockBrokerAdapter } from "./index.js";

describe("broker adapters", () => {
  it("only exposes mock review behavior in the initial scaffold", async () => {
    const adapter = createMockBrokerAdapter();
    const review = await adapter.reviewOrder({
      symbol: "AAPL",
      side: "buy",
      quantity: 1,
      type: "market"
    });

    expect(review.adapter).toBe("mock");
    expect(review.liveExecutionAvailable).toBe(false);
  });
});
