import { describe, expect, it } from "vitest";
import { createAuditEvent } from "./index.js";

describe("audit events", () => {
  it("creates timestamped audit events", () => {
    const event = createAuditEvent(
      "command.received",
      { mode: "mock" },
      new Date("2026-01-01T00:00:00.000Z")
    );

    expect(event.type).toBe("command.received");
    expect(event.occurredAt).toBe("2026-01-01T00:00:00.000Z");
    expect(event.payload).toEqual({ mode: "mock" });
  });
});
