export type AuditEventType =
  | "command.received"
  | "command.routed"
  | "order.ticket.created"
  | "safety.reviewed"
  | "confirmation.challenge.created"
  | "confirmation.accepted"
  | "confirmation.rejected"
  | "mock.execution.requested"
  | "mock.execution.submitted";

export type AuditEventActor = "user" | "system" | "mock_broker";

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

const REDACTED = "[REDACTED]";
const REDACTED_KEY_PATTERN =
  /^(accountId|accountNumber|brokerAccountId|accessToken|refreshToken|sessionToken|privateKey|authorization|password|secret|credential|token|api[_-]?key)$/i;

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

export function redactAuditPayload(
  payload: Record<string, unknown>
): Record<string, unknown> {
  return redactValue(payload) as Record<string, unknown>;
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

function createMockId(prefix: string): string {
  const randomUUID = globalThis.crypto?.randomUUID;

  if (typeof randomUUID === "function") {
    return randomUUID.call(globalThis.crypto);
  }

  return `${prefix}-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 10)}`;
}
