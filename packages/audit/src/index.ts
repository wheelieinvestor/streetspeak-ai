export type AuditEventType =
  | "command.received"
  | "command.routed"
  | "order.ticket.created"
  | "safety.reviewed"
  | "confirmation.challenge.created"
  | "confirmation.accepted"
  | "confirmation.rejected"
  | "mock.execution.requested"
  | "mock.execution.submitted"
  | "robinhood.read_only.action";

export type AuditEventActor = "user" | "system" | "mock_broker";

export type RobinhoodReadOnlyAuditAction =
  | "status_checked"
  | "accounts_read"
  | "portfolio_read"
  | "positions_read"
  | "quote_read"
  | "order_history_read"
  | "tradability_read"
  | "search_read";

export interface AuditEvent {
  readonly id: string;
  readonly type: AuditEventType;
  readonly occurredAt: string;
  readonly actor: AuditEventActor;
  readonly redacted: true;
  readonly payload: Record<string, unknown>;
}

export interface AuditSink {
  append(event: AuditEvent): Promise<void>;
}

export interface AuditTimelineExport {
  readonly kind: "audit_timeline_export";
  readonly generatedAt: string;
  readonly source: "local_browser";
  readonly mockOnly: true;
  readonly liveTradingEnabled: false;
  readonly rawAudioIncluded: false;
  readonly secretFieldsRedacted: true;
  readonly statement: typeof NO_LIVE_BROKER_ORDER_PLACED_STATEMENT;
  readonly events: readonly AuditEvent[];
}

export interface MockTradeReceiptInput {
  readonly commandTranscript: string;
  readonly parsedIntent: unknown;
  readonly orderTicket: unknown;
  readonly safetyReview: unknown;
  readonly confirmationChallengeResult: unknown;
  readonly mockBrokerResponse: unknown;
  readonly auditTimeline: readonly AuditEvent[];
}

export interface MockTradeReceiptExport {
  readonly kind: "mock_trade_receipt";
  readonly generatedAt: string;
  readonly badge: "Mock Only / No Live Trading";
  readonly mockOnly: true;
  readonly liveTradingEnabled: false;
  readonly rawAudioIncluded: false;
  readonly brokerAccountIdentifiersIncluded: false;
  readonly secretFieldsRedacted: true;
  readonly statement: typeof NO_LIVE_BROKER_ORDER_PLACED_STATEMENT;
  readonly commandTranscript: string;
  readonly parsedIntent: unknown;
  readonly orderTicket: unknown;
  readonly safetyReview: unknown;
  readonly confirmationChallengeResult: unknown;
  readonly mockBrokerResponse: unknown;
  readonly auditEvents: readonly AuditReceiptEventRef[];
}

export interface AuditReceiptEventRef {
  readonly id: string;
  readonly type: AuditEventType;
  readonly occurredAt: string;
}

export class InMemoryAuditSink implements AuditSink {
  readonly #events: AuditEvent[] = [];

  async append(event: AuditEvent): Promise<void> {
    this.#events.push(event);
  }

  getEvents(): readonly AuditEvent[] {
    return [...this.#events];
  }

  clear(): void {
    this.#events.length = 0;
  }
}

export interface CreateAuditEventOptions {
  readonly id?: string;
  readonly actor?: AuditEventActor;
  readonly now?: Date;
}

export const NO_LIVE_BROKER_ORDER_PLACED_STATEMENT =
  "No live broker order was placed.";

const REDACTED = "[REDACTED]";
const REDACTED_KEY_PATTERN =
  /^(account|accountId|accountNumber|accountIdentifier|brokerAccountId|brokerAccountIdentifier|orderId|orderIds|brokerOrderId|brokerOrderIdentifier|rawOrderId|rawOrderIdentifier|portfolio|portfolioValue|portfolioValues|totalEquityValue|buyingPower|cashAvailable|holdings|positions|rawAudio|rawAudioBlob|audioData|accessToken|refreshToken|sessionToken|privateKey|authorization|password|secret|credential|token|api[_-]?key)$/i;

export function createAuditEvent(
  type: AuditEventType,
  payload: Record<string, unknown>,
  options: CreateAuditEventOptions | Date = {}
): AuditEvent {
  const normalizedOptions =
    options instanceof Date ? { now: options } : options;

  return {
    id: normalizedOptions.id ?? createMockId("audit"),
    type,
    occurredAt: (normalizedOptions.now ?? new Date()).toISOString(),
    actor: normalizedOptions.actor ?? "system",
    redacted: true,
    payload: redactAuditPayload(payload)
  };
}

export function createRobinhoodReadOnlyAuditEvent(
  action: RobinhoodReadOnlyAuditAction,
  options: CreateAuditEventOptions | Date = {}
): AuditEvent {
  return createAuditEvent("robinhood.read_only.action", { action }, options);
}

export function redactAuditPayload(
  payload: Record<string, unknown>
): Record<string, unknown> {
  return redactValue(payload) as Record<string, unknown>;
}

export function createAuditTimelineExport(
  events: readonly AuditEvent[],
  options: { readonly now?: Date } = {}
): AuditTimelineExport {
  return {
    kind: "audit_timeline_export",
    generatedAt: (options.now ?? new Date()).toISOString(),
    source: "local_browser",
    mockOnly: true,
    liveTradingEnabled: false,
    rawAudioIncluded: false,
    secretFieldsRedacted: true,
    statement: NO_LIVE_BROKER_ORDER_PLACED_STATEMENT,
    events: events.map(redactAuditEvent)
  };
}

export function createMockTradeReceipt(
  input: MockTradeReceiptInput,
  options: { readonly now?: Date } = {}
): MockTradeReceiptExport {
  return {
    kind: "mock_trade_receipt",
    generatedAt: (options.now ?? new Date()).toISOString(),
    badge: "Mock Only / No Live Trading",
    mockOnly: true,
    liveTradingEnabled: false,
    rawAudioIncluded: false,
    brokerAccountIdentifiersIncluded: false,
    secretFieldsRedacted: true,
    statement: NO_LIVE_BROKER_ORDER_PLACED_STATEMENT,
    commandTranscript: input.commandTranscript,
    parsedIntent: redactReceiptValue(input.parsedIntent),
    orderTicket: redactReceiptValue(input.orderTicket),
    safetyReview: redactReceiptValue(input.safetyReview),
    confirmationChallengeResult: redactReceiptValue(
      input.confirmationChallengeResult
    ),
    mockBrokerResponse: redactReceiptValue(input.mockBrokerResponse),
    auditEvents: input.auditTimeline.map((event) => ({
      id: event.id,
      type: event.type,
      occurredAt: event.occurredAt
    }))
  };
}

export function renderMockTradeReceiptMarkdown(
  receipt: MockTradeReceiptExport
): string {
  const auditEvents = receipt.auditEvents
    .map((event) => `- ${event.occurredAt} ${event.type} (${event.id})`)
    .join("\n");

  return [
    "# StreetSpeak AI Mock Trade Receipt",
    "",
    `**${receipt.badge}**`,
    "",
    receipt.statement,
    "",
    "## Command Transcript",
    "",
    receipt.commandTranscript || "(empty)",
    "",
    "## Parsed Intent",
    "",
    toMarkdownJsonBlock(receipt.parsedIntent),
    "",
    "## Order Ticket",
    "",
    toMarkdownJsonBlock(receipt.orderTicket),
    "",
    "## Safety Review",
    "",
    toMarkdownJsonBlock(receipt.safetyReview),
    "",
    "## Confirmation Challenge Result",
    "",
    toMarkdownJsonBlock(receipt.confirmationChallengeResult),
    "",
    "## Mock Broker Response",
    "",
    toMarkdownJsonBlock(receipt.mockBrokerResponse),
    "",
    "## Audit Events",
    "",
    auditEvents || "(none)",
    "",
    "Raw audio included: false",
    "Live trading enabled: false"
  ].join("\n");
}

export function serializeAuditExport(
  exportPayload: AuditTimelineExport | MockTradeReceiptExport
): string {
  return `${JSON.stringify(exportPayload, null, 2)}\n`;
}

function redactValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => redactValue(item));
  }

  if (!isRecord(value)) {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, child]) => [
      key,
      REDACTED_KEY_PATTERN.test(key) ? REDACTED : redactValue(child)
    ])
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function redactAuditEvent(event: AuditEvent): AuditEvent {
  return {
    ...event,
    redacted: true,
    payload: redactAuditPayload(event.payload)
  };
}

function redactReceiptValue(value: unknown): unknown {
  return redactValue(value);
}

function toMarkdownJsonBlock(value: unknown): string {
  return ["```json", JSON.stringify(value ?? null, null, 2), "```"].join("\n");
}

function createMockId(prefix: string): string {
  const randomUUID = globalThis.crypto?.randomUUID;

  if (typeof randomUUID === "function") {
    return randomUUID.call(globalThis.crypto);
  }

  return `${prefix}-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 10)}`;
}
