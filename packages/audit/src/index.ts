export type AuditEventType =
  | "command.received"
  | "order.ticket.created"
  | "safety.reviewed"
  | "confirmation.rejected"
  | "mock.execution.requested";

export interface AuditEvent {
  readonly id: string;
  readonly type: AuditEventType;
  readonly occurredAt: string;
  readonly payload: Record<string, unknown>;
}

export interface AuditSink {
  append(event: AuditEvent): Promise<void>;
}

export function createAuditEvent(
  type: AuditEventType,
  payload: Record<string, unknown>,
  now: Date = new Date()
): AuditEvent {
  return {
    id: crypto.randomUUID(),
    type,
    occurredAt: now.toISOString(),
    payload
  };
}
