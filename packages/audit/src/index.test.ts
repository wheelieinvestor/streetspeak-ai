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

  it("redacts finance and security-sensitive audit payload keys recursively", () => {
    expect(
      redactAuditPayload({
        accountId: "acct-id",
        accountNumber: "acct-number",
        brokerAccountId: "broker-account",
        symbol: "HOOD",
        side: "buy",
        quantity: 5,
        ticketId: "ticket-1",
        mockOrderId: "mock-order-1",
        nested: {
          accessToken: "access-token",
          refreshToken: "refresh-token",
          sessionToken: "session-token",
          privateKey: "private-key",
          apiKey: "api-key",
          authorization: "Bearer token",
          password: "password",
          secret: "secret",
          credential: "credential",
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
      accountId: "[REDACTED]",
      accountNumber: "[REDACTED]",
      brokerAccountId: "[REDACTED]",
      symbol: "HOOD",
      side: "buy",
      quantity: 5,
      ticketId: "ticket-1",
      mockOrderId: "mock-order-1",
      nested: {
        accessToken: "[REDACTED]",
        refreshToken: "[REDACTED]",
        sessionToken: "[REDACTED]",
        privateKey: "[REDACTED]",
        apiKey: "[REDACTED]",
        authorization: "[REDACTED]",
        password: "[REDACTED]",
        secret: "[REDACTED]",
        credential: "[REDACTED]",
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
