export type EquityOrderSide = "buy" | "sell";
export type EquityOrderType = "market" | "limit";
export type EquityTimeInForce = "day" | "gtc";
export type OrderExecutionMode = "mock";

export type OrderTicketLifecycleState =
  | "draft"
  | "safety_review_required"
  | "confirmation_required"
  | "mock_submission_ready"
  | "mock_submitted"
  | "rejected"
  | "cancelled";

export interface EquityOrderTicketInput {
  readonly symbol: string;
  readonly side: EquityOrderSide;
  readonly quantity: number;
  readonly type: EquityOrderType;
  readonly limitPrice?: number;
  readonly timeInForce?: EquityTimeInForce;
  readonly clientOrderId?: string;
}

export interface EquityOrderTicket {
  readonly id: string;
  readonly symbol: string;
  readonly side: EquityOrderSide;
  readonly quantity: number;
  readonly type: EquityOrderType;
  readonly limitPrice?: number;
  readonly timeInForce: EquityTimeInForce;
  readonly mode: OrderExecutionMode;
  readonly lifecycleState: OrderTicketLifecycleState;
  readonly createdAt: string;
  readonly clientOrderId?: string;
}

export type OrderValidationCode =
  | "invalid_shape"
  | "invalid_symbol"
  | "invalid_side"
  | "invalid_quantity"
  | "invalid_order_type"
  | "invalid_time_in_force"
  | "missing_limit_price"
  | "unexpected_limit_price"
  | "ambiguous_fractional_quantity"
  | "ambiguous_notional_order";

export interface OrderValidationError {
  readonly code: OrderValidationCode;
  readonly path: readonly string[];
  readonly message: string;
}

export interface OrderValidationResult {
  readonly valid: boolean;
  readonly errors: readonly string[];
  readonly issues: readonly OrderValidationError[];
}

export type CreateEquityOrderTicketResult =
  | {
      readonly ok: true;
      readonly ticket: EquityOrderTicket;
    }
  | {
      readonly ok: false;
      readonly validation: OrderValidationResult;
    };

export interface CreateEquityOrderTicketOptions {
  readonly id?: string;
  readonly now?: Date;
}

const SYMBOL_PATTERN = /^[A-Z][A-Z0-9.]{0,9}$/u;
const CLIENT_ORDER_ID_PATTERN = /^[A-Za-z0-9._:-]{1,64}$/u;
const VALID_SIDES = new Set<EquityOrderSide>(["buy", "sell"]);
const VALID_ORDER_TYPES = new Set<EquityOrderType>(["market", "limit"]);
const VALID_TIME_IN_FORCE = new Set<EquityTimeInForce>(["day", "gtc"]);

export function validateEquityOrderTicket(
  candidate: unknown
): OrderValidationResult {
  const issues: OrderValidationError[] = [];

  if (!isRecord(candidate)) {
    issues.push({
      code: "invalid_shape",
      path: [],
      message: "ticket must be an object"
    });
    return toValidationResult(issues);
  }

  const symbol = candidate.symbol;
  if (typeof symbol !== "string" || !SYMBOL_PATTERN.test(symbol)) {
    issues.push({
      code: "invalid_symbol",
      path: ["symbol"],
      message: "symbol must be an uppercase ticker-like value"
    });
  }

  const side = candidate.side;
  if (typeof side !== "string" || !VALID_SIDES.has(side as EquityOrderSide)) {
    issues.push({
      code: "invalid_side",
      path: ["side"],
      message: "side must be buy or sell"
    });
  }

  const quantity = candidate.quantity;
  if (
    typeof quantity !== "number" ||
    !Number.isFinite(quantity) ||
    quantity <= 0
  ) {
    issues.push({
      code: "invalid_quantity",
      path: ["quantity"],
      message: "quantity must be greater than zero"
    });
  } else if (!Number.isInteger(quantity)) {
    issues.push({
      code: "ambiguous_fractional_quantity",
      path: ["quantity"],
      message:
        "fractional share quantities are not supported in this mock-only contract"
    });
  }

  if (
    "notional" in candidate ||
    "amount" in candidate ||
    "dollars" in candidate
  ) {
    issues.push({
      code: "ambiguous_notional_order",
      path: ["notional"],
      message:
        "notional or dollar-based equity orders are ambiguous and not supported"
    });
  }

  const type = candidate.type;
  if (
    typeof type !== "string" ||
    !VALID_ORDER_TYPES.has(type as EquityOrderType)
  ) {
    issues.push({
      code: "invalid_order_type",
      path: ["type"],
      message: "type must be market or limit"
    });
  }

  const limitPrice = candidate.limitPrice;
  if (type === "limit") {
    if (
      typeof limitPrice !== "number" ||
      !Number.isFinite(limitPrice) ||
      limitPrice <= 0
    ) {
      issues.push({
        code: "missing_limit_price",
        path: ["limitPrice"],
        message: "limit orders require a positive limitPrice"
      });
    }
  }

  if (type === "market" && limitPrice !== undefined) {
    issues.push({
      code: "unexpected_limit_price",
      path: ["limitPrice"],
      message: "market orders must not include limitPrice"
    });
  }

  const timeInForce = candidate.timeInForce;
  if (
    timeInForce !== undefined &&
    (typeof timeInForce !== "string" ||
      !VALID_TIME_IN_FORCE.has(timeInForce as EquityTimeInForce))
  ) {
    issues.push({
      code: "invalid_time_in_force",
      path: ["timeInForce"],
      message: "timeInForce must be day or gtc"
    });
  }

  const clientOrderId = candidate.clientOrderId;
  if (
    clientOrderId !== undefined &&
    (typeof clientOrderId !== "string" ||
      !CLIENT_ORDER_ID_PATTERN.test(clientOrderId))
  ) {
    issues.push({
      code: "invalid_shape",
      path: ["clientOrderId"],
      message: "clientOrderId must be 1-64 safe identifier characters"
    });
  }

  return toValidationResult(issues);
}

export function createEquityOrderTicket(
  input: EquityOrderTicketInput,
  options: CreateEquityOrderTicketOptions = {}
): CreateEquityOrderTicketResult {
  const validation = validateEquityOrderTicket(input);

  if (!validation.valid) {
    return {
      ok: false,
      validation
    };
  }

  return {
    ok: true,
    ticket: {
      id: options.id ?? randomUUID(),
      symbol: input.symbol,
      side: input.side,
      quantity: input.quantity,
      type: input.type,
      ...(input.limitPrice === undefined
        ? {}
        : { limitPrice: input.limitPrice }),
      timeInForce: input.timeInForce ?? "day",
      mode: "mock",
      lifecycleState: "safety_review_required",
      createdAt: (options.now ?? new Date()).toISOString(),
      ...(input.clientOrderId === undefined
        ? {}
        : { clientOrderId: input.clientOrderId })
    }
  };
}

export function transitionOrderTicket(
  ticket: EquityOrderTicket,
  lifecycleState: OrderTicketLifecycleState
): EquityOrderTicket {
  return {
    ...ticket,
    lifecycleState
  };
}

function toValidationResult(
  issues: readonly OrderValidationError[]
): OrderValidationResult {
  return {
    valid: issues.length === 0,
    errors: issues.map((issue) => issue.message),
    issues
  };
}

function isRecord(candidate: unknown): candidate is Record<string, unknown> {
  return (
    typeof candidate === "object" &&
    candidate !== null &&
    !Array.isArray(candidate)
  );
}

function randomUUID(): string {
  const randomUUID = globalThis.crypto?.randomUUID;

  if (typeof randomUUID === "function") {
    return randomUUID.call(globalThis.crypto);
  }

  return `ticket-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 10)}`;
}
