import { describe, expect, it } from "vitest";
import { createEquityOrderTicket } from "@streetspeak-ai/orders";
import { createMockBrokerAdapter } from "./index.js";

describe("broker adapters", () => {
  it("only exposes mock review behavior in the initial scaffold", async () => {
    const adapter = createMockBrokerAdapter();
    const ticket = createTicket();
    const review = await adapter.reviewOrder(ticket);

    expect(review.adapter).toBe("mock");
    expect(review.liveExecutionAvailable).toBe(false);
    expect(review.acceptedForMockSubmission).toBe(true);
  });

  it("reports capabilities without live execution support", () => {
    const adapter = createMockBrokerAdapter();

    expect(adapter.getCapabilities()).toEqual({
      adapter: "mock",
      mode: "mock",
      liveExecutionAvailable: false,
      supportsLiveExecution: false,
      supportedAssetClasses: ["equity"],
      supportedOrderTypes: ["market", "limit"],
      capabilities: ["review_order", "submit_mock_order"]
    });
  });

  it("can submit only a mock order record", async () => {
    const adapter = createMockBrokerAdapter();
    const submission = await adapter.submitMockOrder(createTicket());

    expect(submission).toMatchObject({
      adapter: "mock",
      ticketId: "ticket-1",
      liveExecutionAvailable: false,
      status: "mock_submitted",
      message: "Mock submission recorded. No live broker order was placed."
    });
    expect(submission.id).toBeTruthy();
    expect(Date.parse(submission.submittedAt)).not.toBeNaN();
  });
});

function createTicket() {
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

  if (!result.ok) {
    throw new Error("expected valid order ticket");
  }

  return result.ticket;
}
