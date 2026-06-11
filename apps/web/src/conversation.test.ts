import { describe, expect, it } from "vitest";
import {
  createMockTradingDeskTurn,
  submitMockTradingDeskConfirmation
} from "@streetspeak-ai/core";
import {
  buildConversationTimeline,
  createClarificationPrompt
} from "./conversation";

describe("conversation timeline", () => {
  it("renders user, intent, ticket, safety, and confirmation entries for a mock order", async () => {
    const state = await createMockTradingDeskTurn("buy 5 HOOD", {
      commandId: "cmd-1",
      ticketId: "ticket-1",
      challengeId: "challenge-1",
      challengeCode: "123456",
      now: new Date("2026-01-01T00:00:00.000Z")
    });
    const entries = buildConversationTimeline(state);

    expect(entries.map((entry) => entry.kind)).toEqual([
      "user",
      "intent",
      "assistant",
      "ticket",
      "safety",
      "confirmation"
    ]);
    expect(entries.find((entry) => entry.kind === "ticket")).toMatchObject({
      title: "Mock ticket",
      body: "BUY 5 HOOD / market / confirmation_required"
    });
    expect(createClarificationPrompt(state)).toBeNull();
  });

  it("creates explicit repair options for unsupported notional commands", async () => {
    const state = await createMockTradingDeskTurn("buy $500 of HOOD", {
      commandId: "cmd-notional",
      now: new Date("2026-01-01T00:00:00.000Z")
    });
    const clarification = createClarificationPrompt(state);
    const entries = buildConversationTimeline(state);

    expect(state.status).toBe("unsupported");
    expect(clarification).toMatchObject({
      requiresExplicitChoice: true,
      message:
        "Dollar-based orders need repair before StreetSpeak can create a mock ticket. Choose a share-quantity ticket or check the mock quote first."
    });
    expect(clarification?.options).toEqual([
      {
        id: "one-share-ticket",
        label: "Build 1-share mock buy ticket for HOOD",
        command: "buy 1 HOOD",
        safetyNote:
          "Creates a new mock ticket only after this explicit button press."
      },
      {
        id: "quote-first",
        label: "Check mock quote for HOOD",
        command: "what is HOOD trading at",
        safetyNote: "Runs a read-only fixture quote command."
      }
    ]);
    expect(entries.at(-1)).toMatchObject({
      kind: "clarification",
      title: "Clarification needed"
    });
  });

  it("handles unsupported commands without creating repair tickets automatically", async () => {
    const state = await createMockTradingDeskTurn("sing me a song", {
      commandId: "cmd-unsupported",
      now: new Date("2026-01-01T00:00:00.000Z")
    });
    const clarification = createClarificationPrompt(state);

    expect(state.ticket).toBeUndefined();
    expect(clarification).toMatchObject({
      requiresExplicitChoice: true,
      options: []
    });
  });

  it("shows rejected confirmations without adding a receipt entry", async () => {
    const state = await createMockTradingDeskTurn("buy 5 HOOD", {
      commandId: "cmd-reject",
      ticketId: "ticket-reject",
      challengeId: "challenge-reject",
      challengeCode: "123456",
      now: new Date("2026-01-01T00:00:00.000Z")
    });
    const rejected = await submitMockTradingDeskConfirmation(state, "yes", {
      now: new Date("2026-01-01T00:01:00.000Z")
    });
    const entries = buildConversationTimeline(rejected);

    expect(rejected.status).toBe("confirmation_rejected");
    expect(rejected.brokerResponse).toBeUndefined();
    expect(entries.some((entry) => entry.kind === "receipt")).toBe(false);
    expect(entries).toContainEqual(
      expect.objectContaining({
        kind: "confirmation",
        title: "Confirmation rejected",
        tone: "warning"
      })
    );
  });
});
