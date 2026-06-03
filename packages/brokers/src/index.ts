import type { EquityOrderTicket } from "@streetspeak-ai/orders";

export type BrokerAdapterKind = "mock" | "robinhood" | "public";

export interface BrokerOrderReview {
  readonly adapter: BrokerAdapterKind;
  readonly ticket: EquityOrderTicket;
  readonly liveExecutionAvailable: false;
  readonly message: string;
}

export interface BrokerAdapter {
  readonly kind: BrokerAdapterKind;
  reviewOrder(ticket: EquityOrderTicket): Promise<BrokerOrderReview>;
}

export class MockBrokerAdapter implements BrokerAdapter {
  readonly kind = "mock";

  async reviewOrder(ticket: EquityOrderTicket): Promise<BrokerOrderReview> {
    return {
      adapter: this.kind,
      ticket,
      liveExecutionAvailable: false,
      message: "Mock review only. Live broker execution is not implemented."
    };
  }
}

export function createMockBrokerAdapter(): BrokerAdapter {
  return new MockBrokerAdapter();
}
