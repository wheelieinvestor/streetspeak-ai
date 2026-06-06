import { describe, expect, it } from "vitest";
import {
  createAuditTimelineExport,
  createAuditEvent,
  createMockTradeReceipt,
  createRobinhoodReadOnlyAuditEvent,
  InMemoryAuditSink,
  NO_LIVE_BROKER_ORDER_PLACED_STATEMENT,
  redactAuditPayload,
  renderMockTradeReceiptMarkdown,
  serializeAuditExport
} from "./index.js";

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
        accountIdentifier: "acct-identifier",
        brokerAccountId: "broker-account",
        brokerAccountIdentifier: "broker-account-identifier",
        orderId: "sample-order-id",
        brokerOrderId: "sample-broker-order-id",
        rawOrderIdentifier: "sample-raw-order-id",
        portfolioValue: 123456.78,
        totalEquityValue: 123456.78,
        buyingPower: 5000,
        cashAvailable: 1200,
        positions: [{ symbol: "HOOD", quantity: 99 }],
        symbol: "HOOD",
        side: "buy",
        quantity: 5,
        ticketId: "ticket-1",
        mockOrderId: "mock-order-1",
        rawAudio: "audio-bytes",
        rawAudioBlob: "blob",
        audioData: "audio-data",
        nested: {
          accessToken: "placeholder",
          refreshToken: "placeholder",
          sessionToken: "placeholder",
          privateKey: "private-key",
          apiKey: "placeholder",
          authorization: "Bearer placeholder",
          password: "placeholder",
          secret: "placeholder",
          credential: "credential",
          safe: "visible"
        },
        events: [
          {
            authorization: "Bearer placeholder",
            status: "blocked"
          }
        ]
      })
    ).toEqual({
      accountId: "[REDACTED]",
      accountNumber: "[REDACTED]",
      accountIdentifier: "[REDACTED]",
      brokerAccountId: "[REDACTED]",
      brokerAccountIdentifier: "[REDACTED]",
      orderId: "[REDACTED]",
      brokerOrderId: "[REDACTED]",
      rawOrderIdentifier: "[REDACTED]",
      portfolioValue: "[REDACTED]",
      totalEquityValue: "[REDACTED]",
      buyingPower: "[REDACTED]",
      cashAvailable: "[REDACTED]",
      positions: "[REDACTED]",
      symbol: "HOOD",
      side: "buy",
      quantity: 5,
      ticketId: "ticket-1",
      mockOrderId: "mock-order-1",
      rawAudio: "[REDACTED]",
      rawAudioBlob: "[REDACTED]",
      audioData: "[REDACTED]",
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

  it("creates Robinhood read-only audit events with action names only", () => {
    const event = createRobinhoodReadOnlyAuditEvent("quote_read", {
      id: "audit-robinhood-read-1",
      now: new Date("2026-01-01T00:00:00.000Z")
    });

    expect(event).toEqual({
      id: "audit-robinhood-read-1",
      type: "robinhood.read_only.action",
      occurredAt: "2026-01-01T00:00:00.000Z",
      actor: "system",
      redacted: true,
      payload: {
        action: "quote_read"
      }
    });
    expect(JSON.stringify(event)).not.toContain("account");
    expect(JSON.stringify(event)).not.toContain("portfolioValue");
    expect(JSON.stringify(event)).not.toContain("orderId");
  });

  it("redacts payloads when creating audit events", () => {
    const event = createAuditEvent("mock.execution.requested", {
      token: "placeholder",
      ticketId: "ticket-1"
    });

    expect(event.payload).toEqual({
      token: "[REDACTED]",
      ticketId: "ticket-1"
    });
  });

  it("supports redacted execution lifecycle events", () => {
    const event = createAuditEvent(
      "execution.live.blocked",
      {
        planId: "plan-1",
        ticketId: "ticket-1",
        accountId: "acct-id",
        brokerOrderId: "broker-order-id",
        mcpUrl: "https://mcp.example.test",
        authConfig: { token: "placeholder" },
        rawMcpOutput: { account_number: "raw-account" },
        liveExecutionAvailable: false
      },
      {
        id: "audit-execution-1",
        now: new Date("2026-01-01T00:00:00.000Z")
      }
    );

    expect(event).toEqual({
      id: "audit-execution-1",
      type: "execution.live.blocked",
      occurredAt: "2026-01-01T00:00:00.000Z",
      actor: "system",
      redacted: true,
      payload: {
        planId: "plan-1",
        ticketId: "ticket-1",
        accountId: "[REDACTED]",
        brokerOrderId: "[REDACTED]",
        mcpUrl: "[REDACTED]",
        authConfig: "[REDACTED]",
        rawMcpOutput: "[REDACTED]",
        liveExecutionAvailable: false
      }
    });
  });

  it("keeps local in-memory audit timelines append-only for the demo flow", async () => {
    const sink = new InMemoryAuditSink();

    await sink.append(
      createAuditEvent(
        "mock.execution.submitted",
        {
          ticketId: "ticket-1",
          mockOrderId: "mock-order-1",
          token: "placeholder"
        },
        {
          id: "audit-2",
          actor: "mock_broker",
          now: new Date("2026-01-01T00:00:00.000Z")
        }
      )
    );

    expect(sink.getEvents()).toEqual([
      {
        id: "audit-2",
        type: "mock.execution.submitted",
        occurredAt: "2026-01-01T00:00:00.000Z",
        actor: "mock_broker",
        redacted: true,
        payload: {
          ticketId: "ticket-1",
          mockOrderId: "mock-order-1",
          token: "[REDACTED]"
        }
      }
    ]);
  });

  it("creates a local-only audit timeline export with redacted events", () => {
    const event = createAuditEvent(
      "command.received",
      {
        transcript: "buy 5 HOOD",
        accountId: "acct-id",
        rawAudio: "audio-bytes"
      },
      {
        id: "audit-1",
        now: new Date("2026-01-01T00:00:00.000Z")
      }
    );

    const auditExport = createAuditTimelineExport([event], {
      now: new Date("2026-01-01T00:01:00.000Z")
    });

    expect(auditExport).toEqual({
      kind: "audit_timeline_export",
      generatedAt: "2026-01-01T00:01:00.000Z",
      source: "local_browser",
      mockOnly: true,
      liveTradingEnabled: false,
      rawAudioIncluded: false,
      secretFieldsRedacted: true,
      statement: NO_LIVE_BROKER_ORDER_PLACED_STATEMENT,
      events: [
        {
          id: "audit-1",
          type: "command.received",
          occurredAt: "2026-01-01T00:00:00.000Z",
          actor: "system",
          redacted: true,
          payload: {
            transcript: "buy 5 HOOD",
            accountId: "[REDACTED]",
            rawAudio: "[REDACTED]"
          }
        }
      ]
    });
    expect(serializeAuditExport(auditExport)).toContain(
      '"No live broker order was placed."'
    );
  });

  it("creates a redacted mock receipt and markdown summary", () => {
    const event = createAuditEvent(
      "mock.execution.submitted",
      {
        ticketId: "ticket-1",
        mockOrderId: "mock-order-1"
      },
      {
        id: "audit-1",
        now: new Date("2026-01-01T00:00:00.000Z")
      }
    );
    const receipt = createMockTradeReceipt(
      {
        commandTranscript: "buy 5 HOOD",
        parsedIntent: {
          kind: "order_ticket",
          accountId: "acct-id"
        },
        orderTicket: {
          id: "ticket-1",
          symbol: "HOOD",
          brokerAccountId: "broker-account"
        },
        safetyReview: {
          liveTradingEnabled: false,
          rawAudio: "audio-bytes"
        },
        confirmationChallengeResult: {
          accepted: true,
          token: "placeholder"
        },
        mockBrokerResponse: {
          status: "mock_submitted",
          message: NO_LIVE_BROKER_ORDER_PLACED_STATEMENT
        },
        auditTimeline: [event]
      },
      {
        now: new Date("2026-01-01T00:01:00.000Z")
      }
    );

    expect(receipt).toMatchObject({
      kind: "mock_trade_receipt",
      generatedAt: "2026-01-01T00:01:00.000Z",
      badge: "Mock Only / No Live Trading",
      mockOnly: true,
      liveTradingEnabled: false,
      rawAudioIncluded: false,
      brokerAccountIdentifiersIncluded: false,
      secretFieldsRedacted: true,
      statement: NO_LIVE_BROKER_ORDER_PLACED_STATEMENT,
      commandTranscript: "buy 5 HOOD",
      auditEvents: [
        {
          id: "audit-1",
          type: "mock.execution.submitted",
          occurredAt: "2026-01-01T00:00:00.000Z"
        }
      ]
    });
    expect(receipt.orderTicket).toMatchObject({
      brokerAccountId: "[REDACTED]"
    });
    expect(receipt.safetyReview).toMatchObject({
      rawAudio: "[REDACTED]"
    });
    expect(receipt.confirmationChallengeResult).toMatchObject({
      token: "[REDACTED]"
    });

    const markdown = renderMockTradeReceiptMarkdown(receipt);

    expect(markdown).toContain("Mock Only / No Live Trading");
    expect(markdown).toContain(NO_LIVE_BROKER_ORDER_PLACED_STATEMENT);
    expect(markdown).toContain("audit-1");
    expect(markdown).not.toContain("broker-account");
    expect(markdown).not.toContain("placeholder");
    expect(markdown).not.toContain("audio-bytes");
  });
});
