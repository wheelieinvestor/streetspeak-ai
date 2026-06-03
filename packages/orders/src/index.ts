export type EquityOrderSide = "buy" | "sell";
export type EquityOrderType = "market" | "limit";

export interface EquityOrderTicket {
  readonly symbol: string;
  readonly side: EquityOrderSide;
  readonly quantity: number;
  readonly type: EquityOrderType;
  readonly limitPrice?: number;
}

export interface OrderValidationResult {
  readonly valid: boolean;
  readonly errors: readonly string[];
}

export function validateEquityOrderTicket(
  ticket: EquityOrderTicket
): OrderValidationResult {
  const errors: string[] = [];

  if (!/^[A-Z][A-Z0-9.]{0,9}$/u.test(ticket.symbol)) {
    errors.push("symbol must be an uppercase ticker-like value");
  }

  if (!Number.isFinite(ticket.quantity) || ticket.quantity <= 0) {
    errors.push("quantity must be greater than zero");
  }

  if (ticket.type === "limit") {
    if (ticket.limitPrice === undefined || ticket.limitPrice <= 0) {
      errors.push("limit orders require a positive limitPrice");
    }
  }

  if (ticket.type === "market" && ticket.limitPrice !== undefined) {
    errors.push("market orders must not include limitPrice");
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
