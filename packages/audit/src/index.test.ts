import { describe, expect, it } from "vitest";
import { createAuditEvent, redactAuditPayload } from "./index.js";

describe("audit events", () => {
  it("creates timestamped audit events", () => {
    const event = createAuditEvent(
      "command.received",
      { mode: "mock" },
      {
        id: "audit-1",
        actor: "user",
        now: new Date("2026-01-01T00:00:00.000Z")
      }
    );

    expect(event.id).toBe("audit-1");
    expect(event.type).toBe("command.received");
    expect(event.occurredAt).toBe("2026-01-01T00:00:00.000Z");
    expect(event.actor).toBe("user");
    expect(event.redacted).toBe(true);
    expect(event.payload).toEqual({ mode: "mock" });
  });

  it("redacts secret-like audit payload keys recursively", () => {
    expect(
      redactAuditPayload({
        brokerAccountId: "account-123",
        nested: {
          apiKey: "secret-key",
          safe: "visible"
        },
        events: [
          {
            authorization: "Bearer token",
            status: "blocked"
          }
        ]
      })
    ).toEqual({
      brokerAccountId: "[REDACTED]",
      nested: {
        apiKey: "[REDACTED]",
        safe: "visible"
      },
      events: [
        {
          authorization: "[REDACTED]",
          status: "blocked"
        }
      ]
    });
  });

  it("redacts payloads when creating audit events", () => {
    const event = createAuditEvent("mock.execution.requested", {
      token: "do-not-store",
      ticketId: "ticket-1"
    });

    expect(event.payload).toEqual({
      token: "[REDACTED]",
      ticketId: "ticket-1"
    });
  });
});
