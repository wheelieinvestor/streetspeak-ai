import type { EquityOrderTicket } from "@streetspeak-ai/orders";
import { randomUUID } from "node:crypto";

export type BrokerAdapterKind = "mock";
export type BrokerAssetClass = "equity";
export type BrokerOrderCapability = "review_order" | "submit_mock_order";

export interface BrokerCapabilities {
  readonly adapter: BrokerAdapterKind;
  readonly mode: "mock";
  readonly liveExecutionAvailable: false;
  readonly supportsLiveExecution: false;
  readonly supportedAssetClasses: readonly BrokerAssetClass[];
  readonly supportedOrderTypes: readonly EquityOrderTicket["type"][];
  readonly capabilities: readonly BrokerOrderCapability[];
}

export interface BrokerOrderReview {
  readonly adapter: BrokerAdapterKind;
  readonly ticket: EquityOrderTicket;
  readonly liveExecutionAvailable: false;
  readonly acceptedForMockSubmission: boolean;
  readonly message: string;
}

export interface MockBrokerSubmission {
  readonly id: string;
  readonly adapter: BrokerAdapterKind;
  readonly ticketId: string;
  readonly submittedAt: string;
  readonly liveExecutionAvailable: false;
  readonly status: "mock_submitted";
  readonly message: string;
}

export interface BrokerAdapter {
  readonly kind: BrokerAdapterKind;
  getCapabilities(): BrokerCapabilities;
  reviewOrder(ticket: EquityOrderTicket): Promise<BrokerOrderReview>;
  submitMockOrder(ticket: EquityOrderTicket): Promise<MockBrokerSubmission>;
}

export class MockBrokerAdapter implements BrokerAdapter {
  readonly kind = "mock";

  getCapabilities(): BrokerCapabilities {
    return {
      adapter: this.kind,
      mode: "mock",
      liveExecutionAvailable: false,
      supportsLiveExecution: false,
      supportedAssetClasses: ["equity"],
      supportedOrderTypes: ["market", "limit"],
      capabilities: ["review_order", "submit_mock_order"]
    };
  }

  async reviewOrder(ticket: EquityOrderTicket): Promise<BrokerOrderReview> {
    return {
      adapter: this.kind,
      ticket,
      liveExecutionAvailable: false,
      acceptedForMockSubmission: ticket.mode === "mock",
      message: "Mock review only. Live broker execution is not implemented."
    };
  }

  async submitMockOrder(
    ticket: EquityOrderTicket
  ): Promise<MockBrokerSubmission> {
    return {
      id: randomUUID(),
      adapter: this.kind,
      ticketId: ticket.id,
      submittedAt: new Date().toISOString(),
      liveExecutionAvailable: false,
      status: "mock_submitted",
      message: "Mock submission recorded. No live broker order was placed."
    };
  }
}

export function createMockBrokerAdapter(): BrokerAdapter {
  return new MockBrokerAdapter();
}
